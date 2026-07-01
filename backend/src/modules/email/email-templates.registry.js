/**
 * Email template registry — the single source of truth for the editable
 * email templates surfaced in the Admin → Email Templates UI.
 *
 * Each entry describes:
 *   - key         : stable identifier (matches the notification event key)
 *   - label       : human-friendly name shown in the admin list
 *   - category    : grouping in the admin list
 *   - description : what the email is for / when it is sent
 *   - audience    : who receives it (scholar / staff / applicant)
 *   - variables   : the {{placeholders}} available, each with a sample value
 *                   used for live previews
 *   - subject     : default subject line ({{placeholders}} allowed)
 *   - body        : default INNER HTML body ({{placeholders}} allowed).
 *                   This is wrapped in the shared base() layout when rendered,
 *                   so it should NOT include <html>/<head> — just the content
 *                   that goes inside the white card.
 *
 * IMPORTANT: these `body` strings are the *editable defaults*. The live code
 * templates in email.service.js remain the runtime fallback. Once an admin
 * saves an override (stored in app_settings → 'email_templates'), the override
 * is rendered via simple {{var}} substitution instead of the code template.
 */

// Shared sample values reused across many templates
const SAMPLE = {
  firstName: 'Aarav',
  courseName: 'DY Patil ERP',
};

export const EMAIL_TEMPLATES = [
  // ─── Admissions / applicants ────────────────────────────────────────────────
  {
    key: 'test_credentials',
    label: 'Entrance Test Credentials',
    category: 'Admissions',
    audience: 'Applicant',
    description: 'Sent to an applicant when an entrance test is assigned. Contains login link, username and password.',
    variables: [
      { name: 'firstName', sample: SAMPLE.firstName, description: "Applicant's first name" },
      { name: 'testTitle', sample: 'PhD Entrance Examination 2026', description: 'Title of the test' },
      { name: 'loginUrl', sample: 'https://portal.dyperf.com/test-login', description: 'Test login URL' },
      { name: 'username', sample: 'aarav.test01', description: 'Test login username' },
      { name: 'password', sample: 'Xy7$kP2q', description: 'Test login password' },
      { name: 'duration', sample: '90', description: 'Duration in minutes' },
      { name: 'sections', sample: 'Aptitude, Research Methodology', description: 'Comma-separated section titles' },
    ],
    subject: 'Your Entrance Test Credentials — {{testTitle}}',
    body: `
      <h2>Entrance Test Invitation</h2>
      <p>Dear {{firstName}},</p>
      <p>You have been invited to take the <strong>{{testTitle}}</strong>. Please find your login credentials below.</p>

      <div class="cred-box">
        <p><strong>🔗 Test Login Link:</strong></p>
        <p style="word-break:break-all;margin:8px 0 12px">
          <a href="{{loginUrl}}" style="color:#4F46E5;font-weight:600">{{loginUrl}}</a>
        </p>
        <p><strong>👤 Username:</strong> <span class="val">{{username}}</span></p>
        <p><strong>🔑 Password:</strong> <span class="val">{{password}}</span></p>
      </div>

      <div class="info-box">
        <p><strong>Test:</strong> {{testTitle}}</p>
        <p><strong>Duration:</strong> {{duration}} minutes</p>
        <p><strong>Sections:</strong> {{sections}}</p>
        <p><strong>Link Validity:</strong> This test link is valid for <strong>5 days</strong> from the time of this email. Please complete your test before it expires.</p>
        <p><strong>Important:</strong> Once you click "Start Test", the timer begins and cannot be paused.</p>
      </div>

      <a href="{{loginUrl}}" class="cta">Login &amp; Take Test →</a>

      <p>Best regards,<br/><strong>DY Patil Admissions Team</strong></p>`,
  },

  {
    key: 'test_reminder',
    label: 'Entrance Test Reminder',
    category: 'Admissions',
    audience: 'Applicant',
    description: 'A gentle nudge sent from the pipeline to applicants who were sent a test but have not started it yet. Re-uses their original login link and credentials.',
    variables: [
      { name: 'firstName', sample: SAMPLE.firstName, description: "Applicant's first name" },
      { name: 'testTitle', sample: 'PhD Entrance Examination 2026', description: 'Title of the test' },
      { name: 'loginUrl', sample: 'https://portal.dyperf.com/test-login', description: 'Their original test login link' },
      { name: 'duration', sample: '90', description: 'Duration in minutes' },
    ],
    subject: 'Reminder: Complete Your Entrance Test — {{testTitle}}',
    body: `
      <h2>Friendly Reminder ⏰</h2>
      <p>Dear {{firstName}},</p>
      <p>We noticed you haven't started your <strong>{{testTitle}}</strong> yet. Your test is still waiting for you — please complete it at the earliest.</p>

      <div class="info-box">
        <p><strong>Test:</strong> {{testTitle}}</p>
        <p><strong>Duration:</strong> {{duration}} minutes</p>
        <p><strong>How to log in:</strong> Use the same username and password from your original test invitation email.</p>
        <p><strong>Important:</strong> Once you click "Start Test", the timer begins and cannot be paused.</p>
      </div>

      <a href="{{loginUrl}}" class="cta">Login &amp; Take Test →</a>

      <p style="word-break:break-all">Or open this link: <a href="{{loginUrl}}" style="color:#4F46E5">{{loginUrl}}</a></p>
      <p>If you can no longer find your credentials, simply reply to the admissions team and we'll resend them.</p>
      <p>Best regards,<br/><strong>DY Patil Admissions Team</strong></p>`,
  },

  {
    key: 'application_submitted',
    label: 'Application Received (Applicant)',
    category: 'Admissions',
    audience: 'Applicant',
    description: 'Confirmation sent to an applicant after they submit their application.',
    variables: [
      { name: 'firstName', sample: SAMPLE.firstName, description: "Applicant's first name" },
      { name: 'applicationId', sample: 'APP-2026-00142', description: 'Application reference ID' },
    ],
    subject: 'Application Received — DY Patil PhD Program',
    body: `
      <h2>Application Received ✓</h2>
      <p>Dear {{firstName}},</p>
      <p>We have successfully received your application for the PhD program. Our team will review your details and get back to you shortly.</p>
      <div class="info-box">
        <p><strong>Application ID:</strong> {{applicationId}}</p>
        <p><strong>Status:</strong> <span class="badge badge-yellow">Under Review</span></p>
      </div>
      <p>You will receive further communication at this email address as your application progresses.</p>
      <p>Best regards,<br/><strong>DY Patil Admissions Team</strong></p>`,
  },

  // ─── Applicants ─────────────────────────────────────────────────────────────
  {
    key: 'applicant_shortlisted',
    label: 'Final Shortlist — Qualified for Interview (Registration Fee)',
    category: 'Applicants',
    audience: 'Applicant',
    description: 'Sent automatically to an applicant when they are moved to the Final Shortlist (status → shortlisted). Confirms they qualified the entrance test and shares the registration-fee / bank account details for the interview stage.',
    variables: [
      { name: 'fullName', sample: 'Aarav Sharma', description: "Applicant's full name (falls back to \"Applicant\" if empty)" },
    ],
    subject: 'Qualified for the Interview Stage – Post-Doctoral Program Admission Process',
    body: `
      <h2>Qualified for the Interview Stage</h2>
      <p>Dear {{fullName}},</p>
      <p>Greetings from Dr. D. Y. Patil Education and Research Foundation!</p>
      <p>We are pleased to inform you that you have successfully qualified the Entrance Test for admission to the Post-Doctoral Program offered by Dr. D. Y. Patil Education and Research Foundation, in collaboration with McCoy College of Business, Texas State University, USA and Dr. D. Y. Patil Institute of Management Studies, Pune, India.</p>
      <p>The next stage of the admission process is the Personal Interview. The interview schedule, along with other relevant details, will be communicated to you shortly via email.</p>
      <p>As part of the admission process, all shortlisted applicants are required to complete the program registration by paying the <strong>Registration Fee of USD 200 (INR 19,000)</strong>.</p>
      <div class="info-box">
        <p><strong>Account Details</strong></p>
        <p><strong>Bank Name:</strong> HDFC Bank</p>
        <p><strong>A/c No.:</strong> 50100136437400</p>
        <p><strong>Account Name:</strong> DR D Y PATIL EDUCATION AND RESEARCH FOUNDATION</p>
        <p><strong>IFSC Code:</strong> HDFC0000007</p>
      </div>
      <p>Kindly complete the payment within the stipulated timeline and share the transaction receipt by replying to this email. Your registration will be considered complete only upon successful receipt and verification of the registration fee.</p>
      <p>Please note that the interview process will be scheduled only for candidates who have completed the registration formalities.</p>
      <p>We congratulate you on your successful performance in the Entrance Test and look forward to your participation in the next stage of the selection process.</p>
      <p>Should you have any queries, please feel free to contact on 9545154191 or 9860152927. For more information, please refer to <a href="https://www.dypims.com/research-center.php" style="color:#4F46E5">https://www.dypims.com/research-center.php</a></p>
      <p>We wish you all the very best for the upcoming interview.</p>
      <p>Warm regards,<br/><strong>Post-Doctoral Program</strong><br/>Dr. D. Y. Patil Education and Research Foundation<br/>Pune (India)</p>`,
  },

  {
    key: 'test_completed',
    label: 'Test Submitted (Applicant)',
    category: 'Admissions',
    audience: 'Applicant',
    description: 'Sent to a candidate after they submit their entrance test.',
    variables: [
      { name: 'firstName', sample: SAMPLE.firstName, description: "Candidate's first name" },
      { name: 'score', sample: '42', description: 'Score achieved' },
      { name: 'total', sample: '50', description: 'Total marks' },
      { name: 'passing', sample: '30', description: 'Passing marks' },
    ],
    subject: 'Entrance Test Submitted — DY Patil PhD Program',
    body: `
      <h2>Test Submitted Successfully</h2>
      <p>Dear {{firstName}},</p>
      <p>Your entrance test has been submitted and is now being evaluated.</p>
      <div class="info-box">
        <p><strong>Your Score:</strong> {{score}} / {{total}}</p>
        <p><strong>Passing Marks:</strong> {{passing}}</p>
      </div>
      <p>Results will be communicated to you once the evaluation is complete.</p>
      <p>Best regards,<br/><strong>DY Patil Academic Team</strong></p>`,
  },

  {
    key: 'application_submitted_staff',
    label: 'New Application Alert (Staff)',
    category: 'Admissions',
    audience: 'Staff',
    description: 'Notifies staff that a new application has been submitted.',
    variables: [
      { name: 'firstName', sample: 'Priya', description: "Staff member's first name" },
      { name: 'applicantName', sample: 'Aarav Sharma', description: 'Name of the applicant' },
      { name: 'applicantEmail', sample: 'aarav@example.com', description: 'Applicant email' },
      { name: 'applicationId', sample: 'APP-2026-00142', description: 'Application reference ID' },
    ],
    subject: 'New Application Received — {{applicantName}}',
    body: `
      <h2>New Application Received</h2>
      <p>Dear {{firstName}},</p>
      <p>A new application has just been submitted.</p>
      <div class="info-box">
        <p><strong>Applicant:</strong> {{applicantName}}</p>
        <p><strong>Email:</strong> {{applicantEmail}}</p>
        <p><strong>Application ID:</strong> {{applicationId}}</p>
      </div>
      <p>Review it in the portal under <strong>Applicants</strong>.</p>
      <p>Best regards,<br/><strong>DY Patil Academic Team</strong></p>`,
  },

  {
    key: 'test_completed_staff',
    label: 'Test Submitted Alert (Staff)',
    category: 'Admissions',
    audience: 'Staff',
    description: 'Notifies staff that a candidate has completed their entrance test.',
    variables: [
      { name: 'firstName', sample: 'Priya', description: "Staff member's first name" },
      { name: 'candidateName', sample: 'Aarav Sharma', description: 'Candidate name' },
      { name: 'testTitle', sample: 'PhD Entrance Examination 2026', description: 'Test title' },
      { name: 'score', sample: '42', description: 'Score achieved' },
      { name: 'total', sample: '50', description: 'Total marks' },
      { name: 'passing', sample: '30', description: 'Passing marks' },
    ],
    subject: 'Test Submitted — {{candidateName}} · {{testTitle}}',
    body: `
      <h2>Entrance Test Submitted</h2>
      <p>Dear {{firstName}},</p>
      <p>A candidate has just completed the entrance test.</p>
      <div class="info-box">
        <p><strong>Candidate:</strong> {{candidateName}}</p>
        <p><strong>Test:</strong> {{testTitle}}</p>
        <p><strong>Score:</strong> {{score}} / {{total}}</p>
        <p><strong>Passing Marks:</strong> {{passing}}</p>
      </div>
      <p>Full answers are available in the portal under <strong>Applicants → Test Results</strong>.</p>
      <p>Best regards,<br/><strong>DY Patil Academic Team</strong></p>`,
  },

  // ─── Approvals / submissions ────────────────────────────────────────────────
  {
    key: 'approval_stage_opened',
    label: 'Review Required (Approver)',
    category: 'Approvals',
    audience: 'Staff',
    description: 'Sent to an approver when a submission reaches their approval stage.',
    variables: [
      { name: 'firstName', sample: 'Priya', description: "Approver's first name" },
      { name: 'submissionTitle', sample: 'Chapter 2 — Literature Review', description: 'Submission title' },
      { name: 'reviewerName', sample: 'Aarav Sharma', description: 'Who submitted it' },
      { name: 'stageName', sample: 'Guide Review', description: 'Name of the approval stage' },
    ],
    subject: 'Review Required: {{submissionTitle}} — {{stageName}} stage',
    body: `
      <h2>New Submission Awaiting Your Review</h2>
      <p>Dear {{firstName}},</p>
      <p>A submission has reached your approval stage and is waiting for your action.</p>
      <div class="info-box">
        <p><strong>Submission:</strong> {{submissionTitle}}</p>
        <p><strong>Submitted By:</strong> {{reviewerName}}</p>
        <p><strong>Your Stage:</strong> {{stageName}}</p>
        <p><strong>Status:</strong> <span class="badge badge-yellow">Pending Review</span></p>
      </div>
      <p>Please log in to the portal and review it under <strong>Approvals</strong>.</p>
      <p>Best regards,<br/><strong>DY Patil Academic Team</strong></p>`,
  },

  {
    key: 'submission_approved',
    label: 'Submission Approved (Scholar)',
    category: 'Approvals',
    audience: 'Scholar',
    description: 'Sent to a scholar when their submission is approved.',
    variables: [
      { name: 'firstName', sample: SAMPLE.firstName, description: "Scholar's first name" },
      { name: 'submissionTitle', sample: 'Chapter 2 — Literature Review', description: 'Submission title' },
      { name: 'approverName', sample: 'Dr. Priya Menon', description: 'Who approved it' },
      { name: 'comments', sample: 'Well structured — proceed to the next chapter.', description: 'Approver comments' },
    ],
    subject: 'Submission Approved — {{submissionTitle}}',
    body: `
      <h2>Submission Approved 🎉</h2>
      <p>Dear {{firstName}},</p>
      <p>Congratulations! Your submission has been approved.</p>
      <div class="info-box">
        <p><strong>Submission:</strong> {{submissionTitle}}</p>
        <p><strong>Approved By:</strong> {{approverName}}</p>
        <p><strong>Status:</strong> <span class="badge badge-green">Approved</span></p>
        <p><strong>Comments:</strong> {{comments}}</p>
      </div>
      <p>Best regards,<br/><strong>DY Patil Academic Team</strong></p>`,
  },

  {
    key: 'submission_needs_revision',
    label: 'Revision Requested (Scholar)',
    category: 'Approvals',
    audience: 'Scholar',
    description: 'Sent to a scholar when their submission needs revision.',
    variables: [
      { name: 'firstName', sample: SAMPLE.firstName, description: "Scholar's first name" },
      { name: 'submissionTitle', sample: 'Chapter 2 — Literature Review', description: 'Submission title' },
      { name: 'approverName', sample: 'Dr. Priya Menon', description: 'Reviewer name' },
      { name: 'comments', sample: 'Please expand the methodology section.', description: 'Reviewer feedback' },
      { name: 'suggestedTitle', sample: 'Chapter 2 — Review of Related Literature', description: 'Suggested new title' },
    ],
    subject: 'Revision Requested — {{submissionTitle}}',
    body: `
      <h2>Revision Requested</h2>
      <p>Dear {{firstName}},</p>
      <p>Your submission has been reviewed and requires revision.</p>
      <div class="info-box">
        <p><strong>Submission:</strong> {{submissionTitle}}</p>
        <p><strong>Reviewer:</strong> {{approverName}}</p>
        <p><strong>Status:</strong> <span class="badge badge-yellow">Revision Required</span></p>
        <p><strong>Feedback:</strong> {{comments}}</p>
        <p><strong>Suggested Title:</strong> {{suggestedTitle}}</p>
      </div>
      <p>Best regards,<br/><strong>DY Patil Academic Team</strong></p>`,
  },

  // ─── Progress / deadlines ───────────────────────────────────────────────────
  {
    key: 'deadline_overdue',
    label: 'Deadline Overdue (Scholar)',
    category: 'Progress',
    audience: 'Scholar',
    description: 'Reminder sent when a submission deadline has passed.',
    variables: [
      { name: 'firstName', sample: SAMPLE.firstName, description: "Scholar's first name" },
      { name: 'reportTitle', sample: 'Semester 2 Progress Report', description: 'Report title' },
      { name: 'semesterLabel', sample: 'Semester 2 (2026)', description: 'Reporting period' },
      { name: 'dueDate', sample: '10 June 2026', description: 'Original due date' },
    ],
    subject: 'Deadline Missed — {{reportTitle}}',
    body: `
      <h2>Deadline Overdue ⚠️</h2>
      <p>Dear {{firstName}},</p>
      <p>This is a reminder that a submission deadline has passed and your report is now overdue.</p>
      <div class="info-box">
        <p><strong>Report:</strong> {{reportTitle}}</p>
        <p><strong>Period:</strong> {{semesterLabel}}</p>
        <p><strong>Due Date:</strong> {{dueDate}}</p>
        <p><strong>Status:</strong> <span class="badge badge-red">Overdue</span></p>
      </div>
      <p>Best regards,<br/><strong>DY Patil Academic Team</strong></p>`,
  },

  // ─── Fees ───────────────────────────────────────────────────────────────────
  {
    key: 'fee_due',
    label: 'Fee Due Reminder (Scholar)',
    category: 'Fees',
    audience: 'Scholar',
    description: 'Reminder sent when a semester fee payment is pending.',
    variables: [
      { name: 'firstName', sample: SAMPLE.firstName, description: "Scholar's first name" },
      { name: 'semester', sample: '3', description: 'Semester number' },
      { name: 'amount', sample: '45,000', description: 'Amount due (formatted)' },
      { name: 'dueDate', sample: '30 June 2026', description: 'Payment due date' },
    ],
    subject: 'Fee Due Reminder — Semester {{semester}}',
    body: `
      <h2>Fee Payment Reminder</h2>
      <p>Dear {{firstName}},</p>
      <div class="info-box">
        <p><strong>Semester:</strong> {{semester}}</p>
        <p><strong>Amount Due:</strong> ₹{{amount}}</p>
        <p><strong>Due Date:</strong> {{dueDate}}</p>
        <p><strong>Status:</strong> <span class="badge badge-yellow">Payment Pending</span></p>
      </div>
      <p>Best regards,<br/><strong>DY Patil Accounts Team</strong></p>`,
  },

  // ─── Announcements / general ────────────────────────────────────────────────
  {
    key: 'announcement',
    label: 'Announcement',
    category: 'General',
    audience: 'Scholar',
    description: 'Generic announcement broadcast to recipients.',
    variables: [
      { name: 'firstName', sample: SAMPLE.firstName, description: "Recipient's first name" },
      { name: 'title', sample: 'Library Closed on Friday', description: 'Announcement title' },
      { name: 'message', sample: 'The central library will remain closed on Friday for maintenance.', description: 'Announcement body text' },
    ],
    subject: '{{title}}',
    body: `
      <h2>{{title}}</h2>
      <p>Dear {{firstName}},</p>
      <p>{{message}}</p>
      <p>Best regards,<br/><strong>DY Patil ERP Team</strong></p>`,
  },

  {
    key: 'zoom_link',
    label: 'Zoom Session Invite',
    category: 'General',
    audience: 'Scholar',
    description: 'Sent to share a Zoom meeting link for a session.',
    variables: [
      { name: 'firstName', sample: SAMPLE.firstName, description: "Recipient's first name" },
      { name: 'title', sample: 'Research Methodology Workshop', description: 'Session title' },
      { name: 'message', sample: 'Join us for a live session on research methods.', description: 'Session description' },
      { name: 'zoomLink', sample: 'https://zoom.us/j/1234567890', description: 'Zoom join link' },
    ],
    subject: 'Zoom Session: {{title}}',
    body: `
      <h2>{{title}}</h2>
      <p>Dear {{firstName}},</p>
      <p>{{message}}</p>
      <div class="info-box">
        <p><strong>Join Link:</strong> <a href="{{zoomLink}}" style="color:#4F46E5">{{zoomLink}}</a></p>
      </div>
      <a href="{{zoomLink}}" class="cta">Join Zoom Meeting</a>
      <p>Best regards,<br/><strong>DY Patil Academic Team</strong></p>`,
  },

  // ─── Portal credentials ─────────────────────────────────────────────────────
  {
    key: 'login_credentials',
    label: 'Portal Login Credentials',
    category: 'General',
    audience: 'Scholar',
    description: 'Sent to a new user (scholar or staff) with their portal login credentials.',
    variables: [
      { name: 'firstName', sample: SAMPLE.firstName, description: "User's first name" },
      { name: 'portalLabel', sample: 'Scholar Portal', description: 'Portal name' },
      { name: 'loginUrl', sample: 'https://portal.dyperf.com/login', description: 'Login URL' },
      { name: 'username', sample: 'aarav@example.com', description: 'Login username (email)' },
      { name: 'password', sample: 'Welcome@123', description: 'Temporary password' },
    ],
    subject: 'Your {{portalLabel}} Login Credentials — DY Patil',
    body: `
      <h2>Welcome to the {{portalLabel}}</h2>
      <p>Dear {{firstName}},</p>
      <p>Your account is ready. Use the credentials below to log in.</p>
      <div class="cred-box">
        <p><strong>🔗 Login:</strong></p>
        <p style="word-break:break-all;margin:8px 0 12px"><a href="{{loginUrl}}" style="color:#4F46E5;font-weight:600">{{loginUrl}}</a></p>
        <p><strong>👤 Username:</strong> <span class="val">{{username}}</span></p>
        <p><strong>🔑 Password:</strong> <span class="val">{{password}}</span></p>
      </div>
      <a href="{{loginUrl}}" class="cta">Log In →</a>
      <p><strong>Important:</strong> Please change your password from your Profile page after your first login.</p>
      <p>Best regards,<br/><strong>DY Patil Academic Team</strong></p>`,
  },
];

/** Map keyed by template key for quick lookup. */
export const EMAIL_TEMPLATES_BY_KEY = Object.fromEntries(
  EMAIL_TEMPLATES.map((t) => [t.key, t])
);

/** Build a sample-data object for a template (used for live previews). */
export const sampleDataFor = (key) => {
  const tpl = EMAIL_TEMPLATES_BY_KEY[key];
  if (!tpl) return {};
  const data = { courseName: SAMPLE.courseName };
  for (const v of tpl.variables) data[v.name] = v.sample;
  return data;
};
