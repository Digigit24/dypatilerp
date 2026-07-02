/**
 * Email Templates admin module.
 *
 * Lets admins view, edit, preview, save and reset the transactional email
 * templates. Edits are stored as overrides in app_settings under the
 * 'email_templates' key:  { [templateKey]: { subject, body } }
 *
 * Routes (all admin-only):
 *   GET    /email-templates            → list all templates (default + override + vars)
 *   GET    /email-templates/:key       → one template (default + override + vars)
 *   PUT    /email-templates/:key       → save override { subject, body }
 *   DELETE /email-templates/:key       → reset to default (remove override)
 *   POST   /email-templates/:key/preview → render { subject, html } with sample data
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, badRequest, notFound } from '../../utils/response.js';
import { query } from '../../config/database.js';
import { bustTemplatesCache, renderPreview } from './email.service.js';
import {
  EMAIL_TEMPLATES,
  EMAIL_TEMPLATES_BY_KEY,
  sampleDataFor,
} from './email-templates.registry.js';

const router = Router();
router.use(authenticate);
router.use(requireRole('admin'));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SETTINGS_KEY = 'email_templates';

const loadOverrides = async () => {
  const { rows: [row] } = await query(
    `SELECT value FROM app_settings WHERE key=$1`, [SETTINGS_KEY]
  );
  return row?.value || {};
};

const saveOverrides = async (overrides, userId) => {
  await query(
    `INSERT INTO app_settings (key, value, updated_at, updated_by)
     VALUES ($1, $2, NOW(), $3)
     ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value,
           updated_at = NOW(),
           updated_by = EXCLUDED.updated_by`,
    [SETTINGS_KEY, JSON.stringify(overrides), userId]
  );
  bustTemplatesCache();
};

/** Merge a registry definition with any saved override + metadata. */
const shape = (def, overrides) => {
  const ov = overrides[def.key] || null;
  return {
    key: def.key,
    label: def.label,
    category: def.category,
    audience: def.audience,
    description: def.description,
    variables: def.variables,
    default: { subject: def.subject, body: def.body },
    override: ov && (ov.subject || ov.body) ? { subject: ov.subject || '', body: ov.body || '' } : null,
    effective: {
      subject: (ov && ov.subject) || def.subject,
      body: (ov && ov.body) || def.body,
    },
    isCustomized: !!(ov && (ov.subject || ov.body)),
    updatedAt: ov?.updatedAt || null,
  };
};

// ─── GET /email-templates ───────────────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  const overrides = await loadOverrides();
  ok(res, EMAIL_TEMPLATES.map((def) => shape(def, overrides)));
}));

// ─── Shortlist-email CC (applicant_shortlisted) ──────────────────────────────
// Admin-configurable CC list for the Final Shortlist / registration-fee email,
// stored in app_settings under 'shortlist_email_cc' as { cc: "a@x.com, b@y.com" }.
// NOTE: these MUST be registered before the '/:key' routes below, otherwise
// Express would treat "shortlist-cc" as a template key.
const SHORTLIST_CC_KEY = 'shortlist_email_cc';

/**
 * Parse a comma-separated CC string: trim, drop empties, validate each address,
 * de-duplicate (case-insensitive). Returns { valid: [...], invalid: [...] }.
 */
const parseCcEmails = (raw) => {
  const parts = String(raw ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const seen = new Set();
  const valid = [];
  const invalid = [];
  for (const p of parts) {
    const dedupeKey = p.toLowerCase();
    if (seen.has(dedupeKey)) continue;      // de-duplicate repeated addresses
    seen.add(dedupeKey);
    if (z.string().email().safeParse(p).success) valid.push(p);
    else invalid.push(p);
  }
  return { valid, invalid };
};

// GET /email-templates/shortlist-cc → { cc: "normalized, list" }
router.get('/shortlist-cc', asyncHandler(async (req, res) => {
  const { rows: [row] } = await query(
    `SELECT value FROM app_settings WHERE key=$1`, [SHORTLIST_CC_KEY]
  );
  ok(res, { cc: typeof row?.value?.cc === 'string' ? row.value.cc : '' });
}));

// PUT /email-templates/shortlist-cc  body: { cc: "a@x.com, b@y.com" }
router.put('/shortlist-cc', asyncHandler(async (req, res) => {
  const raw = typeof req.body?.cc === 'string' ? req.body.cc : '';
  const { valid, invalid } = parseCcEmails(raw);
  if (invalid.length) {
    return badRequest(
      res,
      `Invalid email address${invalid.length > 1 ? 'es' : ''}: ${invalid.join(', ')}`
    );
  }
  // Empty is allowed → means "no admin-configured CC" (falls back to env).
  const normalized = valid.join(', ');
  await query(
    `INSERT INTO app_settings (key, value, updated_at, updated_by)
     VALUES ($1, $2, NOW(), $3)
     ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value,
           updated_at = NOW(),
           updated_by = EXCLUDED.updated_by`,
    [SHORTLIST_CC_KEY, JSON.stringify({ cc: normalized }), req.user.id]
  );
  ok(res, { cc: normalized }, 'Shortlist CC saved');
}));

// ─── GET /email-templates/:key ──────────────────────────────────────────────
router.get('/:key', asyncHandler(async (req, res) => {
  const def = EMAIL_TEMPLATES_BY_KEY[req.params.key];
  if (!def) return notFound(res, 'Template not found');
  const overrides = await loadOverrides();
  ok(res, shape(def, overrides));
}));

// ─── PUT /email-templates/:key ──────────────────────────────────────────────
const saveSchema = z.object({
  subject: z.string().max(500),
  body: z.string().max(100_000),
});

router.put('/:key', asyncHandler(async (req, res) => {
  const def = EMAIL_TEMPLATES_BY_KEY[req.params.key];
  if (!def) return notFound(res, 'Template not found');

  const parsed = saveSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, 'subject and body are required');

  const { subject, body } = parsed.data;
  if (!subject.trim()) return badRequest(res, 'Subject cannot be empty');
  if (!body.trim()) return badRequest(res, 'Body cannot be empty');

  const overrides = await loadOverrides();
  overrides[def.key] = { subject, body, updatedAt: new Date().toISOString() };
  await saveOverrides(overrides, req.user.id);

  ok(res, shape(def, overrides), 'Template saved');
}));

// ─── DELETE /email-templates/:key — reset to default ─────────────────────────
router.delete('/:key', asyncHandler(async (req, res) => {
  const def = EMAIL_TEMPLATES_BY_KEY[req.params.key];
  if (!def) return notFound(res, 'Template not found');

  const overrides = await loadOverrides();
  if (overrides[def.key]) {
    delete overrides[def.key];
    await saveOverrides(overrides, req.user.id);
  }
  ok(res, shape(def, overrides), 'Template reset to default');
}));

// ─── POST /email-templates/:key/preview ──────────────────────────────────────
// Renders the supplied (unsaved) subject/body with the template's sample data,
// wrapped in the shared email layout. Falls back to the effective stored values.
const previewSchema = z.object({
  subject: z.string().optional(),
  body: z.string().optional(),
  data: z.record(z.any()).optional(),
});

router.post('/:key/preview', asyncHandler(async (req, res) => {
  const def = EMAIL_TEMPLATES_BY_KEY[req.params.key];
  if (!def) return notFound(res, 'Template not found');

  const { subject, body, data } = previewSchema.parse(req.body || {});
  const sample = { ...sampleDataFor(def.key), ...(data || {}) };

  const rendered = renderPreview({
    subject: subject ?? def.subject,
    body: body ?? def.body,
    data: sample,
  });
  ok(res, rendered);
}));

export default router;
