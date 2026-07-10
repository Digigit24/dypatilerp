/**
 * Generic "Email Sender" — send a chosen broadcast-safe template to a manually
 * selected list of recipients (applicants + scholars).
 *
 * Admin-only, matching the Email Templates routes (requireRole('admin')).
 * Reuses the existing email infrastructure — renderTemplate + sendEmail — and the
 * registry's broadcastSafe flag + placeholder validation. No second email system.
 *
 * Routes:
 *   POST /email-sender/preview → { subject, html, unresolved } for ONE recipient,
 *                                rendered EXACTLY as it will be sent.
 *   POST /email-sender/send    → send to many; per-recipient failure isolation;
 *                                dedupe + cap + unresolved-placeholder blocking;
 *                                every attempt logged. Returns { total, sent,
 *                                failed:[{email,error}], skipped:[{email,reason}] }.
 */
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, badRequest } from '../../utils/response.js';
import { query } from '../../config/database.js';
import { renderTemplate, getCourseSender, sendEmail } from './email.service.js';
import {
  EMAIL_TEMPLATES_BY_KEY,
  isBroadcastSafe,
  broadcastSafeTemplates,
  unresolvedPlaceholders,
} from './email-templates.registry.js';

const router = Router();
router.use(authenticate);
router.use(requireRole('admin'));

// Guard against oversized payloads / provider limits. Sent sequentially.
const MAX_RECIPIENTS = 500;

const recipientSchema = z.object({
  email: z.string(),
  name: z.string().optional().default(''),
  source: z.string().optional(),   // 'applicant' | 'scholar' (any case)
  batch: z.string().optional(),
  status: z.string().optional(),
}).passthrough();

const previewSchema = z.object({ template_key: z.string(), recipient: recipientSchema });
const sendSchema = z.object({
  template_key: z.string(),
  recipients: z.array(recipientSchema).max(2000),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const loadOverrides = async () => {
  const { rows: [row] } = await query(`SELECT value FROM app_settings WHERE key='email_templates'`);
  return row?.value || {};
};

/** Effective subject/body used for placeholder validation (override wins). */
const effectiveTemplate = (def, overrides) => {
  const ov = overrides[def.key];
  return { subject: (ov && ov.subject) || def.subject, body: (ov && ov.body) || def.body };
};

/** Build the render data for one recipient from the contact record. */
const dataFor = (r) => {
  const name = String(r.name || '').trim();
  const parts = name.split(/\s+/).filter(Boolean);
  return {
    ...r,
    courseName: 'DY Patil ERP',
    fullName: name,
    firstName: parts[0] || name,
    lastName: parts.slice(1).join(' '),
    name,
    email: r.email,
    batch: r.batch ?? '',
    status: r.status ?? '',
  };
};

const normType = (source) => {
  const s = String(source || '').trim().toLowerCase();
  if (s === 'applicant' || s === 'scholar') return s;
  if (s === 'student') return 'scholar';
  return null;
};

const logSend = async ({ userId, templateKey, email, type, status, error }) => {
  try {
    await query(
      `INSERT INTO email_send_log (sent_by, template_key, recipient_email, recipient_type, status, error)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [userId, templateKey, email, type, status, error || null]
    );
  } catch (e) {
    // Never let an audit-log failure break the send loop.
    console.error('[email-sender] log insert failed:', e.message);
  }
};

// ─── GET /email-sender/templates — broadcast-safe templates only ─────────────
router.get('/templates', asyncHandler(async (req, res) => {
  ok(res, broadcastSafeTemplates().map((t) => ({
    key: t.key, label: t.label, category: t.category,
    description: t.description, variables: t.variables,
  })));
}));

// ─── POST /email-sender/preview — render one recipient, as it will send ──────
router.post('/preview', asyncHandler(async (req, res) => {
  const parsed = previewSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, 'template_key and recipient are required');
  const { template_key, recipient } = parsed.data;

  const def = EMAIL_TEMPLATES_BY_KEY[template_key];
  if (!def) return badRequest(res, 'Unknown template');
  if (!isBroadcastSafe(template_key)) return badRequest(res, 'This template is not enabled for bulk sending.');

  const overrides = await loadOverrides();
  const eff = effectiveTemplate(def, overrides);
  const data = dataFor(recipient);
  const unresolved = unresolvedPlaceholders(eff.subject, eff.body, data);

  // Render via the SAME path used to send, so the preview matches exactly.
  const rendered = await renderTemplate(template_key, data);
  ok(res, {
    subject: rendered?.subject || '',
    html: rendered?.html || '',
    unresolved,
  });
}));

// ─── POST /email-sender/send — bulk send with failure isolation ──────────────
router.post('/send', asyncHandler(async (req, res) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, 'template_key and recipients are required');
  const { template_key, recipients } = parsed.data;

  const def = EMAIL_TEMPLATES_BY_KEY[template_key];
  if (!def) return badRequest(res, 'Unknown template');
  if (!isBroadcastSafe(template_key)) return badRequest(res, 'This template is not enabled for bulk sending.');
  if (!recipients.length) return badRequest(res, 'No recipients selected.');
  if (recipients.length > MAX_RECIPIENTS) {
    return badRequest(res, `Too many recipients (${recipients.length}). Send at most ${MAX_RECIPIENTS} at a time.`);
  }

  // Dedupe by lowercased email + validate address format up front.
  const seen = new Set();
  const clean = [];
  const skipped = [];
  for (const r of recipients) {
    const email = String(r.email || '').trim().toLowerCase();
    if (!email || !z.string().email().safeParse(email).success) {
      skipped.push({ email: r.email || '(blank)', reason: 'Invalid email address' });
      continue;
    }
    if (seen.has(email)) continue; // silent de-duplication
    seen.add(email);
    clean.push({ ...r, email });
  }

  const overrides = await loadOverrides();
  const eff = effectiveTemplate(def, overrides);
  const sender = await getCourseSender(null); // global verified sender

  let sent = 0;
  const failed = [];

  for (const r of clean) {
    const data = dataFor(r);
    const type = normType(r.source);

    // NEVER send with a leftover/blank required placeholder.
    const unresolved = unresolvedPlaceholders(eff.subject, eff.body, data);
    if (unresolved.length) {
      skipped.push({ email: r.email, reason: `Unresolved variables: ${unresolved.join(', ')}` });
      await logSend({ userId: req.user.id, templateKey: template_key, email: r.email, type, status: 'failed', error: `unresolved: ${unresolved.join(',')}` });
      continue;
    }

    try {
      const rendered = await renderTemplate(template_key, data);
      if (!rendered) throw new Error('Template could not be rendered');
      const result = await sendEmail({
        to: { email: r.email, name: data.fullName || r.email },
        subject: rendered.subject,
        html: rendered.html,
        sender,
      });
      if (result.success) {
        sent++;
        await logSend({ userId: req.user.id, templateKey: template_key, email: r.email, type, status: 'sent' });
      } else {
        failed.push({ email: r.email, error: result.error || 'Email could not be sent' });
        await logSend({ userId: req.user.id, templateKey: template_key, email: r.email, type, status: 'failed', error: result.error || 'send failed' });
      }
    } catch (err) {
      // One recipient's failure never stops the rest.
      failed.push({ email: r.email, error: err.message });
      await logSend({ userId: req.user.id, templateKey: template_key, email: r.email, type, status: 'failed', error: err.message });
    }
  }

  ok(res, {
    total: recipients.length,
    sent,
    failed,
    skipped,
  }, `Sent ${sent} of ${clean.length} email(s).`);
}));

export default router;
