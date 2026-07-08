import { Router } from 'express';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, badRequest, notFound } from '../../utils/response.js';
import { query } from '../../config/database.js';
import { activeEnrolledClause } from '../../utils/enrollmentFilters.js';
import { env } from '../../config/env.js';
import { sendTestReminder, sendApplicantShortlistPaymentReminder } from '../email/email.service.js';
import * as svc from './applicants.service.js';
import * as ctrl from './applicants.controller.js';
import {
  createApplicantSchema, updateApplicantStatusSchema,
  updateApplicantDetailsSchema, convertToStudentSchema, bulkConvertSchema,
} from './applicants.schema.js';

const router = Router();

/**
 * @swagger
 * /applicants:
 *   get:
 *     tags: [Applicants]
 *     summary: List applicants (filterable by course_id, status, search)
 *     parameters:
 *       - in: query
 *         name: course_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [submitted,test_pending,test_completed,shortlisted,rejected,enrolled] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated applicants list
 */
router.get('/', authenticate, requirePermission('applicants', 'read'), ctrl.list);

/**
 * @swagger
 * /applicants/{id}:
 *   get:
 *     tags: [Applicants]
 *     summary: Get applicant by ID
 *     responses:
 *       200:
 *         description: Applicant detail
 */
/**
 * @swagger
 * /applicants/export:
 *   get:
 *     tags: [Applicants]
 *     summary: Export ALL applicants (course-filtered, no pagination cap) for Excel download
 */
router.get('/export', authenticate, requirePermission('applicants', 'read'), asyncHandler(async (req, res) => {
  const course_id = req.courseId || req.query.course_id;
  const { data } = await svc.listApplicants({
    course_id,
    batch_id: req.batchId || req.query.batch_id,
    status: req.query.status,
    search: req.query.search,
    limit: 100000,
    offset: 0,
  });
  ok(res, data);
}));

/**
 * @swagger
 * /applicants/stats:
 *   get:
 *     tags: [Applicants]
 *     summary: Course+batch scoped applicant counts (single source of truth for the UI)
 *     description: Returns total, per-status counts, tests_completed and avg_score. Honors X-Course-Id / X-Batch-Id.
 */
router.get('/stats', authenticate, requirePermission('applicants', 'read'), asyncHandler(async (req, res) => {
  const course_id = req.courseId || req.query.course_id || null;
  const batch_id  = req.batchId  || req.query.batch_id  || null;

  const params = [];
  const conds  = [];
  if (course_id) { params.push(course_id); conds.push(`a.course_id = $${params.length}`); }
  if (batch_id)  { params.push(batch_id);  conds.push(`a.batch_id = $${params.length}`); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  // Same scope as `where`, but additionally requires an active batch_enrollment
  // for 'enrolled' applicants so the Enrolled tab/badge matches active enrollments.
  // (Only the status breakdown needs this — testAgg spans all applicants.)
  const enrolledGuard = activeEnrolledClause('a');
  const whereEnrolled = conds.length ? `WHERE ${conds.join(' AND ')} AND ${enrolledGuard}` : `WHERE ${enrolledGuard}`;

  const [byStatus, testAgg] = await Promise.all([
    query(`SELECT status, COUNT(*)::int AS count FROM applicants a ${whereEnrolled} GROUP BY status`, params),
    query(
      `SELECT COUNT(*) FILTER (WHERE sub.submitted_at IS NOT NULL)::int AS tests_completed,
              ROUND(AVG(sub.score)::numeric, 0) AS avg_score
       FROM applicants a
       LEFT JOIN LATERAL (
         SELECT score, submitted_at FROM test_attempts
         WHERE applicant_id = a.id AND status = 'submitted'
         ORDER BY submitted_at DESC NULLS LAST LIMIT 1
       ) sub ON true
       ${where}`, params
    ),
  ]);

  const by_status = Object.fromEntries(byStatus.rows.map((r) => [r.status, r.count]));
  const total = byStatus.rows.reduce((s, r) => s + r.count, 0);

  ok(res, {
    course_id,
    batch_id,
    total,
    by_status,
    pending_test: by_status.test_pending || 0,
    tests_completed: testAgg.rows[0]?.tests_completed || 0,
    avg_score: testAgg.rows[0]?.avg_score != null ? Number(testAgg.rows[0].avg_score) : null,
  });
}));

/**
 * @swagger
 * /applicants/import:
 *   post:
 *     tags: [Applicants]
 *     summary: Bulk-import applicants from the mapped JSON array produced by the import wizard
 *     description: "Body: { applicants: [...], course_id }. Returns { imported, skipped, errors, total }."
 */
const IMPORT_STATUSES = new Set(['submitted', 'shortlisted_test', 'test_pending', 'test_completed', 'shortlisted', 'rejected', 'enrolled']);

router.post('/import', authenticate, requirePermission('applicants', 'create'), asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body.applicants) ? req.body.applicants : [];
  const course_id = req.body.course_id || req.courseId;
  const default_batch_id = req.body.default_batch_id || null;
  // Wizard-level status applied to every row (a mapped per-row "status" wins).
  const default_status = IMPORT_STATUSES.has((req.body.default_status || '').trim().toLowerCase())
    ? req.body.default_status.trim().toLowerCase()
    : 'submitted';
  if (!rows.length) return res.status(400).json({ success: false, message: 'No applicant rows provided' });
  if (!course_id)    return res.status(400).json({ success: false, message: 'course_id is required — select a course first' });

  const { rows: [course] } = await query('SELECT id FROM courses WHERE id=$1', [course_id]);
  if (!course) return res.status(400).json({ success: false, message: 'Course not found' });

  // Validate the wizard's "assign all to batch" selection (must belong to this course)
  let defaultBatchId = null;
  if (default_batch_id) {
    const { rows: [db] } = await query(
      'SELECT id FROM batches WHERE id=$1 AND course_id=$2', [default_batch_id, course_id]
    );
    if (!db) return res.status(400).json({ success: false, message: 'Selected batch does not belong to this course' });
    defaultBatchId = db.id;
  }

  let imported = 0;
  let skipped  = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 1;
    const email = (r.email || '').trim().toLowerCase();

    if (!r.first_name?.trim() || !r.last_name?.trim() || !email) {
      errors.push({ row: rowNum, email: r.email || '—', error: 'Missing required field (first_name, last_name or email)' });
      skipped++; continue;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ row: rowNum, email, error: 'Invalid email format' });
      skipped++; continue;
    }

    try {
      // Duplicate check — same email within the same course
      const { rows: [dup] } = await query(
        'SELECT id FROM applicants WHERE LOWER(email)=$1 AND course_id=$2', [email, course_id]
      );
      if (dup) {
        errors.push({ row: rowNum, email, error: 'Applicant with this email already exists in this course' });
        skipped++; continue;
      }

      // Batch resolution: a mapped batch_code column wins per row,
      // otherwise the wizard's fixed batch selection applies to every row.
      let batch_id = defaultBatchId;
      if (r.batch_code?.trim()) {
        const { rows: [batch] } = await query(
          'SELECT id FROM batches WHERE LOWER(code)=LOWER($1) AND course_id=$2', [r.batch_code.trim(), course_id]
        );
        if (batch) batch_id = batch.id;
        // Unknown batch codes are non-fatal — falls back to the selected batch (or none)
      }

      // Per-row mapped status wins; otherwise fall back to the wizard's choice.
      const status = IMPORT_STATUSES.has((r.status || '').trim().toLowerCase())
        ? r.status.trim().toLowerCase()
        : default_status;

      const phd_details = {
        subject:             r.phd_discipline?.trim()      || null,
        thesis_title:        r.phd_research_title?.trim()  || null,
        year_awarded:        r.phd_completion_year ? String(r.phd_completion_year).trim() : null,
        university:          r.university?.trim()          || null,
        scopus_publications: r.scopus_publications !== undefined && r.scopus_publications !== ''
          ? Number(r.scopus_publications) || 0 : null,
        highest_degree:      r.highest_degree?.trim()      || null,
      };
      const application_data = {
        personal: {
          first_name: r.first_name.trim(),
          last_name:  r.last_name.trim(),
          email,
          phone: r.phone?.trim() || null,
          state_country: r.state_country?.trim() || null,
        },
        academic: {
          university:          phd_details.university,
          highest_degree:      phd_details.highest_degree,
          phd_discipline:      phd_details.subject,
          phd_research_title:  phd_details.thesis_title,
          phd_completion_year: phd_details.year_awarded,
          scopus_publications: phd_details.scopus_publications,
        },
        research_statement: r.research_statement?.trim() || null,
        imported: true,
      };

      await query(
        `INSERT INTO applicants (course_id, first_name, last_name, email, phone, status, batch_id, phd_details, application_data)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [course_id, r.first_name.trim(), r.last_name.trim(), email, r.phone?.trim() || null,
         status, batch_id, JSON.stringify(phd_details), JSON.stringify(application_data)]
      );
      imported++;
    } catch (err) {
      errors.push({ row: rowNum, email, error: err.message });
      skipped++;
    }
  }

  ok(res, { imported, skipped, errors, total: rows.length }, `Imported ${imported} applicant(s)`);
}));

/**
 * @swagger
 * /applicants/{id}/remind-test:
 *   post:
 *     tags: [Applicants]
 *     summary: Remind an applicant (Test Sent stage) who hasn't started their test
 *     description: Re-sends the applicant's existing test login link. Does not rotate credentials.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Reminder email sent
 */
router.post('/:id/remind-test', authenticate, requirePermission('applicants', 'update'), asyncHandler(async (req, res) => {
  const applicantId = req.params.id;

  const { rows: [applicant] } = await query('SELECT * FROM applicants WHERE id=$1', [applicantId]);
  if (!applicant) return notFound(res, 'Applicant not found');

  // Find the most recent test the applicant was given access to.
  const { rows: [token] } = await query(
    `SELECT tat.token, tat.test_id, t.title, t.duration_minutes, t.course_id
     FROM test_access_tokens tat
     JOIN tests t ON t.id = tat.test_id
     WHERE tat.applicant_id = $1
     ORDER BY tat.created_at DESC
     LIMIT 1`,
    [applicantId]
  );
  if (!token) return badRequest(res, 'No test has been sent to this applicant yet — send the test link first.');

  const loginUrl = `${env.FRONTEND_URL}/test-login?token=${token.token}`;
  const result = await sendTestReminder({
    applicant,
    test: { title: token.title, duration_minutes: token.duration_minutes },
    loginUrl,
    courseId: token.course_id,
  });

  if (!result.success) {
    return badRequest(res, `Reminder could not be sent: ${result.error || 'email failed'}`);
  }

  // Record the reminder timestamp inside application_data so the pipeline can
  // show "last reminded" (kept in JSONB to avoid a schema migration).
  const remindedAt = new Date().toISOString();
  await query(
    `UPDATE applicants
       SET application_data = jsonb_set(COALESCE(application_data, '{}'::jsonb), '{last_reminded_at}', to_jsonb($2::text), true),
           updated_at = NOW()
     WHERE id = $1`,
    [applicantId, remindedAt]
  );

  ok(res, { applicant_id: applicantId, email: applicant.email, email_sent: true, last_reminded_at: remindedAt }, 'Reminder sent');
}));

/**
 * @swagger
 * /applicants/{id}/remind-payment:
 *   post:
 *     tags: [Applicants]
 *     summary: Remind a shortlisted applicant to pay the registration fee (before the deadline)
 *     description: >
 *       Sends the registration-fee payment reminder email to a Final Shortlist
 *       (status = shortlisted) applicant. Only tracks whether a reminder was sent
 *       (stored in application_data.last_payment_reminded_at) — no payment status.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Payment reminder email sent
 */
router.post('/:id/remind-payment', authenticate, requirePermission('applicants', 'update'), asyncHandler(async (req, res) => {
  const applicantId = req.params.id;

  const { rows: [applicant] } = await query('SELECT * FROM applicants WHERE id=$1', [applicantId]);
  if (!applicant) return notFound(res, 'Applicant not found');

  // Only Final Shortlist candidates get the registration-fee payment reminder.
  if (applicant.status !== 'shortlisted') {
    return badRequest(res, 'Payment reminders can only be sent to shortlisted (Final Shortlist) candidates.');
  }

  const result = await sendApplicantShortlistPaymentReminder({
    applicant,
    courseId: applicant.course_id || null,
  });

  // Do not hide email failures — return an error and do NOT update the timestamp.
  if (!result.success) {
    return badRequest(res, `Payment reminder could not be sent: ${result.error || 'email failed'}`);
  }

  // Record the reminder timestamp inside application_data so the pipeline can
  // show "last reminded" (kept in JSONB to avoid a schema migration). Mirrors the
  // remind-test approach: jsonb_set + COALESCE preserves all existing fields.
  // Only updated AFTER a successful send.
  const remindedAt = new Date().toISOString();
  await query(
    `UPDATE applicants
       SET application_data = jsonb_set(COALESCE(application_data, '{}'::jsonb), '{last_payment_reminded_at}', to_jsonb($2::text), true),
           updated_at = NOW()
     WHERE id = $1`,
    [applicantId, remindedAt]
  );

  ok(res, { applicant_id: applicantId, email: applicant.email, email_sent: true, last_payment_reminded_at: remindedAt }, 'Payment reminder sent');
}));

router.get('/:id', authenticate, requirePermission('applicants', 'read'), ctrl.getOne);

/**
 * @swagger
 * /applicants:
 *   post:
 *     tags: [Applicants]
 *     summary: Submit a new application (public endpoint)
 *     security: []
 *     responses:
 *       201:
 *         description: Application submitted
 */
router.post('/', optionalAuth, validate(createApplicantSchema), ctrl.create);

/**
 * @swagger
 * /applicants/{id}/status:
 *   put:
 *     tags: [Applicants]
 *     summary: Update applicant status (shortlist, reject, assign batch, etc.)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string }
 *               batch_id: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Status updated
 */
/**
 * @swagger
 * /applicants/{id}:
 *   put:
 *     tags: [Applicants]
 *     summary: Edit applicant personal/academic details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Applicant updated
 */
router.put('/:id', authenticate, requirePermission('applicants', 'update'),
  validate(updateApplicantDetailsSchema), ctrl.updateDetails);

router.put('/:id/status', authenticate, requirePermission('applicants', 'update'),
  validate(updateApplicantStatusSchema), ctrl.updateStatus);

/**
 * @swagger
 * /applicants/{id}/convert:
 *   post:
 *     tags: [Applicants]
 *     summary: Convert a shortlisted applicant to an enrolled student
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [batch_id]
 *             properties:
 *               batch_id: { type: string, format: uuid }
 *               enrollment_number: { type: string }
 *     responses:
 *       200:
 *         description: Converted to student
 */
router.post('/:id/convert', authenticate, requirePermission('applicants', 'update'),
  validate(convertToStudentSchema), ctrl.convertToStudent);

/**
 * @swagger
 * /applicants/bulk-convert:
 *   post:
 *     tags: [Applicants]
 *     summary: Bulk convert multiple applicants to students
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [applicant_ids, batch_id]
 *             properties:
 *               applicant_ids: { type: array, items: { type: string, format: uuid } }
 *               batch_id: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Bulk conversion results
 */
router.post('/bulk-convert', authenticate, requirePermission('applicants', 'update'),
  validate(bulkConvertSchema), ctrl.bulkConvert);

export default router;
