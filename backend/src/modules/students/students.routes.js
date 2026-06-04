import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
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

/**
 * @swagger
 * /students:
 *   get:
 *     tags: [Students]
 *     summary: List enrolled students (filter by batch_id, status, search)
 *     parameters:
 *       - in: query
 *         name: batch_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, withdrawn, completed, suspended] }
 *     responses:
 *       200:
 *         description: Paginated students list
 */
router.get('/', requirePermission('students', 'read'), asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const params = [];
  const conds = [];
  if (req.query.batch_id) { params.push(req.query.batch_id); conds.push(`be.batch_id=$${params.length}`); }
  if (req.query.status) { params.push(req.query.status); conds.push(`be.status=$${params.length}`); }
  if (req.query.search) {
    params.push(`%${req.query.search}%`);
    conds.push(`(u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const { rows: data } = await query(
    `SELECT be.*, u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
            b.name as batch_name, b.code as batch_code, c.name as course_name
     FROM batch_enrollments be
     JOIN users u ON u.id=be.user_id
     JOIN batches b ON b.id=be.batch_id
     JOIN courses c ON c.id=b.course_id
     ${where} ORDER BY be.enrolled_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
    [...params, limit, offset]
  );
  const { rows: [{ total }] } = await query(`SELECT COUNT(*) AS total FROM batch_enrollments be ${where}`, params);
  res.json({ success: true, data, pagination: buildPaginationMeta(parseInt(total), page, limit) });
}));

/**
 * @swagger
 * /students/{id}:
 *   get:
 *     tags: [Students]
 *     summary: Get student detail by user ID (includes submissions, progress, guides)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Student profile detail
 */
router.get('/:id', requirePermission('students', 'read'), asyncHandler(async (req, res) => {
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
      `SELECT COUNT(*) as total, SUM(completion_percentage)/COUNT(*) as avg_pct FROM progress_reports WHERE student_user_id=$1`, [req.params.id]
    ),
    query(
      `SELECT SUM(amount) as total_due, SUM(CASE WHEN status='paid' THEN amount ELSE 0 END) as total_paid FROM fees WHERE student_user_id=$1`, [req.params.id]
    ),
  ]);

  ok(res, {
    ...student,
    guides: guides.rows,
    progress_summary: progressSummary.rows[0],
    fees_summary: feesSummary.rows[0],
  });
}));

/**
 * @swagger
 * /students/{id}/guides:
 *   post:
 *     tags: [Students]
 *     summary: Assign a guide (academic or industry) to a student
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
 *             required: [guide_user_id, guide_type, batch_id]
 *             properties:
 *               guide_user_id: { type: string, format: uuid }
 *               guide_type: { type: string, enum: [academic, industry] }
 *               batch_id: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Guide assigned
 */
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
