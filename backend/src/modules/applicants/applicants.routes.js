import { Router } from 'express';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { query } from '../../config/database.js';
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
    status: req.query.status,
    search: req.query.search,
    limit: 100000,
    offset: 0,
  });
  ok(res, data);
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
  if (!rows.length) return res.status(400).json({ success: false, message: 'No applicant rows provided' });
  if (!course_id)    return res.status(400).json({ success: false, message: 'course_id is required — select a course first' });

  const { rows: [course] } = await query('SELECT id FROM courses WHERE id=$1', [course_id]);
  if (!course) return res.status(400).json({ success: false, message: 'Course not found' });

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

      // Optional batch resolution by code
      let batch_id = null;
      if (r.batch_code?.trim()) {
        const { rows: [batch] } = await query(
          'SELECT id FROM batches WHERE LOWER(code)=LOWER($1) AND course_id=$2', [r.batch_code.trim(), course_id]
        );
        if (batch) batch_id = batch.id;
        // Unknown batch codes are non-fatal — applicant imports without a batch
      }

      const status = IMPORT_STATUSES.has((r.status || '').trim().toLowerCase())
        ? r.status.trim().toLowerCase()
        : 'submitted';

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
