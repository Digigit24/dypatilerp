/**
 * Email utility routes
 * POST /api/email/test   — send a test email to verify SMTP config
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, badRequest } from '../../utils/response.js';
import { sendEmail } from './email.service.js';

const router = Router();

/**
 * POST /api/email/test
 * Body: { to: "someone@example.com" }
 * Sends a plain test email to verify SMTP config is working.
 */
router.post('/test', authenticate, requirePermission('settings', 'update'), asyncHandler(async (req, res) => {
  const { to } = req.body;
  if (!to) return badRequest(res, '"to" email address is required');

  const result = await sendEmail({
    to,
    subject: '✅ Brevo SMTP Test — DY Patil ERP',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:40px auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#111827;margin:0 0 12px">Email Config Working ✅</h2>
        <p style="color:#374151">This test email confirms your Brevo SMTP setup is correctly configured for DY Patil ERP.</p>
        <div style="background:#f9fafb;border-radius:8px;padding:12px;margin:16px 0;font-size:13px;color:#6b7280">
          <strong>Sent at:</strong> ${new Date().toISOString()}<br/>
          <strong>From:</strong> postdoc@dyperf.com
        </div>
        <p style="color:#374151;font-size:13px">You can now send test credentials and notifications via email.</p>
      </div>
    `,
  });

  if (!result.success) {
    return res.status(500).json({ success: false, message: result.error || 'Email send failed' });
  }

  ok(res, { to, messageId: result.messageId, mock: result.mock || false }, 'Test email sent');
}));

export default router;
