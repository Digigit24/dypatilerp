/**
 * Notification engine — turns the per-course "Email Notification Rules" config
 * into real, working automated emails.
 *
 * Architecture:
 *   - enqueueEvent()        instant events drop jobs into notification_queue
 *                           (durable outbox — survives restarts; honours per-event
 *                           delay config and the on/off toggle)
 *   - processDueQueue()     worker tick: claims due jobs, sends via Brevo API
 *                           (sendNotificationEmail re-checks the course rule +
 *                           uses the course's verified sender), retries 3x
 *   - runScheduledScans()   time-based events (fee_due, deadline_overdue):
 *                           scans the DB once a day at the configured IST hour,
 *                           dedupes via dedupe_key so reminders repeat only
 *                           every N days as configured
 *   - startNotificationWorker()  60-second interval started from server.js
 *
 * Config lives in courses.preferences.email.notificationRules[eventKey]:
 *   { email: bool, delayMinutes, hourIST, repeatEveryDays, daysBefore }
 */
import { query } from '../../config/database.js';
import { sendNotificationEmail } from '../email/email.service.js';

// ─── Defaults (merged under whatever is saved in the wizard UI) ───────────────
export const EVENT_DEFAULTS = {
  application_submitted:     { email: true, delayMinutes: 0, recipients: ['applicant'] },
  test_completed:            { email: true, delayMinutes: 0, recipients: ['coordinator', 'admin'] },
  approval_stage_opened:     { email: true, delayMinutes: 0 },
  submission_approved:       { email: true, delayMinutes: 0 },
  submission_needs_revision: { email: true, delayMinutes: 0 },
  deadline_overdue:          { email: true, hourIST: 8, repeatEveryDays: 2 },
  fee_due:                   { email: true, daysBefore: 7, hourIST: 8, repeatEveryDays: 3 },
};

// Map event → notifications.type enum (for the in-app bell)
const EVENT_TO_TYPE = {
  application_submitted:     'announcement',
  test_completed:            'announcement',
  approval_stage_opened:     'approval',
  submission_approved:       'approval',
  submission_needs_revision: 'revision',
  deadline_overdue:          'report_due',
  fee_due:                   'fee_due',
};

const ruleFor = async (courseId, eventKey) => {
  let saved = {};
  if (courseId) {
    try {
      const { rows: [c] } = await query('SELECT preferences FROM courses WHERE id=$1', [courseId]);
      saved = c?.preferences?.email?.notificationRules?.[eventKey] || {};
    } catch { /* course lookup failure should never block sending */ }
  }
  return { ...(EVENT_DEFAULTS[eventKey] || { email: true }), ...saved };
};

// IST helpers (server may run in UTC — config hours are IST)
const IST_OFFSET_MS = 5.5 * 3600 * 1000;
const istHour  = () => new Date(Date.now() + IST_OFFSET_MS).getUTCHours();
const todayIST = () => new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
const repeatBucket = (days) => Math.floor(Date.now() / 86400000 / Math.max(1, Number(days) || 1));

// ─── Enqueue an event for one or more recipients ──────────────────────────────
/**
 * @param {string} eventKey  one of EVENT_DEFAULTS keys
 * @param {object} opts
 * @param {string|null} opts.courseId
 * @param {Array<{user_id?:string,email:string,first_name?:string,last_name?:string}>} opts.recipients
 * @param {object} [opts.data]            template variables
 * @param {string} [opts.dedupePrefix]    suppress duplicates (recipient email is appended)
 * @param {number} [opts.delayMinutes]    override the configured delay
 * @param {object} [opts.inApp]           { title, message } — also create a bell notification
 */
export const enqueueEvent = async (eventKey, { courseId = null, recipients = [], data = {}, dedupePrefix = null, delayMinutes = null, inApp = null } = {}) => {
  const rule = await ruleFor(courseId, eventKey);
  if (rule.email === false) return { skipped: true, reason: 'rule disabled' };

  const valid = (recipients || []).filter((r) => r && r.email);
  if (!valid.length) return { queued: 0 };

  const delay = delayMinutes ?? (Number(rule.delayMinutes) || 0);
  let queued = 0;

  for (const r of valid) {
    const dedupe = dedupePrefix ? `${dedupePrefix}:${r.email.toLowerCase()}` : null;
    const { rowCount } = await query(
      `INSERT INTO notification_queue (event_key, course_id, recipient, data, dedupe_key, run_at)
       VALUES ($1,$2,$3,$4,$5, NOW() + ($6 || ' minutes')::interval)
       ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING`,
      [eventKey, courseId, JSON.stringify(r), JSON.stringify(data), dedupe, String(delay)]
    );
    queued += rowCount || 0;
  }

  // In-app bell notification for recipients that are real users
  if (inApp && queued > 0) {
    try {
      const userIds = valid.map((r) => r.user_id).filter(Boolean);
      if (userIds.length) {
        const { rows: [n] } = await query(
          `INSERT INTO notifications (type,title,message,course_id,data)
           VALUES ($1,$2,$3,$4,$5) RETURNING id`,
          [EVENT_TO_TYPE[eventKey] || 'announcement', inApp.title, inApp.message, courseId, JSON.stringify({ event: eventKey, ...data })]
        );
        for (const uid of userIds) {
          await query(
            `INSERT INTO notification_recipients (notification_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
            [n.id, uid]
          );
        }
      }
    } catch (err) {
      console.error('[notify] in-app insert failed:', err.message);
    }
  }

  // Immediate events: kick the queue right away (fire-and-forget)
  if (delay <= 0) setImmediate(() => processDueQueue().catch((e) => console.error('[notify] kick:', e.message)));

  return { queued };
};

// ─── Worker: deliver due jobs ─────────────────────────────────────────────────
let _draining = false;
export const processDueQueue = async (limit = 25) => {
  if (_draining) return { processed: 0 };
  _draining = true;
  try {
    const { rows: jobs } = await query(
      `UPDATE notification_queue SET status='sending', attempts=attempts+1
       WHERE id IN (SELECT id FROM notification_queue
                    WHERE status='pending' AND run_at <= NOW()
                    ORDER BY run_at LIMIT $1)
       RETURNING *`, [limit]
    );
    let sent = 0;
    for (const job of jobs) {
      const recipient = typeof job.recipient === 'string' ? JSON.parse(job.recipient) : (job.recipient || {});
      const data = typeof job.data === 'string' ? JSON.parse(job.data) : (job.data || {});
      let result;
      try {
        result = await sendNotificationEmail(job.event_key, recipient, data, job.course_id);
      } catch (err) {
        result = { success: false, error: err.message };
      }
      if (result.success) {
        await query(`UPDATE notification_queue SET status=$1, sent_at=NOW(), error=NULL WHERE id=$2`,
          [result.skipped ? 'skipped' : 'sent', job.id]);
        if (!result.skipped) sent++;
      } else if (job.attempts >= 3) {
        await query(`UPDATE notification_queue SET status='failed', error=$1 WHERE id=$2`,
          [result.error || 'send failed', job.id]);
      } else {
        await query(`UPDATE notification_queue SET status='pending', run_at=NOW() + INTERVAL '5 minutes', error=$1 WHERE id=$2`,
          [result.error || 'send failed', job.id]);
      }
    }
    return { processed: jobs.length, sent };
  } finally {
    _draining = false;
  }
};

// ─── Scheduled scans: fee_due + deadline_overdue ──────────────────────────────
const getScanState = async () => {
  const { rows: [r] } = await query(`SELECT value FROM app_settings WHERE key='notification_scan_state'`);
  return r?.value || {};
};
const saveScanState = async (state) => {
  await query(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ('notification_scan_state', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=NOW()`,
    [JSON.stringify(state)]
  );
};

/**
 * Runs at most once per day per course per event (at the configured IST hour),
 * unless force=true ("Run checks now" button in the Admin Wizard).
 */
export const runScheduledScans = async ({ force = false, courseId = null } = {}) => {
  const params = [];
  let where = 'WHERE is_active=true';
  if (courseId) { params.push(courseId); where += ` AND id=$1`; }
  const { rows: courses } = await query(`SELECT id, code, preferences FROM courses ${where}`, params);

  const state = await getScanState();
  const today = todayIST();
  const summary = { fee_due: 0, deadline_overdue: 0, scanned_courses: 0 };
  let stateDirty = false;

  for (const course of courses) {
    const cState = state[course.id] || {};

    // ── Fee due reminders ──
    const feeRule = await ruleFor(course.id, 'fee_due');
    if (feeRule.email !== false && (force || (istHour() >= (Number(feeRule.hourIST) || 8) && cState.fee_due !== today))) {
      const daysBefore = Number(feeRule.daysBefore) || 7;
      const bucket = repeatBucket(feeRule.repeatEveryDays || 3);
      const { rows: fees } = await query(
        `SELECT f.id, f.semester, f.amount, f.due_date,
                u.id AS user_id, u.email, u.first_name, u.last_name
         FROM fees f
         JOIN users u   ON u.id = f.student_user_id
         JOIN batches b ON b.id = f.batch_id
         WHERE b.course_id = $1
           AND f.status::text NOT IN ('paid','waived')
           AND f.due_date <= (CURRENT_DATE + ($2)::integer)`,
        [course.id, daysBefore]
      );
      for (const f of fees) {
        const due = f.due_date instanceof Date ? f.due_date.toISOString().slice(0, 10) : String(f.due_date).slice(0, 10);
        const r = await enqueueEvent('fee_due', {
          courseId: course.id,
          recipients: [{ user_id: f.user_id, email: f.email, first_name: f.first_name, last_name: f.last_name }],
          data: { semester: f.semester, amount: Number(f.amount).toLocaleString('en-IN'), dueDate: due },
          dedupePrefix: `fee_due:${f.id}:r${bucket}`,
          delayMinutes: 0,
          inApp: { title: `Fee due — Semester ${f.semester}`, message: `₹${Number(f.amount).toLocaleString('en-IN')} is due on ${due}.` },
        });
        summary.fee_due += r.queued || 0;
      }
      if (!force) { state[course.id] = { ...cState, fee_due: today }; stateDirty = true; }
    }

    // ── Deadline overdue (published assignments past due, no submission) ──
    const odRule = await ruleFor(course.id, 'deadline_overdue');
    if (odRule.email !== false && (force || (istHour() >= (Number(odRule.hourIST) || 8) && cState.deadline_overdue !== today))) {
      const bucket = repeatBucket(odRule.repeatEveryDays || 2);
      const { rows: overdue } = await query(
        `SELECT a.id AS assignment_id, a.title, a.due_date, a.semester,
                u.id AS user_id, u.email, u.first_name, u.last_name
         FROM assignments a
         JOIN batch_enrollments be ON be.batch_id = a.batch_id AND be.status = 'active'
         JOIN users u ON u.id = be.user_id
         WHERE a.course_id = $1
           AND a.is_published = true
           AND a.due_date IS NOT NULL AND a.due_date < NOW()
           AND NOT EXISTS (
             SELECT 1 FROM submissions s
             WHERE s.assignment_id = a.id
               AND s.student_user_id = u.id
               AND s.status <> 'draft'
           )`,
        [course.id]
      );
      for (const o of overdue) {
        const due = o.due_date instanceof Date ? o.due_date.toISOString().slice(0, 10) : String(o.due_date).slice(0, 10);
        const r = await enqueueEvent('deadline_overdue', {
          courseId: course.id,
          recipients: [{ user_id: o.user_id, email: o.email, first_name: o.first_name, last_name: o.last_name }],
          data: { reportTitle: o.title, dueDate: due, semesterLabel: `Semester ${o.semester}` },
          dedupePrefix: `deadline_overdue:${o.assignment_id}:${o.user_id}:r${bucket}`,
          delayMinutes: 0,
          inApp: { title: `Overdue: ${o.title}`, message: `The due date (${due}) has passed without a submission.` },
        });
        summary.deadline_overdue += r.queued || 0;
      }
      if (!force) { state[course.id] = { ...state[course.id], ...cState, deadline_overdue: today }; stateDirty = true; }
    }

    summary.scanned_courses++;
  }

  if (stateDirty) await saveScanState(state);
  if (summary.fee_due + summary.deadline_overdue > 0) {
    setImmediate(() => processDueQueue(50).catch(() => {}));
  }
  return summary;
};

// ─── Domain helpers used by route/service hooks ───────────────────────────────

/** Notify the reviewer(s) of a newly-opened approval stage. */
export const notifyStageOpened = async (submissionId, { stage, reviewerUserId = null, reviewerRole = null }) => {
  try {
    const { rows: [sub] } = await query(
      `SELECT s.id, s.title, s.batch_id, b.course_id,
              stu.first_name AS student_first, stu.last_name AS student_last
       FROM submissions s
       JOIN batches b ON b.id = s.batch_id
       JOIN users stu ON stu.id = s.student_user_id
       WHERE s.id = $1`, [submissionId]
    );
    if (!sub) return;

    let reviewers = [];
    if (reviewerUserId) {
      const { rows } = await query(`SELECT id AS user_id, email, first_name, last_name FROM users WHERE id=$1`, [reviewerUserId]);
      reviewers = rows;
    } else if (reviewerRole) {
      const { rows } = await query(
        `SELECT DISTINCT u.id AS user_id, u.email, u.first_name, u.last_name
         FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
         JOIN users u ON u.id = ur.user_id
         WHERE r.name = $1 AND (ur.batch_id = $2 OR ur.batch_id IS NULL) AND u.is_active = true
         LIMIT 10`,
        [reviewerRole, sub.batch_id]
      );
      reviewers = rows;
    }
    if (!reviewers.length) return;

    const studentName = `${sub.student_first || ''} ${sub.student_last || ''}`.trim();
    await enqueueEvent('approval_stage_opened', {
      courseId: sub.course_id,
      recipients: reviewers,
      data: { stageName: stage, submissionTitle: sub.title, reviewerName: studentName },
      dedupePrefix: `stage_opened:${submissionId}:${stage}`,
      inApp: { title: `Review needed: ${sub.title}`, message: `${studentName}'s submission is waiting at the "${stage}" stage.` },
    });
  } catch (err) {
    console.error('[notify] notifyStageOpened:', err.message);
  }
};

/** Notify the student that their submission was approved / needs revision. */
export const notifySubmissionOutcome = async (submissionId, outcome, { approverName = null, comments = null } = {}) => {
  try {
    const eventKey = outcome === 'approved' ? 'submission_approved' : 'submission_needs_revision';
    const { rows: [sub] } = await query(
      `SELECT s.id, s.title, b.course_id,
              stu.id AS user_id, stu.email, stu.first_name, stu.last_name
       FROM submissions s
       JOIN batches b ON b.id = s.batch_id
       JOIN users stu ON stu.id = s.student_user_id
       WHERE s.id = $1`, [submissionId]
    );
    if (!sub) return;
    await enqueueEvent(eventKey, {
      courseId: sub.course_id,
      recipients: [{ user_id: sub.user_id, email: sub.email, first_name: sub.first_name, last_name: sub.last_name }],
      data: { submissionTitle: sub.title, approverName, comments },
      inApp: {
        title: outcome === 'approved' ? `Approved: ${sub.title}` : `Revision requested: ${sub.title}`,
        message: comments || (outcome === 'approved' ? 'Final approval has been granted.' : 'A reviewer requested changes.'),
      },
    });
  } catch (err) {
    console.error('[notify] notifySubmissionOutcome:', err.message);
  }
};

// ─── Configurable receivers ───────────────────────────────────────────────────

/**
 * Resolve staff users holding any of the given roles, scoped to a course
 * (role assignments tied to a batch count when the batch belongs to the course;
 * global assignments always count).
 */
export const resolveRoleRecipients = async (courseId, roleNames = []) => {
  if (!roleNames.length) return [];
  const { rows } = await query(
    `SELECT DISTINCT u.id AS user_id, u.email, u.first_name, u.last_name
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     JOIN users u ON u.id = ur.user_id
     LEFT JOIN batches b ON b.id = ur.batch_id
     WHERE r.name = ANY($2::text[])
       AND u.is_active = true AND u.email IS NOT NULL
       AND (ur.batch_id IS NULL OR b.course_id = $1)
     LIMIT 25`,
    [courseId, roleNames]
  );
  return rows;
};

const STAFF_ROLES = ['admin', 'coordinator', 'academic_guide', 'industry_mentor'];

/**
 * "Application Received" — receivers configurable per course in the wizard:
 * 'applicant' gets the confirmation copy; staff roles get a staff-facing copy.
 */
export const notifyApplicationSubmitted = async (applicant) => {
  try {
    const rule = await ruleFor(applicant.course_id, 'application_submitted');
    if (rule.email === false) return;
    const audience = Array.isArray(rule.recipients) && rule.recipients.length ? rule.recipients : ['applicant'];
    const applicantName = `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim();

    if (audience.includes('applicant') && applicant.email) {
      await enqueueEvent('application_submitted', {
        courseId: applicant.course_id,
        recipients: [{ email: applicant.email, first_name: applicant.first_name, last_name: applicant.last_name }],
        data: { applicationId: applicant.id },
        dedupePrefix: `application_submitted:${applicant.id}`,
      });
    }

    const staffRoles = audience.filter((a) => STAFF_ROLES.includes(a));
    if (staffRoles.length) {
      const staff = await resolveRoleRecipients(applicant.course_id, staffRoles);
      if (staff.length) {
        await enqueueEvent('application_submitted', {
          courseId: applicant.course_id,
          recipients: staff,
          data: { _template: 'application_submitted_staff', applicantName, applicantEmail: applicant.email, applicationId: applicant.id },
          dedupePrefix: `application_submitted_staff:${applicant.id}`,
          inApp: { title: 'New application received', message: `${applicantName} just applied.` },
        });
      }
    }
  } catch (err) {
    console.error('[notify] notifyApplicationSubmitted:', err.message);
  }
};

/**
 * "Test Completed" — receivers configurable per course:
 * 'candidate' gets their result copy; staff roles get a staff-facing copy.
 */
export const notifyTestCompleted = async ({ courseId, attemptId, candidate, testTitle, score, total, passing }) => {
  try {
    const rule = await ruleFor(courseId, 'test_completed');
    if (rule.email === false) return;
    const audience = Array.isArray(rule.recipients) && rule.recipients.length ? rule.recipients : ['coordinator', 'admin'];
    const candidateName = `${candidate?.first_name || ''} ${candidate?.last_name || ''}`.trim();

    if (audience.includes('candidate') && candidate?.email) {
      await enqueueEvent('test_completed', {
        courseId,
        recipients: [candidate],
        data: { score, passing, total, testTitle },
        dedupePrefix: `test_completed:${attemptId}`,
      });
    }

    const staffRoles = audience.filter((a) => STAFF_ROLES.includes(a));
    if (staffRoles.length) {
      const staff = await resolveRoleRecipients(courseId, staffRoles);
      if (staff.length) {
        await enqueueEvent('test_completed', {
          courseId,
          recipients: staff,
          data: { _template: 'test_completed_staff', candidateName, testTitle, score, total, passing },
          dedupePrefix: `test_completed_staff:${attemptId}`,
          inApp: { title: `Test submitted: ${candidateName}`, message: `Scored ${score}${total ? `/${total}` : ''}${testTitle ? ` on ${testTitle}` : ''}.` },
        });
      }
    }
  } catch (err) {
    console.error('[notify] notifyTestCompleted:', err.message);
  }
};

// ─── Worker bootstrap (called once from server.js) ────────────────────────────
let _timer = null;
export const startNotificationWorker = () => {
  if (_timer) return;
  const tick = async () => {
    try { await processDueQueue(); } catch (e) { console.error('[notify] queue tick:', e.message); }
    try { await runScheduledScans(); } catch (e) { console.error('[notify] scan tick:', e.message); }
  };
  _timer = setInterval(tick, 60 * 1000);
  setTimeout(tick, 10 * 1000); // first pass shortly after boot
  console.log('✓ Notification worker started (60s tick)');
};
