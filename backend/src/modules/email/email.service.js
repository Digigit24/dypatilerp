/**
 * Brevo (Sendinblue) transactional email service.
 *
 * Uses Brevo's v3 SMTP REST API directly — no SDK required, just node fetch.
 * Falls back to console-log in development if no API key is configured.
 *
 * Usage:
 *   import { sendEmail, sendNotificationEmail } from './email.service.js'
 *
 *   await sendEmail({ to: 'user@example.com', subject: 'Hello', html: '<p>Hi</p>' })
 *   await sendNotificationEmail('submission_approved', student, { submissionTitle: 'My Research' })
 */

import { env } from '../../config/env.js';
import { query } from '../../config/database.js';

const BREVO_API = 'https://api.brevo.com/v3/smtp/email';

// ─── Core sender ──────────────────────────────────────────────────────────────

/**
 * Send a single transactional email via Brevo REST API.
 *
 * @param {object} opts
 * @param {string|{email:string,name?:string}|Array} opts.to
 * @param {string} opts.subject
 * @param {string} opts.html
 * @param {string} [opts.text]
 * @param {{email:string,name?:string}} [opts.sender]   – override default sender
 * @param {string} [opts.apiKey]                         – override API key (from DB settings)
 * @returns {Promise<{success:boolean, messageId?:string, error?:string}>}
 */
export const sendEmail = async ({ to, subject, html, text, sender, apiKey } = {}) => {
  // Resolve API key: passed-in > env var
  const key = apiKey || env.BREVO_API_KEY;

  if (!key) {
    console.log('[email] No Brevo API key configured — skipping send');
    console.log(`[email] MOCK → To: ${JSON.stringify(to)} | Subject: ${subject}`);
    return { success: true, mock: true };
  }

  // Normalise "to" → array of {email, name?}
  const recipients = Array.isArray(to)
    ? to.map((r) => (typeof r === 'string' ? { email: r } : r))
    : [typeof to === 'string' ? { email: to } : to];

  const defaultSender = {
    name:  env.BREVO_SENDER_NAME  || 'DY Patil ERP',
    email: env.BREVO_SENDER_EMAIL || 'noreply@example.com',
  };

  const payload = {
    sender:   sender || defaultSender,
    to:       recipients,
    subject,
    htmlContent: html,
    ...(text && { textContent: text }),
  };

  try {
    const res = await fetch(BREVO_API, {
      method:  'POST',
      headers: {
        'accept':       'application/json',
        'content-type': 'application/json',
        'api-key':      key,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[email] Brevo error ${res.status}:`, errBody);
      return { success: false, error: `Brevo ${res.status}: ${errBody}` };
    }

    const data = await res.json();
    console.log('[email] Sent → messageId:', data.messageId);
    return { success: true, messageId: data.messageId };
  } catch (err) {
    console.error('[email] Fetch error:', err.message);
    return { success: false, error: err.message };
  }
};

// ─── Load live Brevo config from app_settings ─────────────────────────────────

let _cachedBrevoConfig = null;
let _cacheTs = 0;

const getBrevoConfig = async () => {
  // Cache for 60 s to avoid a DB hit on every email
  if (_cachedBrevoConfig && Date.now() - _cacheTs < 60_000) return _cachedBrevoConfig;
  try {
    const { rows: [row] } = await query(`SELECT value FROM app_settings WHERE key='brevo'`);
    _cachedBrevoConfig = row?.value || {};
    _cacheTs = Date.now();
  } catch {
    _cachedBrevoConfig = {};
  }
  return _cachedBrevoConfig;
};

/** Bust the Brevo config cache (call after saving new settings) */
export const bustBrevoCache = () => { _cachedBrevoConfig = null; };

// ─── Email templates ──────────────────────────────────────────────────────────

const base = (body) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f7;margin:0;padding:0}
    .wrap{max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
    .header{background:#4F46E5;padding:28px 32px;color:#fff}
    .header h1{margin:0;font-size:22px;font-weight:700;letter-spacing:-.3px}
    .header p{margin:6px 0 0;opacity:.8;font-size:13px}
    .body{padding:32px}
    .body h2{margin:0 0 12px;font-size:18px;color:#111827}
    .body p{margin:0 0 16px;color:#374151;line-height:1.6;font-size:14px}
    .cta{display:inline-block;margin:8px 0 20px;padding:12px 24px;background:#4F46E5;color:#fff!important;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px}
    .info-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:16px 0}
    .info-box p{margin:4px 0;font-size:13px;color:#6b7280}
    .info-box strong{color:#111827}
    .footer{padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af}
    .badge{display:inline-block;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600}
    .badge-green{background:#d1fae5;color:#065f46}
    .badge-yellow{background:#fef3c7;color:#92400e}
    .badge-red{background:#fee2e2;color:#991b1b}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>DY Patil ERP</h1>
      <p>Research Program Management System</p>
    </div>
    <div class="body">${body}</div>
    <div class="footer">
      <p>This is an automated message from DY Patil ERP. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;

const templates = {
  application_submitted: ({ firstName, applicationId }) => ({
    subject: 'Application Received — DY Patil PhD Program',
    html: base(`
      <h2>Application Received ✓</h2>
      <p>Dear ${firstName},</p>
      <p>We have successfully received your application for the PhD program. Our team will review your details and get back to you shortly.</p>
      <div class="info-box">
        <p><strong>Application ID:</strong> ${applicationId}</p>
        <p><strong>Status:</strong> <span class="badge badge-yellow">Under Review</span></p>
      </div>
      <p>You will receive further communication at this email address as your application progresses.</p>
      <p>Best regards,<br/><strong>DY Patil Admissions Team</strong></p>
    `),
  }),

  test_completed: ({ firstName, score, passing, total }) => ({
    subject: 'Entrance Test Submitted — DY Patil PhD Program',
    html: base(`
      <h2>Test Submitted Successfully</h2>
      <p>Dear ${firstName},</p>
      <p>Your entrance test has been submitted and is now being evaluated.</p>
      ${score != null ? `
      <div class="info-box">
        <p><strong>Your Score:</strong> ${score} / ${total}</p>
        <p><strong>Passing Marks:</strong> ${passing}</p>
        <p><strong>Result:</strong> <span class="badge ${score >= passing ? 'badge-green' : 'badge-red'}">${score >= passing ? 'Passed' : 'Under Evaluation'}</span></p>
      </div>` : ''}
      <p>Results will be communicated to you once the evaluation is complete.</p>
      <p>Best regards,<br/><strong>DY Patil Academic Team</strong></p>
    `),
  }),

  approval_stage_opened: ({ firstName, stageName, submissionTitle, reviewerName }) => ({
    subject: `Approval Stage: ${stageName} — Action Required`,
    html: base(`
      <h2>New Approval Stage Opened</h2>
      <p>Dear ${firstName},</p>
      <p>A new approval stage has been opened for your submission. A reviewer has been assigned and will evaluate your work.</p>
      <div class="info-box">
        <p><strong>Submission:</strong> ${submissionTitle}</p>
        <p><strong>Stage:</strong> ${stageName}</p>
        ${reviewerName ? `<p><strong>Reviewer:</strong> ${reviewerName}</p>` : ''}
        <p><strong>Status:</strong> <span class="badge badge-yellow">Pending Review</span></p>
      </div>
      <p>You will be notified when the review is complete.</p>
      <p>Best regards,<br/><strong>DY Patil Academic Team</strong></p>
    `),
  }),

  submission_approved: ({ firstName, submissionTitle, approverName, comments }) => ({
    subject: `Submission Approved — ${submissionTitle}`,
    html: base(`
      <h2>Submission Approved 🎉</h2>
      <p>Dear ${firstName},</p>
      <p>Congratulations! Your submission has been approved.</p>
      <div class="info-box">
        <p><strong>Submission:</strong> ${submissionTitle}</p>
        ${approverName ? `<p><strong>Approved By:</strong> ${approverName}</p>` : ''}
        <p><strong>Status:</strong> <span class="badge badge-green">Approved</span></p>
        ${comments ? `<p><strong>Comments:</strong> ${comments}</p>` : ''}
      </div>
      <p>You may proceed to the next stage of your research program.</p>
      <p>Best regards,<br/><strong>DY Patil Academic Team</strong></p>
    `),
  }),

  submission_needs_revision: ({ firstName, submissionTitle, approverName, comments, suggestedTitle }) => ({
    subject: `Revision Requested — ${submissionTitle}`,
    html: base(`
      <h2>Revision Requested</h2>
      <p>Dear ${firstName},</p>
      <p>Your submission has been reviewed and requires revision before it can be approved.</p>
      <div class="info-box">
        <p><strong>Submission:</strong> ${submissionTitle}</p>
        ${approverName ? `<p><strong>Reviewer:</strong> ${approverName}</p>` : ''}
        <p><strong>Status:</strong> <span class="badge badge-yellow">Revision Required</span></p>
        ${comments ? `<p><strong>Feedback:</strong> ${comments}</p>` : ''}
        ${suggestedTitle ? `<p><strong>Suggested Title:</strong> ${suggestedTitle}</p>` : ''}
      </div>
      <p>Please log in to the ERP portal to view the full feedback and resubmit your work.</p>
      <p>Best regards,<br/><strong>DY Patil Academic Team</strong></p>
    `),
  }),

  deadline_overdue: ({ firstName, reportTitle, dueDate, semesterLabel }) => ({
    subject: `Deadline Missed — ${reportTitle || 'Progress Report'}`,
    html: base(`
      <h2>Deadline Overdue ⚠️</h2>
      <p>Dear ${firstName},</p>
      <p>This is a reminder that a submission deadline has passed and your report is now overdue.</p>
      <div class="info-box">
        ${reportTitle ? `<p><strong>Report:</strong> ${reportTitle}</p>` : ''}
        ${semesterLabel ? `<p><strong>Period:</strong> ${semesterLabel}</p>` : ''}
        <p><strong>Due Date:</strong> ${dueDate || 'N/A'}</p>
        <p><strong>Status:</strong> <span class="badge badge-red">Overdue</span></p>
      </div>
      <p>Please log in to the ERP portal immediately to submit your progress report. Contact your guide if you need an extension.</p>
      <p>Best regards,<br/><strong>DY Patil Academic Team</strong></p>
    `),
  }),

  fee_due: ({ firstName, semester, amount, dueDate }) => ({
    subject: `Fee Due Reminder — Semester ${semester}`,
    html: base(`
      <h2>Fee Payment Reminder</h2>
      <p>Dear ${firstName},</p>
      <p>This is a reminder that your semester fee payment is due.</p>
      <div class="info-box">
        <p><strong>Semester:</strong> ${semester}</p>
        <p><strong>Amount Due:</strong> ₹${Number(amount).toLocaleString('en-IN')}</p>
        <p><strong>Due Date:</strong> ${dueDate || 'N/A'}</p>
        <p><strong>Status:</strong> <span class="badge badge-yellow">Payment Pending</span></p>
      </div>
      <p>Please contact the accounts office to make your payment and avoid any late fees.</p>
      <p>Best regards,<br/><strong>DY Patil Accounts Team</strong></p>
    `),
  }),

  announcement: ({ firstName, title, message }) => ({
    subject: title,
    html: base(`
      <h2>${title}</h2>
      <p>Dear ${firstName},</p>
      <p>${message.replace(/\n/g, '<br/>')}</p>
      <p>Best regards,<br/><strong>DY Patil ERP Team</strong></p>
    `),
  }),

  zoom_link: ({ firstName, title, message, zoomLink }) => ({
    subject: `Zoom Session: ${title}`,
    html: base(`
      <h2>${title}</h2>
      <p>Dear ${firstName},</p>
      <p>${message.replace(/\n/g, '<br/>')}</p>
      ${zoomLink ? `
      <div class="info-box">
        <p><strong>Join Link:</strong> <a href="${zoomLink}" style="color:#4F46E5">${zoomLink}</a></p>
      </div>
      <a href="${zoomLink}" class="cta">Join Zoom Meeting</a>` : ''}
      <p>Best regards,<br/><strong>DY Patil Academic Team</strong></p>
    `),
  }),
};

// ─── High-level notification email sender ─────────────────────────────────────

/**
 * Send a templated notification email.
 *
 * @param {string} eventKey - e.g. 'submission_approved', 'deadline_overdue'
 * @param {{email:string, first_name:string}} recipient
 * @param {object} data - template-specific variables
 * @param {string} [courseId] - if provided, loads per-course sender config
 */
export const sendNotificationEmail = async (eventKey, recipient, data = {}, courseId = null) => {
  try {
    // 1. Load Brevo config from DB (with cache)
    const brevoConfig = await getBrevoConfig();

    // 2. Determine effective API key and sender
    const apiKey = brevoConfig.apiKey || env.BREVO_API_KEY;
    const sender = brevoConfig.enabled !== false
      ? { name: brevoConfig.senderName || env.BREVO_SENDER_NAME, email: brevoConfig.senderEmail || env.BREVO_SENDER_EMAIL }
      : null;

    // 3. Check course-specific notification rule
    if (courseId) {
      const { rows: [course] } = await query(
        `SELECT preferences FROM courses WHERE id=$1`, [courseId]
      ).catch(() => ({ rows: [] }));
      const courseEmailPrefs = course?.preferences?.email || {};
      const rules = courseEmailPrefs.notificationRules || {};
      // If there's a rule explicitly set to false for this event, skip
      if (rules[eventKey]?.email === false) {
        console.log(`[email] Rule disabled for event "${eventKey}" in course ${courseId}`);
        return { success: true, skipped: true };
      }
      // Use course-level sender override if set
      if (courseEmailPrefs.senderName || courseEmailPrefs.senderEmail) {
        sender.name  = courseEmailPrefs.senderName  || sender?.name;
        sender.email = courseEmailPrefs.senderEmail || sender?.email;
      }
    }

    // 4. Build template
    const template = templates[eventKey];
    if (!template) {
      console.warn(`[email] No template for event "${eventKey}"`);
      return { success: false, error: `No template for event: ${eventKey}` };
    }

    const { subject, html } = template({
      firstName: recipient.first_name || 'Student',
      ...data,
    });

    return await sendEmail({
      to: { email: recipient.email, name: `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim() },
      subject,
      html,
      sender,
      apiKey,
    });
  } catch (err) {
    console.error('[email] sendNotificationEmail error:', err.message);
    return { success: false, error: err.message };
  }
};
