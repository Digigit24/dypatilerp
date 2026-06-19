/**
 * Brevo SMTP transactional email service.
 *
 * Uses nodemailer + Brevo SMTP relay (smtp-relay.brevo.com:587).
 * Falls back to console-log if no SMTP credentials are configured.
 *
 * Usage:
 *   import { sendEmail, sendTestCredentials, sendNotificationEmail } from './email.service.js'
 */

import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import { query } from '../../config/database.js';

// ─── Transporter factory ──────────────────────────────────────────────────────

let _transporter = null;

const getTransporter = () => {
  if (_transporter) return _transporter;
  if (!env.BREVO_SMTP_USER || !env.BREVO_SMTP_PASS) return null;
  _transporter = nodemailer.createTransport({
    host: env.BREVO_SMTP_HOST,
    port: env.BREVO_SMTP_PORT,
    secure: false,          // STARTTLS on port 587
    auth: {
      user: env.BREVO_SMTP_USER,
      pass: env.BREVO_SMTP_PASS,
    },
  });
  return _transporter;
};

// ─── Core sender ──────────────────────────────────────────────────────────────

/**
 * Send a single transactional email.
 *
 * @param {object} opts
 * @param {string|{email:string,name?:string}|Array} opts.to
 * @param {string} opts.subject
 * @param {string} opts.html
 * @param {string} [opts.text]
 * @param {{email:string,name?:string}} [opts.sender]  – override default sender
 * @returns {Promise<{success:boolean, messageId?:string, error?:string}>}
 */
// ─── Brevo HTTP API sender (port 443 — immune to SMTP interception/blocks) ───
const sendViaBrevoApi = async ({ apiKey, sender, recipients, subject, html, text }) => {
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: sender.name, email: sender.email },
        to: recipients,
        subject,
        htmlContent: html,
        ...(text && { textContent: text }),
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: `Brevo API ${res.status}: ${body.message || JSON.stringify(body)}` };
    }
    return { success: true, messageId: body.messageId || null, via: 'api' };
  } catch (err) {
    return { success: false, error: `Brevo API request failed: ${err.message}` };
  }
};

export const sendEmail = async ({ to, subject, html, text, sender, apiKey } = {}) => {
  // Saved settings (app_settings.brevo in the database) are the source of truth.
  // Resolution order: explicit param → database → .env (legacy fallback).
  const db = await getBrevoConfig();

  const effectiveSender = sender || {
    name:  db.senderName  || env.BREVO_SENDER_NAME,
    email: db.senderEmail || env.BREVO_SENDER_EMAIL,
  };

  const list = Array.isArray(to) ? to : [to];

  // ── 1. Prefer the Brevo HTTPS API (port 443) when an API key is available ──
  //    SMTP (587) is often intercepted/blocked by cPanel "SMTP Restrictions".
  const key = (apiKey || '').trim() || (db.apiKey || '').trim() || (env.BREVO_API_KEY || '').trim();
  let apiError = null;
  if (key) {
    const apiRecipients = list.map((r) =>
      typeof r === 'string' ? { email: r } : { email: r.email, ...(r.name ? { name: r.name } : {}) }
    );
    const result = await sendViaBrevoApi({
      apiKey: key, sender: effectiveSender, recipients: apiRecipients, subject, html, text,
    });
    if (result.success) {
      console.log('[email] Sent via Brevo API →', result.messageId, '→', apiRecipients.map((r) => r.email));
      return result;
    }
    apiError = result.error;
    console.warn('[email] Brevo API failed, falling back to SMTP:', apiError);
  }

  // ── 2. SMTP fallback ────────────────────────────────────────────────────────
  const transport = getTransporter();

  if (!transport) {
    if (apiError) return { success: false, error: apiError };
    console.log('[email] SMTP not configured — mock send');
    console.log(`[email] MOCK → To: ${JSON.stringify(to)} | Subject: ${subject}`);
    return { success: true, mock: true };
  }

  // Normalise "to" → nodemailer address format
  const recipients = list.map((r) => (typeof r === 'string' ? r : `${r.name || ''} <${r.email}>`));

  try {
    const info = await transport.sendMail({
      from:    `"${effectiveSender.name}" <${effectiveSender.email}>`,
      to:      recipients.join(', '),
      subject,
      html,
      ...(text && { text }),
    });
    console.log('[email] Sent →', info.messageId, '→', recipients);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[email] SMTP error:', err.message);
    // Surface BOTH failures — the API error is usually the actionable one
    return {
      success: false,
      error: apiError
        ? `Brevo API failed: ${apiError} || SMTP fallback also failed: ${err.message}`
        : err.message,
    };
  }
};

// ─── Load live Brevo config from app_settings ─────────────────────────────────

let _cachedBrevoConfig = null;
let _cacheTs = 0;

const getBrevoConfig = async () => {
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

export const bustBrevoCache = () => { _cachedBrevoConfig = null; };

// ─── Editable template overrides (app_settings → 'email_templates') ────────────
// Admins edit templates in the UI; overrides are stored as
//   { [templateKey]: { subject, body } }
// and rendered via simple {{variable}} substitution. When no override exists,
// the hard-coded code templates below are used (preserving all default wording
// and conditional logic).

let _cachedTemplates = null;
let _templatesTs = 0;

const getTemplateOverrides = async () => {
  if (_cachedTemplates && Date.now() - _templatesTs < 60_000) return _cachedTemplates;
  try {
    const { rows: [row] } = await query(`SELECT value FROM app_settings WHERE key='email_templates'`);
    _cachedTemplates = row?.value || {};
    _templatesTs = Date.now();
  } catch {
    _cachedTemplates = {};
  }
  return _cachedTemplates;
};

export const bustTemplatesCache = () => { _cachedTemplates = null; };

/** Replace {{ variable }} placeholders with values from `data` (missing → ''). */
const substitute = (str, data = {}) =>
  String(str ?? '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const v = data[key];
    return v === undefined || v === null ? '' : String(v);
  });

/**
 * Render a template by key.
 * 1. If an admin override exists → render override subject/body via substitution,
 *    wrapped in the shared base() layout.
 * 2. Otherwise call `fallback(data)` if provided, else the code template.
 * Returns { subject, html } or null when nothing can render the key.
 */
export const renderTemplate = async (key, data = {}, fallback = null) => {
  const overrides = await getTemplateOverrides();
  const ov = overrides[key];
  if (ov && (ov.subject || ov.body)) {
    return {
      subject: substitute(ov.subject || '', data),
      html: base(substitute(ov.body || '', data), data.courseName),
    };
  }
  if (typeof fallback === 'function') return fallback(data);
  const tpl = templates[key];
  if (tpl) return tpl(data);
  return null;
};

/**
 * Render arbitrary (unsaved) subject/body for the live preview in the editor.
 * Wraps the body in the shared base() layout exactly like a sent email.
 */
export const renderPreview = ({ subject, body, data = {}, courseName } = {}) => ({
  subject: substitute(subject || '', data),
  html: base(substitute(body || '', data), courseName || data.courseName),
});

/**
 * Resolve the sender for a given course.
 * course.preferences.email.{senderName,senderEmail} (set in Course Settings UI)
 * wins; otherwise global saved settings; otherwise env defaults.
 * All senders must be verified in Brevo.
 */
export const getCourseSender = async (courseId) => {
  let coursePrefs = {};
  if (courseId) {
    try {
      const { rows: [course] } = await query('SELECT preferences FROM courses WHERE id=$1', [courseId]);
      coursePrefs = course?.preferences?.email || {};
    } catch { /* fall through to globals */ }
  }
  const db = await getBrevoConfig();
  return {
    name:  coursePrefs.senderName  || db.senderName  || env.BREVO_SENDER_NAME,
    email: coursePrefs.senderEmail || db.senderEmail || env.BREVO_SENDER_EMAIL,
  };
};

// ─── HTML base template ────────────────────────────────────────────────────────

const base = (body, courseName = 'DY Patil ERP') => `<!DOCTYPE html>
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
    .cta:hover{background:#4338CA}
    .info-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:16px 0}
    .info-box p{margin:4px 0;font-size:13px;color:#6b7280}
    .info-box strong{color:#111827}
    .cred-box{background:#fefce8;border:2px solid #facc15;border-radius:12px;padding:20px;margin:16px 0}
    .cred-box p{margin:6px 0;font-size:14px;color:#713f12}
    .cred-box .val{font-family:monospace;font-size:16px;font-weight:700;color:#1e1b4b;background:#fff;padding:4px 10px;border-radius:6px;display:inline-block;letter-spacing:.5px}
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
      <h1>${courseName}</h1>
      <p>Research Program Management System</p>
    </div>
    <div class="body">${body}</div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;

// ─── Email templates ──────────────────────────────────────────────────────────

const templates = {

  // ── Test credentials sent when admin assigns test to applicant ──
  test_credentials: ({ firstName, testTitle, username, password, loginUrl, duration, sections }) => ({
    subject: `Your Entrance Test Credentials — ${testTitle}`,
    html: base(`
      <h2>Entrance Test Invitation</h2>
      <p>Dear ${firstName},</p>
      <p>You have been invited to take the <strong>${testTitle}</strong>. Please find your login credentials below.</p>

      <div class="cred-box">
        <p><strong>🔗 Test Login Link:</strong></p>
        <p style="word-break:break-all;margin:8px 0 12px">
          <a href="${loginUrl}" style="color:#4F46E5;font-weight:600">${loginUrl}</a>
        </p>
        <p><strong>👤 Username:</strong> <span class="val">${username}</span></p>
        <p><strong>🔑 Password:</strong> <span class="val">${password}</span></p>
      </div>

      <div class="info-box">
        <p><strong>Test:</strong> ${testTitle}</p>
        <p><strong>Duration:</strong> ${duration} minutes</p>
        ${sections ? `<p><strong>Sections:</strong> ${sections}</p>` : ''}
        <p><strong>Link Validity:</strong> This test link is valid for <strong>5 days</strong> from the time of this email. Please complete your test before it expires.</p>
        <p><strong>Important:</strong> Once you click "Start Test", the timer begins and cannot be paused.</p>
      </div>

      <a href="${loginUrl}" class="cta">Login &amp; Take Test →</a>

      <p><strong>Instructions:</strong></p>
      <ul style="color:#374151;font-size:14px;line-height:1.8;padding-left:20px">
        <li>Click the link above (or copy it to your browser)</li>
        <li>Log in with the username and password provided</li>
        <li>Read the instructions carefully before starting</li>
        <li>The timer starts when you click "Start Test" — it will not stop if you disconnect</li>
        <li>Your answers are saved automatically every 30 seconds</li>
      </ul>
      <p>Best regards,<br/><strong>DY Patil Admissions Team</strong></p>
    `),
  }),

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

  application_submitted_staff: ({ firstName, applicantName, applicantEmail, applicationId }) => ({
    subject: `New Application Received — ${applicantName}`,
    html: base(`
      <h2>New Application Received</h2>
      <p>Dear ${firstName},</p>
      <p>A new application has just been submitted.</p>
      <div class="info-box">
        <p><strong>Applicant:</strong> ${applicantName}</p>
        ${applicantEmail ? `<p><strong>Email:</strong> ${applicantEmail}</p>` : ''}
        ${applicationId ? `<p><strong>Application ID:</strong> ${applicationId}</p>` : ''}
      </div>
      <p>Review it in the portal under <strong>Applicants</strong>.</p>
      <p>Best regards,<br/><strong>DY Patil Academic Team</strong></p>
    `),
  }),

  test_completed_staff: ({ firstName, candidateName, testTitle, score, total, passing }) => ({
    subject: `Test Submitted — ${candidateName}${testTitle ? ` · ${testTitle}` : ''}`,
    html: base(`
      <h2>Entrance Test Submitted</h2>
      <p>Dear ${firstName},</p>
      <p>A candidate has just completed the entrance test.</p>
      <div class="info-box">
        <p><strong>Candidate:</strong> ${candidateName}</p>
        ${testTitle ? `<p><strong>Test:</strong> ${testTitle}</p>` : ''}
        <p><strong>Score:</strong> ${score}${total ? ` / ${total}` : ''}</p>
        ${passing != null ? `<p><strong>Result:</strong> <span class="badge ${Number(score) >= Number(passing) ? 'badge-green' : 'badge-red'}">${Number(score) >= Number(passing) ? 'Passed' : 'Below passing marks'}</span></p>` : ''}
      </div>
      <p>Full answers are available in the portal under <strong>Applicants → Test Results</strong>.</p>
      <p>Best regards,<br/><strong>DY Patil Academic Team</strong></p>
    `),
  }),

  approval_stage_opened: ({ firstName, stageName, submissionTitle, reviewerName }) => ({
    subject: `Review Required: ${submissionTitle} — ${stageName} stage`,
    html: base(`
      <h2>New Submission Awaiting Your Review</h2>
      <p>Dear ${firstName},</p>
      <p>A submission has reached your approval stage and is waiting for your action.</p>
      <div class="info-box">
        <p><strong>Submission:</strong> ${submissionTitle}</p>
        ${reviewerName ? `<p><strong>Submitted By:</strong> ${reviewerName}</p>` : ''}
        <p><strong>Your Stage:</strong> ${stageName}</p>
        <p><strong>Status:</strong> <span class="badge badge-yellow">Pending Review</span></p>
      </div>
      <p>Please log in to the portal and review it under <strong>Approvals</strong>.</p>
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
      <p>Best regards,<br/><strong>DY Patil Academic Team</strong></p>
    `),
  }),

  submission_needs_revision: ({ firstName, submissionTitle, approverName, comments, suggestedTitle }) => ({
    subject: `Revision Requested — ${submissionTitle}`,
    html: base(`
      <h2>Revision Requested</h2>
      <p>Dear ${firstName},</p>
      <p>Your submission has been reviewed and requires revision.</p>
      <div class="info-box">
        <p><strong>Submission:</strong> ${submissionTitle}</p>
        ${approverName ? `<p><strong>Reviewer:</strong> ${approverName}</p>` : ''}
        <p><strong>Status:</strong> <span class="badge badge-yellow">Revision Required</span></p>
        ${comments ? `<p><strong>Feedback:</strong> ${comments}</p>` : ''}
        ${suggestedTitle ? `<p><strong>Suggested Title:</strong> ${suggestedTitle}</p>` : ''}
      </div>
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
      <p>Best regards,<br/><strong>DY Patil Academic Team</strong></p>
    `),
  }),

  fee_due: ({ firstName, semester, amount, dueDate }) => ({
    subject: `Fee Due Reminder — Semester ${semester}`,
    html: base(`
      <h2>Fee Payment Reminder</h2>
      <p>Dear ${firstName},</p>
      <div class="info-box">
        <p><strong>Semester:</strong> ${semester}</p>
        <p><strong>Amount Due:</strong> ₹${Number(amount).toLocaleString('en-IN')}</p>
        <p><strong>Due Date:</strong> ${dueDate || 'N/A'}</p>
        <p><strong>Status:</strong> <span class="badge badge-yellow">Payment Pending</span></p>
      </div>
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

// ─── High-level helpers ───────────────────────────────────────────────────────

/**
 * Send portal login credentials (scholar or staff).
 * Uses the course's verified sender when a courseId is resolvable.
 */
export const sendLoginCredentials = async ({ user, password, courseId = null, portalLabel = 'Scholar Portal' }) => {
  const sender = await getCourseSender(courseId);
  const loginUrl = `${env.FRONTEND_URL}/login`;

  // Override-aware render: admin edits win, otherwise this inline fallback.
  const { subject, html } = await renderTemplate(
    'login_credentials',
    { firstName: user.first_name, portalLabel, loginUrl, username: user.email, password },
    () => ({
      subject: `Your ${portalLabel} Login Credentials — DY Patil`,
      html: base(`
    <h2>Welcome to the ${portalLabel}</h2>
    <p>Dear ${user.first_name},</p>
    <p>Your account is ready. Use the credentials below to log in.</p>
    <div class="cred-box">
      <p><strong>🔗 Login:</strong></p>
      <p style="word-break:break-all;margin:8px 0 12px"><a href="${loginUrl}" style="color:#4F46E5;font-weight:600">${loginUrl}</a></p>
      <p><strong>👤 Username:</strong> <span class="val">${user.email}</span></p>
      <p><strong>🔑 Password:</strong> <span class="val">${password}</span></p>
    </div>
    <a href="${loginUrl}" class="cta">Log In →</a>
    <p><strong>Important:</strong> Please change your password from your Profile page after your first login.</p>
    <p>Best regards,<br/><strong>DY Patil Academic Team</strong></p>
  `),
    })
  );
  const text = [
    `Your ${portalLabel} login credentials`,
    '',
    `Login: ${loginUrl}`,
    `Username: ${user.email}`,
    `Password: ${password}`,
    '',
    'Please change your password from your Profile page after your first login.',
  ].join('\n');

  return sendEmail({
    to: { email: user.email, name: `${user.first_name} ${user.last_name || ''}`.trim() },
    subject, html, text, sender,
  });
};

/**
 * Send test credentials to one applicant.
 * Called by test-assign.routes.js after creating a token.
 */
export const sendTestCredentials = async ({
  applicant,       // { first_name, last_name, email }
  test,            // { title, duration_minutes }
  sections,        // array of section titles
  username,
  password,
  loginUrl,
  courseId,
}) => {
  const sectionStr = sections?.map((s) => s.title || s).join(', ') || null;
  const sender = await getCourseSender(courseId);
  const { subject, html } = await renderTemplate('test_credentials', {
    firstName: applicant.first_name,
    testTitle: test.title,
    username,
    password,
    loginUrl,
    duration: test.duration_minutes,
    sections: sectionStr,
  });

  // Plain-text fallback — keeps credentials on separate lines so no email client
  // can accidentally concatenate URL + credentials into one broken hyperlink.
  const text = [
    `Entrance Test Invitation — ${test.title}`,
    '',
    `Dear ${applicant.first_name},`,
    '',
    'You have been invited to take an entrance test. Use the details below to log in.',
    '',
    `Test Login Link:`,
    loginUrl,
    '',
    `Username: ${username}`,
    `Password: ${password}`,
    '',
    `Test:     ${test.title}`,
    `Duration: ${test.duration_minutes} minutes`,
    ...(sectionStr ? [`Sections: ${sectionStr}`] : []),
    '',
    'LINK VALIDITY: This test link is valid for 5 days from the time of this email.',
    'IMPORTANT: Once you click "Start Test", the timer begins and cannot be paused.',
    '',
    'Instructions:',
    '1. Open the link above in your browser',
    '2. Log in with the username and password above',
    '3. Read the instructions carefully before starting',
    '4. Your answers are saved automatically every 30 seconds',
    '',
    'Best regards,',
    'DY Patil Admissions Team',
  ].join('\n');

  return sendEmail({
    to: { email: applicant.email, name: `${applicant.first_name} ${applicant.last_name}` },
    subject,
    html,
    text,
    sender,
  });
};

/**
 * Send a "you haven't started your test yet" reminder to one applicant.
 * Re-uses their existing login link — no password rotation — so the credentials
 * from their original invitation email still work.
 */
export const sendTestReminder = async ({
  applicant,       // { first_name, last_name, email }
  test,            // { title, duration_minutes }
  loginUrl,
  courseId,
}) => {
  const sender = await getCourseSender(courseId);
  const { subject, html } = await renderTemplate('test_reminder', {
    firstName: applicant.first_name,
    testTitle: test.title,
    loginUrl,
    duration: test.duration_minutes,
  });

  const text = [
    `Reminder — Complete your entrance test: ${test.title}`,
    '',
    `Dear ${applicant.first_name},`,
    '',
    `We noticed you haven't started your test yet. Please complete it at the earliest.`,
    '',
    `Test:     ${test.title}`,
    `Duration: ${test.duration_minutes} minutes`,
    '',
    `Test Login Link:`,
    loginUrl,
    '',
    `Use the same username and password from your original test invitation email.`,
    '',
    'Best regards,',
    'DY Patil Admissions Team',
  ].join('\n');

  return sendEmail({
    to: { email: applicant.email, name: `${applicant.first_name} ${applicant.last_name}` },
    subject,
    html,
    text,
    sender,
  });
};

/**
 * Send a templated notification email, with optional per-course sender override.
 */
export const sendNotificationEmail = async (eventKey, recipient, data = {}, courseId = null) => {
  try {
    const brevoConfig = await getBrevoConfig();

    let senderOverride = null;
    if (courseId) {
      const { rows: [course] } = await query(
        `SELECT preferences FROM courses WHERE id=$1`, [courseId]
      ).catch(() => ({ rows: [] }));
      const courseEmailPrefs = course?.preferences?.email || {};
      const rules = courseEmailPrefs.notificationRules || {};
      if (rules[eventKey]?.email === false) {
        console.log(`[email] Rule disabled for "${eventKey}" in course ${courseId}`);
        return { success: true, skipped: true };
      }
      if (courseEmailPrefs.senderName || courseEmailPrefs.senderEmail) {
        senderOverride = {
          name:  courseEmailPrefs.senderName  || env.BREVO_SENDER_NAME,
          email: courseEmailPrefs.senderEmail || env.BREVO_SENDER_EMAIL,
        };
      }
    }

    // data._template lets one event use audience-specific wording
    // (e.g. test_completed → candidate copy vs. staff copy)
    const templateKey = data._template || eventKey;
    const rendered = await renderTemplate(templateKey, {
      firstName: recipient.first_name || 'Student',
      ...data,
    });
    if (!rendered) {
      console.warn(`[email] No template for event "${templateKey}"`);
      return { success: false, error: `No template: ${templateKey}` };
    }
    const { subject, html } = rendered;

    return await sendEmail({
      to: { email: recipient.email, name: `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim() },
      subject,
      html,
      ...(senderOverride && { sender: senderOverride }),
    });
  } catch (err) {
    console.error('[email] sendNotificationEmail error:', err.message);
    return { success: false, error: err.message };
  }
};
