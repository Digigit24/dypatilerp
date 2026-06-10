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

  // Use provided values or fall back to env
  const key    = apiKey || env.BREVO_API_KEY;
  const sender = {
    name:  senderName  || env.BREVO_SENDER_NAME,
    email: senderEmail || env.BREVO_SENDER_EMAIL,
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

  if (result.success) {
    ok(res, { delivered: true, mock: result.mock || false }, 'Test email sent successfully');
  } else {
    res.status(400).json({ success: false, message: result.error || 'Email delivery failed' });
  }
}));

export default router;
