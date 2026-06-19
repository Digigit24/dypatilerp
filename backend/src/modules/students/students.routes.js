import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission, scopeBatchSQL, isOwnScope } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, notFound } from '../../utils/response.js';
import { query } from '../../config/database.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';

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

// ─── GET /students/export ─────────────────────────────────────────────────────
router.get('/export', requirePermission('students', 'read'), asyncHandler(async (req, res) => {
  const course_id = req.courseId || req.query.course_id;
  const batch_id = req.batchId || req.query.batch_id;
  const { params, where } = buildWhere({ ...req.query, course_id, batch_id });

  const { rows } = await query(
    `SELECT u.first_name, u.last_name, u.email, u.phone,
            be.user_id,
            be.enrollment_number, be.status, be.current_semester, be.enrolled_at,
            b.name  AS batch_name,  b.code AS batch_code,
            c.name  AS course_name
     FROM batch_enrollments be
     JOIN users u   ON u.id  = be.user_id
     JOIN batches b ON b.id  = be.batch_id
     JOIN courses c ON c.id  = b.course_id
     ${where}
     ORDER BY be.enrolled_at DESC`,
    params
  );

  const HEADERS = [
    'First Name', 'Last Name', 'Email', 'Phone',
    'Enrollment Number', 'Batch Name', 'Batch Code', 'Course',
    'Status', 'Semester', 'Enrolled Date',
  ];

  const dataRows = rows.map((r) => [
    r.first_name, r.last_name, r.email, r.phone || '',
    r.enrollment_number || '', r.batch_name, r.batch_code, r.course_name,
    r.status, r.current_semester || 1,
    r.enrolled_at ? new Date(r.enrolled_at).toISOString().split('T')[0] : '',
  ]);

  const csv = toCSV([HEADERS, ...dataRows]);
  const filename = `students-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.send('﻿' + csv);
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
  const scopedWhere = where
    ? `${where} ${ownFrag} ${scopeFrag}`
    : (ownFrag || scopeFrag) ? `WHERE TRUE ${ownFrag} ${scopeFrag}` : '';

  const { rows: data } = await query(
    `SELECT be.*, u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
            b.name as batch_name, b.code as batch_code, c.name as course_name
     FROM batch_enrollments be
     JOIN users u ON u.id=be.user_id
     JOIN batches b ON b.id=be.batch_id
     JOIN courses c ON c.id=b.course_id
     ${scopedWhere} ORDER BY be.enrolled_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
    [...params, limit, offset]
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
    `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url,
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

export default router;
