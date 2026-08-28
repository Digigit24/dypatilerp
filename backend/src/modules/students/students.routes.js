import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission, requireRole, scopeBatchSQL, isOwnScope } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, notFound } from '../../utils/response.js';
import { query } from '../../config/database.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import * as profileCtrl from './student-profile.controller.js';
import { ALL_SLOTS as ONBOARDING_DOC_SLOTS } from './student-profile.service.js';
import * as exportSvc from './students-export.service.js';

const router = Router();
router.use(authenticate);

const assignGuideSchema = z.object({
  guide_user_id: z.string().uuid(),
  guide_type: z.enum(['academic', 'industry']),
  batch_id: z.string().uuid(),
});

// ─── CSV helpers ──────────────────────────────────────────────────────────────
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const toCSV = (rows) => rows.map((r) => r.map(csvCell).join(',')).join('\r\n');

// ─── Build shared WHERE clause ────────────────────────────────────────────────
const buildWhere = (q) => {
  const params = [];
  const conds  = [];
  if (q.course_id) { params.push(q.course_id);  conds.push(`b.course_id=$${params.length}`);  }
  if (q.batch_id)  { params.push(q.batch_id);   conds.push(`be.batch_id=$${params.length}`);  }
  if (q.status)    { params.push(q.status);      conds.push(`be.status=$${params.length}`);    }
  else             { conds.push(`be.status <> 'withdrawn'`); } // hide archived/removed by default
  if (q.search)    {
    params.push(`%${q.search}%`);
    conds.push(`(u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }
  return { params, where: conds.length ? `WHERE ${conds.join(' AND ')}` : '' };
};

// Own/batch scoping shared by GET /export and POST /export/documents-zip —
// kept in one place so a future scoping fix can't land on only one of them
// and silently reopen the over-broad-export bug fixed below.
const applyStudentsScope = (req, { where, params }) => {
  let scopedWhere = where;
  if (isOwnScope(req)) {
    params.push(req.user.id);
    scopedWhere = scopedWhere ? `${scopedWhere} AND be.user_id=$${params.length}` : `WHERE be.user_id=$${params.length}`;
  }
  const scopeFrag = scopeBatchSQL(req, 'be.batch_id');
  if (scopeFrag) scopedWhere = scopedWhere ? `${scopedWhere} ${scopeFrag}` : `WHERE TRUE ${scopeFrag}`;
  return scopedWhere;
};

// ─── GET /students/export/columns — column catalogue for the export drawer ───
router.get('/export/columns', requirePermission('students', 'read'), asyncHandler(async (req, res) => {
  ok(res, exportSvc.EXPORT_COLUMNS);
}));

// ─── GET /students/export — profile-only CSV, optional `?columns=` subset ────
// Scoped identically to GET /students (own/batch grants apply) — the export
// previously skipped this and let any "students:read" grant, regardless of
// scope, export every scholar.
router.get('/export', requirePermission('students', 'read'), asyncHandler(async (req, res) => {
  const course_id = req.courseId || req.query.course_id;
  const batch_id = req.batchId || req.query.batch_id;
  const { params, where } = buildWhere({ ...req.query, course_id, batch_id });
  const scopedWhere = applyStudentsScope(req, { where, params });

  const rows = await exportSvc.fetchExportRows(scopedWhere, params);
  const columns = exportSvc.resolveColumns(req.query.columns);
  const csv = toCSV(exportSvc.rowsToCSVArrays(rows, columns));
  const filename = `students-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.send('﻿' + csv);
}));

// ─── POST /students/export/documents-zip — background ZIP of onboarding docs ──
// Responds immediately with a job id; the actual archive is built after the
// response is sent (see setImmediate below) and the requester is emailed a
// download link — see students-export.service.js#runDocumentsZipJob.
//
// `email` is caller-supplied (by explicit product decision — the requester
// may want the link on a different inbox/shared address than their login
// email). Every send is still tied to `requestedBy` in export_jobs, so who
// asked for it and where it went stays traceable even though the address
// itself isn't locked to the requester's own account.
const exportZipSchema = z.object({
  email: z.string().email(),
  course_id: z.string().uuid().optional(),
  batch_id: z.string().uuid().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
});
router.post('/export/documents-zip', requirePermission('students', 'read'), validate(exportZipSchema), asyncHandler(async (req, res) => {
  const course_id = req.courseId || req.body.course_id;
  const batch_id = req.batchId || req.body.batch_id;
  const { params, where } = buildWhere({ ...req.body, course_id, batch_id });
  const scopedWhere = applyStudentsScope(req, { where, params });

  const { rows: scholars } = await query(
    `SELECT be.user_id FROM batch_enrollments be
     JOIN users u ON u.id=be.user_id JOIN batches b ON b.id=be.batch_id JOIN courses c ON c.id=b.course_id
     ${scopedWhere}`,
    params
  );
  const userIds = scholars.map((s) => s.user_id);
  if (!userIds.length) {
    return res.status(400).json({ success: false, message: 'No scholars match the current filters.' });
  }

  const jobId = await exportSvc.createExportJob({
    requestedBy: req.user.id,
    email: req.body.email,
    scope: { user_ids: userIds },
    scholarCount: userIds.length,
  });

  ok(res, { job_id: jobId, scholar_count: userIds.length },
    `Preparing the documents ZIP for ${userIds.length} scholar(s) — you'll get an email at ${req.body.email} when it's ready.`);

  setImmediate(() => {
    exportSvc.runDocumentsZipJob(jobId).catch((err) => console.error('[export-zip] Unhandled:', err));
  });
}));

// ─── POST /students/import ────────────────────────────────────────────────────
router.post('/import', requirePermission('students', 'create'), asyncHandler(async (req, res) => {
  const students = Array.isArray(req.body.students) ? req.body.students : [];
  if (students.length === 0) {
    return res.status(400).json({ success: false, message: 'No student rows provided' });
  }

  const { rows: [studentRole] } = await query(`SELECT id FROM roles WHERE name='student'`);
  let imported = 0;
  let skipped  = 0;
  const errors = [];

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const rowNum = i + 1;

    if (!s.first_name?.trim() || !s.last_name?.trim() || !s.email?.trim()) {
      errors.push({ row: rowNum, email: s.email || '—', error: 'Missing required field (first_name, last_name or email)' });
      skipped++; continue;
    }
    if (!s.batch_code?.trim()) {
      errors.push({ row: rowNum, email: s.email, error: 'Missing batch_code' });
      skipped++; continue;
    }

    try {
      const { rows: [batch] } = await query(
        `SELECT id FROM batches WHERE LOWER(code)=LOWER($1)`, [s.batch_code.trim()]
      );
      if (!batch) {
        errors.push({ row: rowNum, email: s.email, error: `Batch code "${s.batch_code}" not found` });
        skipped++; continue;
      }

      let userId;
      const { rows: [existing] } = await query(
        `SELECT id FROM users WHERE LOWER(email)=LOWER($1)`, [s.email.trim()]
      );

      if (existing) {
        userId = existing.id;
      } else {
        const { rows: [newUser] } = await query(
          `INSERT INTO users (email, password_hash, first_name, last_name, phone, is_active, email_verified)
           VALUES ($1, 'PENDING_SETUP', $2, $3, $4, true, false)
           RETURNING id`,
          [s.email.trim().toLowerCase(), s.first_name.trim(), s.last_name.trim(), s.phone?.trim() || null]
        );
        userId = newUser.id;
        if (studentRole) {
          await query(
            `INSERT INTO user_roles (user_id, role_id, batch_id, assigned_by)
             VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
            [userId, studentRole.id, batch.id, req.user.id]
          );
        }
      }

      const { rows: [existingEnroll] } = await query(
        `SELECT id FROM batch_enrollments WHERE user_id=$1 AND batch_id=$2`, [userId, batch.id]
      );
      if (existingEnroll) {
        errors.push({ row: rowNum, email: s.email, error: `Already enrolled in batch "${s.batch_code}"` });
        skipped++; continue;
      }

      const enrNum = s.enrollment_number?.trim() || `ENR-${Date.now()}-${rowNum}`;
      await query(
        `INSERT INTO batch_enrollments
           (batch_id, user_id, enrollment_number, status, current_semester, enrolled_at, enrolled_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [batch.id, userId, enrNum, s.status || 'active',
         parseInt(s.current_semester, 10) || 1,
         s.enrolled_at ? new Date(s.enrolled_at) : new Date(),
         req.user.id]
      );
      imported++;
    } catch (err) {
      errors.push({ row: rowNum, email: s.email || '—', error: err.message });
      skipped++;
    }
  }

  ok(res, { imported, skipped, errors, total: students.length });
}));

// ─── POST /students/bulk-action ───────────────────────────────────────────────
router.post('/bulk-action', requirePermission('students', 'update'), asyncHandler(async (req, res) => {
  const { ids, action } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: 'No student IDs provided' });
  }
  // Values must match the enrollment_status enum: active | withdrawn | completed | suspended.
  // 'archive'/'remove' is a soft-delete → 'withdrawn' (recoverable via 'restore').
  const STATUS_MAP = {
    activate: 'active',
    restore: 'active',
    suspend: 'suspended',
    deactivate: 'withdrawn',
    archive: 'withdrawn',
    remove: 'withdrawn',
    delete: 'withdrawn',
  };
  const newStatus = STATUS_MAP[action];
  if (!newStatus) {
    return res.status(400).json({ success: false, message: `Unknown action: ${action}` });
  }
  // Course scope: only touch enrollments in the active course so a bulk action
  // never leaks across courses.
  const params = [newStatus, ...ids];
  let courseFrag = '';
  const courseId = req.courseId || req.query.course_id;
  if (courseId) {
    params.push(courseId);
    courseFrag = `AND batch_id IN (SELECT id FROM batches WHERE course_id=$${params.length})`;
  }
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
  const { rowCount } = await query(
    `UPDATE batch_enrollments SET status=$1 WHERE user_id IN (${placeholders}) ${courseFrag}`,
    params
  );
  ok(res, { updated: rowCount, status: newStatus });
}));

// ─── DELETE /students/:id — soft-delete (archive) a scholar's enrollment ───────
// Sets the enrollment status to 'withdrawn' (recoverable). Scoped to the active
// course so a scholar enrolled elsewhere keeps that enrollment.
router.delete('/:id', requirePermission('students', 'update'), asyncHandler(async (req, res) => {
  const courseId = req.courseId || req.query.course_id;
  const params = [req.params.id];
  let courseFrag = '';
  if (courseId) {
    params.push(courseId);
    courseFrag = `AND batch_id IN (SELECT id FROM batches WHERE course_id=$${params.length})`;
  }
  const { rowCount } = await query(
    `UPDATE batch_enrollments SET status='withdrawn' WHERE user_id=$1 ${courseFrag}`,
    params
  );
  if (!rowCount) return notFound(res, 'Enrollment not found for this scholar');
  ok(res, { archived: rowCount }, 'Scholar archived');
}));

// ─── GET /students ────────────────────────────────────────────────────────────
router.get('/', requirePermission('students', 'read'), asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const course_id = req.courseId || req.query.course_id;
  const batch_id = req.batchId || req.query.batch_id;
  const { params, where } = buildWhere({ ...req.query, course_id, batch_id });

  // Own-scope: students can only see their own enrollment record
  let ownFrag = '';
  if (isOwnScope(req)) {
    params.push(req.user.id);
    ownFrag = `AND be.user_id=$${params.length}`;
  }

  const scopeFrag = scopeBatchSQL(req, 'be.batch_id');

  // Per-kind submission-status filters for the Scholars list — "which scholars
  // have a pending progress report", "haven't submitted an assignment yet",
  // etc. Value is one of: not_submitted | submitted | under_review |
  // needs_revision | approved | rejected. `merged_into_id IS NULL` matches
  // the "current, non-superseded" convention used everywhere else in this
  // file (see submissions_count/progress_reports_count/milestones_count above).
  const submissionStatusFrag = (queryKey, submissionType) => {
    const status = req.query[queryKey];
    if (!status) return '';
    if (status === 'not_submitted') {
      return `AND NOT EXISTS (SELECT 1 FROM submissions ss WHERE ss.student_user_id = be.user_id AND ss.submission_type = '${submissionType}' AND ss.status <> 'draft' AND ss.merged_into_id IS NULL)`;
    }
    params.push(status);
    return `AND EXISTS (SELECT 1 FROM submissions ss WHERE ss.student_user_id = be.user_id AND ss.submission_type = '${submissionType}' AND ss.status = $${params.length} AND ss.merged_into_id IS NULL)`;
  };
  const progressReportFrag = submissionStatusFrag('progress_report_status', 'progress_report');
  const assignmentFrag     = submissionStatusFrag('assignment_status', 'assignment');
  const milestoneFrag      = submissionStatusFrag('milestone_status', 'target');
  const submissionFilterFrag = [progressReportFrag, assignmentFrag, milestoneFrag].filter(Boolean).join(' ');

  const scopedWhere = where
    ? `${where} ${ownFrag} ${scopeFrag} ${submissionFilterFrag}`
    : (ownFrag || scopeFrag || submissionFilterFrag) ? `WHERE TRUE ${ownFrag} ${scopeFrag} ${submissionFilterFrag}` : '';

  // Onboarding-document completeness — how many of the 11 CV/identity/research
  // slots this scholar has uploaded (see student-profile.service.js#ALL_SLOTS).
  // A real Postgres bind requires the parameter count to match the prepared
  // statement's placeholder count EXACTLY (unlike some drivers, extra values
  // are a hard error, not silently ignored) — so this extra param goes into
  // its own array for the SELECT query only. `params` itself stays untouched
  // for the totals COUNT query below, whose SQL text never references it.
  const selectParams = [...params, ONBOARDING_DOC_SLOTS];
  const docSlotsParam = selectParams.length;

  const { rows: data } = await query(
    `SELECT be.*, u.first_name, u.middle_name, u.last_name, u.email, u.phone, u.avatar_url,
            b.name as batch_name, b.code as batch_code, c.name as course_name,
            (SELECT COUNT(*) FROM submissions s2 WHERE s2.student_user_id = be.user_id
               AND s2.status <> 'draft' AND s2.merged_into_id IS NULL)::int
              AS submissions_count,
            (SELECT COUNT(*) FROM videos v2
               WHERE v2.owner_user_id = be.user_id AND v2.slot = ANY($${docSlotsParam}::text[]))::int
              AS documents_count,
            (SELECT COUNT(*) FROM submissions s2 WHERE s2.student_user_id = be.user_id
               AND s2.submission_type = 'progress_report' AND s2.status <> 'draft' AND s2.merged_into_id IS NULL)::int
              AS progress_reports_count,
            (SELECT COUNT(*) FROM submissions s2 WHERE s2.student_user_id = be.user_id
               AND s2.submission_type = 'assignment' AND s2.status <> 'draft' AND s2.merged_into_id IS NULL)::int
              AS assignments_count,
            (SELECT json_build_object(
               'submitted', COUNT(*) FILTER (WHERE ms.status IS NOT NULL),
               'approved',  COUNT(*) FILTER (WHERE ms.status = 'approved'),
               'total', COUNT(*)
             )
             FROM targets t2
             LEFT JOIN LATERAL (
               SELECT status FROM submissions
               WHERE target_id = t2.id AND student_user_id = be.user_id
                 AND status <> 'draft' AND merged_into_id IS NULL
               ORDER BY created_at DESC LIMIT 1
             ) ms ON TRUE
             WHERE t2.batch_id = be.batch_id)
              AS milestones_count,
            (spd.onboarding_completed_at IS NOT NULL) AS onboarding_completed
     FROM batch_enrollments be
     JOIN users u ON u.id=be.user_id
     JOIN batches b ON b.id=be.batch_id
     JOIN courses c ON c.id=b.course_id
     LEFT JOIN student_profile_details spd ON spd.user_id = be.user_id
     ${scopedWhere} ORDER BY be.enrolled_at DESC LIMIT $${selectParams.length+1} OFFSET $${selectParams.length+2}`,
    [...selectParams, limit, offset]
  );
  const { rows: [{ total }] } = await query(
    `SELECT COUNT(*) AS total FROM batch_enrollments be
     JOIN users u ON u.id=be.user_id
     JOIN batches b ON b.id=be.batch_id
     ${scopedWhere}`, params
  );
  res.json({ success: true, data, pagination: buildPaginationMeta(parseInt(total), page, limit) });
}));

// ─── GET /students/:id ────────────────────────────────────────────────────────
router.get('/:id', requirePermission('students', 'read'), asyncHandler(async (req, res) => {
  // Own-scope: students can only read their own profile
  if (isOwnScope(req) && req.user.id !== req.params.id) {
    return res.status(403).json({ success: false, code: 'PERMISSION_DENIED', message: 'You can only view your own profile.' });
  }
  const { rows: [student] } = await query(
    `SELECT u.id, u.email, u.first_name, u.middle_name, u.last_name, u.phone, u.avatar_url,
            be.enrollment_number, be.status, be.current_semester, be.enrolled_at, be.batch_id,
            b.name as batch_name, b.code as batch_code, c.name as course_name
     FROM users u
     JOIN batch_enrollments be ON be.user_id=u.id
     JOIN batches b ON b.id=be.batch_id
     JOIN courses c ON c.id=b.course_id
     WHERE u.id=$1`, [req.params.id]
  );
  if (!student) return notFound(res, 'Student not found');

  const [guides, progressSummary, feesSummary] = await Promise.all([
    query(
      `SELECT sg.*, u.first_name, u.last_name, u.email FROM student_guides sg
       JOIN users u ON u.id=sg.guide_user_id WHERE sg.student_user_id=$1 AND sg.is_active=true`, [req.params.id]
    ),
    query(
      `SELECT COUNT(*) as total, SUM(completion_percentage)/NULLIF(COUNT(*),0) as avg_pct
       FROM progress_reports WHERE student_user_id=$1`, [req.params.id]
    ),
    query(
      `SELECT SUM(amount) as total_due,
              SUM(CASE WHEN status='paid' THEN amount ELSE 0 END) as total_paid
       FROM fees WHERE student_user_id=$1`, [req.params.id]
    ),
  ]);

  ok(res, {
    ...student,
    guides:           guides.rows,
    progress_summary: progressSummary.rows[0],
    fees_summary:     feesSummary.rows[0],
  });
}));

// ─── POST /students/:id/guides ────────────────────────────────────────────────
router.post('/:id/guides', requirePermission('students', 'update'), validate(assignGuideSchema), asyncHandler(async (req, res) => {
  const { guide_user_id, guide_type, batch_id } = req.body;
  const { rows: [guide] } = await query(
    `INSERT INTO student_guides (student_user_id,guide_user_id,batch_id,guide_type,assigned_by)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (student_user_id,guide_user_id,batch_id,guide_type) DO UPDATE SET is_active=true, assigned_at=NOW()
     RETURNING *`,
    [req.params.id, guide_user_id, batch_id, guide_type, req.user.id]
  );
  created(res, guide, 'Guide assigned');
}));

// ─── V4 onboarding — personal-info fields + profile-scoped documents ─────────
// Own-scope (students) can only touch their own profile — enforced inside the
// controller (assertOwnerOrBroaderScope), same pattern as GET /students/:id
// above. Uses the `students` permission module — students already hold
// students:read/students:update at 'own' scope (see db/seed.js).

/**
 * @swagger
 * /students/{userId}/profile-details:
 *   get:
 *     tags: [Students]
 *     summary: Get onboarding personal-info fields (student_profile_details + users basics)
 *   put:
 *     tags: [Students]
 *     summary: Upsert onboarding personal-info fields
 */
const profileDetailsSchema = z.object({
  first_name: z.string().min(1).max(255).optional(),
  middle_name: z.string().max(255).optional().nullable(),
  last_name: z.string().min(1).max(255).optional(),
  phone: z.string().max(32).optional(),
  father_name: z.string().max(255).optional(),
  mother_name: z.string().max(255).optional(),
  date_of_birth: z.string().optional(), // ISO date string, e.g. "1998-04-12"
  postal_address: z.string().optional(),
  blood_group: z.string().max(8).optional(),
  // Working title of the scholar's research/thesis. 200-word cap enforced
  // both here (defense in depth) and client-side (live counter/block).
  title: z.string().max(3000).optional().nullable()
    .refine((v) => !v || v.trim().split(/\s+/).filter(Boolean).length <= 200, {
      message: 'Title must be 200 words or fewer',
    }),
});

router.get('/:userId/profile-details', requirePermission('students', 'read'), profileCtrl.getProfileDetails);
router.put('/:userId/profile-details', requirePermission('students', 'update'), validate(profileDetailsSchema), profileCtrl.putProfileDetails);

/**
 * @swagger
 * /students/{userId}/documents:
 *   get:
 *     tags: [Students]
 *     summary: State of all 11 onboarding document/upload slots
 */
router.get('/:userId/documents', requirePermission('students', 'read'), profileCtrl.listDocuments);

/**
 * @swagger
 * /students/{userId}/documents/{slot}:
 *   post:
 *     tags: [Students]
 *     summary: Upload (or replace) the file for one onboarding document slot
 */
router.post('/:userId/documents/:slot', requirePermission('students', 'update'), profileCtrl.uploadDocument);

/**
 * @swagger
 * /students/{userId}/documents/{slot}/file:
 *   get:
 *     tags: [Students]
 *     summary: Preview or download one uploaded onboarding document
 *     parameters:
 *       - in: query
 *         name: mode
 *         schema: { type: string, enum: [preview, download] }
 */
router.get('/:userId/documents/:slot/file', requirePermission('students', 'read'), profileCtrl.streamDocument);

/**
 * @swagger
 * /students/{userId}/official-letters:
 *   get:
 *     tags: [Students]
 *     summary: State of the 3 official-letter slots (admission confirmation, guide approval, title approval)
 */
router.get('/:userId/official-letters', requirePermission('students', 'read'), profileCtrl.listOfficialLetters);

/**
 * @swagger
 * /students/{userId}/official-letters/{slot}:
 *   post:
 *     tags: [Students]
 *     summary: Upload (or replace) one official letter — staff only, never self-service
 */
router.post('/:userId/official-letters/:slot', requireRole('admin', 'coordinator'), profileCtrl.uploadOfficialLetter);

/**
 * @swagger
 * /students/{userId}/official-letters/{slot}/file:
 *   get:
 *     tags: [Students]
 *     summary: Preview (inline) or download an official letter
 */
router.get('/:userId/official-letters/:slot/file', requirePermission('students', 'read'), profileCtrl.streamOfficialLetter);

/**
 * @swagger
 * /students/{userId}/onboarding-status:
 *   get:
 *     tags: [Students]
 *     summary: Onboarding completeness (drives the login gate) — stamps onboarding_completed_at server-side when complete
 */
router.get('/:userId/onboarding-status', requirePermission('students', 'read'), profileCtrl.getOnboardingStatus);

/**
 * @swagger
 * /students/{userId}/onboarding-skip:
 *   patch:
 *     tags: [Students]
 *     summary: Admin toggle — let this one scholar into the app without finishing onboarding
 */
router.patch('/:userId/onboarding-skip', requireRole('admin', 'coordinator'), profileCtrl.setOnboardingSkip);

export default router;
