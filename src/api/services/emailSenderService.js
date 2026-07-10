/**
 * Email Sender API service (admin only) — wraps /api/email-sender.
 *
 * Reuses the existing email infrastructure on the backend; this only exposes the
 * bulk preview + send endpoints. Broadcast-safe templates are read from the
 * existing listTemplates() response (each carries a `broadcastSafe` flag).
 */
import http from '../http.js'

/** Render the FINAL email for one recipient exactly as it will be sent.
 *  → { subject, html, unresolved:[...] } */
export const previewSenderEmail = async (template_key, recipient) => {
  const { data: res } = await http.post('/email-sender/preview', { template_key, recipient })
  return { data: res.data }
}

/** Send a broadcast-safe template to many recipients.
 *  → { total, sent, failed:[{email,error}], skipped:[{email,reason}] } */
export const sendTemplatedEmail = async (template_key, recipients) => {
  const { data: res } = await http.post('/email-sender/send', { template_key, recipients })
  return { data: res.data, message: res.message }
}
