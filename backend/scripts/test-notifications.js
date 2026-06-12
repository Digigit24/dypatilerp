/**
 * TEMPORARY — send a sample of every notification email to one inbox.
 *
 * Run from the backend folder (needs backend/.env + DB access for the Brevo key):
 *   node scripts/test-notifications.js                       → sends to the default address
 *   node scripts/test-notifications.js someone@example.com   → sends to a custom address
 *
 * Safe to delete after testing.
 */
import { sendNotificationEmail, sendLoginCredentials } from '../src/modules/email/email.service.js';
import { pool } from '../src/config/database.js';

const TO = process.argv[2] || 'hrithikroushan320@gmail.com';

const recipient = { email: TO, first_name: 'Hrithik', last_name: 'Roushan' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Every event template with realistic sample data
const SAMPLES = [
  ['application_submitted', {
    applicationId: 'APP-2026-0042',
  }],
  ['application_submitted', {
    _template: 'application_submitted_staff',
    applicantName: 'Anita Deshmukh', applicantEmail: 'anita.deshmukh@example.com', applicationId: 'APP-2026-0042',
  }],
  ['test_completed', {
    score: 72, passing: 40, total: 100, testTitle: 'DY Patil PhD Entrance Examination',
  }],
  ['test_completed', {
    _template: 'test_completed_staff',
    candidateName: 'Anita Deshmukh', testTitle: 'DY Patil PhD Entrance Examination', score: 72, total: 100, passing: 40,
  }],
  ['approval_stage_opened', {
    stageName: 'Coordinator Review', submissionTitle: 'Semester 1 Progress Report', reviewerName: 'Anita Deshmukh',
  }],
  ['submission_approved', {
    submissionTitle: 'Semester 1 Progress Report', approverName: 'Dr. Mehta', comments: 'Excellent progress — keep it up!',
  }],
  ['submission_needs_revision', {
    submissionTitle: 'Semester 1 Progress Report', approverName: 'Dr. Mehta', comments: 'Please add the literature review section and resubmit.',
  }],
  ['deadline_overdue', {
    reportTitle: 'Research Methodology Assignment', dueDate: '2026-06-10', semesterLabel: 'Semester 1',
  }],
  ['fee_due', {
    semester: 2, amount: '75,000', dueDate: '2026-06-20',
  }],
  ['announcement', {
    title: 'Sample Announcement', message: 'This is what a general announcement email looks like.',
  }],
  ['zoom_link', {
    title: 'Weekly Review Call', message: 'Join the mentor sync on Friday at 4 PM IST.', zoomLink: 'https://zoom.us/j/0000000000',
  }],
  ['test_credentials', {
    testTitle: 'DY Patil PhD Entrance Examination', username: 'anita.deshmukh@example.com',
    password: 'Sample123', loginUrl: 'https://app.dyperf.com/test-login', duration: 90,
    sections: 'Section A (25) · Section B (50) · Section C (25)',
  }],
];

const run = async () => {
  console.log(`\nSending ${SAMPLES.length + 1} sample notification emails to ${TO}\n`);
  let okCount = 0, failCount = 0;

  for (const [eventKey, data] of SAMPLES) {
    const label = data._template || eventKey;
    try {
      const r = await sendNotificationEmail(eventKey, recipient, data, null);
      if (r.success) { okCount++; console.log(`  ✓ ${label}`); }
      else { failCount++; console.log(`  ✗ ${label} — ${r.error}`); }
    } catch (e) {
      failCount++; console.log(`  ✗ ${label} — ${e.message}`);
    }
    await sleep(400); // gentle on the Brevo rate limit
  }

  // Login credentials email (separate sender path)
  try {
    const r = await sendLoginCredentials({
      user: { email: TO, first_name: 'Hrithik', last_name: 'Roushan' },
      password: 'Sample-Pass-123',
      courseId: null,
      portalLabel: 'Scholar Portal',
    });
    if (r.success) { okCount++; console.log('  ✓ login_credentials'); }
    else { failCount++; console.log(`  ✗ login_credentials — ${r.error}`); }
  } catch (e) {
    failCount++; console.log(`  ✗ login_credentials — ${e.message}`);
  }

  console.log(`\nDone: ${okCount} sent, ${failCount} failed.\n`);
  await pool.end().catch(() => {});
  process.exit(failCount ? 1 : 0);
};

run();
