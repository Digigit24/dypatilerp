/**
 * Global application settings module.
 *
 * Stores arbitrary key → JSONB pairs in `app_settings` table.
 * The primary keys used are:
 *   - 'brevo'   → { apiKey, senderName, senderEmail, enabled }
 *
 * Routes:
 *   GET  /settings          → list all settings (admin only)
 *   GET  /settings/:key     → get one setting by key
 *   PUT  /settings/:key     → upsert one setting (admin only)
 *   POST /settings/test-email → send a test email with current Brevo config (admin only)
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { query } from '../../config/database.js';
import { sendEmail, bustBrevoCache } from '../email/email.service.js';
import { env } from '../../config/env.js';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';

const router = Router();
router.use(authenticate);

// ─── GET /settings — all keys ─────────────────────────────────────────────────
router.get('/', requireRole('admin'), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT key, value, updated_at FROM app_settings ORDER BY key`
  );
  ok(res, rows);
}));

// ─── GET /settings/ui-labels ──────────────────────────────────────────────────
// Readable by ANY authenticated user (students included) — drives UI wording
// like "Scholar" instead of "Student". Defaults applied server-side.
router.get('/ui-labels', asyncHandler(async (req, res) => {
  const { rows: [row] } = await query(`SELECT value FROM app_settings WHERE key='ui_labels'`);
  ok(res, {
    student: 'Student',
    studentPlural: 'Students',
    ...(row?.value || {}),
  });
}));

// ─── GET /settings/email/effective ────────────────────────────────────────────
// What the server will ACTUALLY use to send email (env + DB merged). Admin-only.
router.get('/email/effective', requireRole('admin'), asyncHandler(async (req, res) => {
  const { rows: [row] } = await query(`SELECT value, updated_at FROM app_settings WHERE key='brevo'`);
  const db = row?.value || {};
  const mask = (v) => (v ? (v.length > 8 ? `${v.slice(0, 4)}\u2026${v.slice(-4)}` : '\u2022\u2022\u2022\u2022') : null);

  const smtpConfigured = !!(env.BREVO_SMTP_USER && env.BREVO_SMTP_PASS);
  ok(res, {
    mode: smtpConfigured ? 'live' : 'mock',
    smtp: {
      host:        env.BREVO_SMTP_HOST,
      port:        env.BREVO_SMTP_PORT,
      user:        env.BREVO_SMTP_USER || null,
      pass_masked: mask(env.BREVO_SMTP_PASS),
      configured:  smtpConfigured,
      source:      'server .env',
    },
    sender: {
      name:   db.senderName  || env.BREVO_SENDER_NAME,
      email:  db.senderEmail || env.BREVO_SENDER_EMAIL,
      source: (db.senderName || db.senderEmail) ? 'saved settings' : 'server .env',
    },
    settings: {
      enabled:        db.enabled ?? false,
      api_key_masked: mask(db.apiKey),
      senderName:     db.senderName  || '',
      senderEmail:    db.senderEmail || '',
      updated_at:     row?.updated_at || null,
    },
    env_defaults: {
      senderName:  env.BREVO_SENDER_NAME,
      senderEmail: env.BREVO_SENDER_EMAIL,
    },
  });
}));

// ─── GET /settings/:key ───────────────────────────────────────────────────────
router.get('/:key', requireRole('admin'), asyncHandler(async (req, res) => {
  const { rows: [row] } = await query(
    `SELECT key, value, updated_at FROM app_settings WHERE key=$1`, [req.params.key]
  );
  // Return the value object directly (or empty object if not configured)
  ok(res, row?.value ?? {});
}));

// ─── PUT /settings/:key ───────────────────────────────────────────────────────
const settingsSchema = z.object({}).passthrough(); // allow any JSONB shape

router.put('/:key', requireRole('admin'), asyncHandler(async (req, res) => {
  const { key } = req.params;
  const value = req.body; // whole body is the value

  // Hygiene: trim pasted credentials so stray whitespace never breaks sending
  if (key === 'brevo' && typeof value.apiKey === 'string') value.apiKey = value.apiKey.trim();

  await query(
    `INSERT INTO app_settings (key, value, updated_at, updated_by)
     VALUES ($1, $2, NOW(), $3)
     ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value,
           updated_at = NOW(),
           updated_by = EXCLUDED.updated_by`,
    [key, JSON.stringify(value), req.user.id]
  );

  // Bust email cache if Brevo config was updated
  if (key === 'brevo') bustBrevoCache();


  ok(res, value, 'Settings saved');
}));

// ─── POST /settings/test-email ────────────────────────────────────────────────
// Send a test email to verify Brevo credentials
const testEmailSchema = z.object({
  to:      z.string().email(),
  apiKey:  z.string().optional(),
  senderName:  z.string().optional(),
  senderEmail: z.string().email().optional(),
});

router.post('/test-email', requireRole('admin'), validate(testEmailSchema), asyncHandler(async (req, res) => {
  const { to, apiKey, senderName, senderEmail } = req.body;

  // Resolution order: value typed in the UI → saved settings (database) → .env
  const { rows: [dbRow] } = await query(`SELECT value FROM app_settings WHERE key='brevo'`);
  const db = dbRow?.value || {};
  const key = (apiKey || '').trim() || (db.apiKey || '').trim() || (env.BREVO_API_KEY || '').trim();
  const sender = {
    name:  senderName  || db.senderName  || env.BREVO_SENDER_NAME,
    email: senderEmail || db.senderEmail || env.BREVO_SENDER_EMAIL,
  };

  const result = await sendEmail({
    to,
    subject: 'DY Patil ERP — Email Configuration Test',
    html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<style>body{font-family:sans-serif;background:#f4f4f7;padding:40px}
.wrap{background:#fff;border-radius:16px;padding:32px;max-width:480px;margin:0 auto;box-shadow:0 2px 12px rgba(0,0,0,.08)}
h2{color:#4F46E5;margin-top:0}.badge{background:#d1fae5;color:#065f46;border-radius:99px;padding:4px 12px;font-size:13px;font-weight:600}
</style></head>
<body><div class="wrap">
<h2>Email Configuration Test ✓</h2>
<p>This is a test email from <strong>DY Patil ERP</strong>.</p>
<p>If you received this, your Brevo integration is working correctly.</p>
<p>Sent via: <strong>${sender.email}</strong></p>
<span class="badge">Configuration OK</span>
</div></body></html>`,
    apiKey: key,
    sender,
  });

  const keySource = (apiKey || '').trim() ? 'UI field'
    : (db.apiKey || '').trim() ? 'saved settings (database)'
    : (env.BREVO_API_KEY || '').trim() ? 'server .env'
    : 'none — will fall back to SMTP';
  const debugInfo = {
    api_key_source: keySource,
    api_key_prefix: key ? `${key.slice(0, 9)}…` : null,
    smtp_host: env.BREVO_SMTP_HOST,
    smtp_port: env.BREVO_SMTP_PORT,
    smtp_user: env.BREVO_SMTP_USER || null,
    sender_used: `${sender.name} <${sender.email}>`,
  };

  if (result.success) {
    ok(res, {
      delivered: !result.mock,
      mock: result.mock || false,
      message_id: result.messageId || null,
      ...debugInfo,
    }, result.mock
      ? 'SMTP not configured on server (.env) \u2014 email was logged to console only'
      : 'Test email sent successfully');
  } else {
    res.status(400).json({
      success: false,
      message: `SMTP error: ${result.error || 'Email delivery failed'}`,
      data: debugInfo,
    });
  }
}));

export default router;
