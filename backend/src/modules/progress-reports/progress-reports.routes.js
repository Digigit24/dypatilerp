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

const createSchema = z.object({
  batch_id: z.string().uuid(),
  student_user_id: z.string().uuid(),
  semester: z.number().int().min(1),
  module_name: z.string().min(1).max(255),
  description: z.string().optional(),
  due_date: z.string().date().optional(),
});

const updateSchema = z.object({
  status: z.enum(['not_started','in_progress','completed']).optional(),
  completion_percentage: z.number().int().min(0).max(100).optional(),
  description: z.string().optional(),
  completed_at: z.string().datetime().optional(),
});

/**
 * @swagger
 * /progress-reports:
 *   get:
 *     tags: [Progress Reports]
 *     summary: List progress reports (filter by batch_id, student_user_id, semester)
 *     responses:
 *       200:
 *         description: Paginated progress reports
 */
router.get('/', requirePermission('progress_reports', 'read'), asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  // X-Course-Id header takes precedence over query param
  const course_id = req.courseId || req.query.course_id;
  const params = [];
  const conds = [];
  if (course_id)                 { params.push(course_id);              conds.push(`b.course_id=$${params.length}`); }
  if (req.query.batch_id)        { params.push(req.query.batch_id);     conds.push(`pr.batch_id=$${params.length}`); }
  if (req.query.student_user_id) { params.push(req.query.student_user_id); conds.push(`pr.student_user_id=$${params.length}`); }
  if (req.query.semester)        { params.push(req.query.semester);     conds.push(`pr.semester=$${params.length}`); }
  if (req.user.roles.includes('student')) { params.push(req.user.id); conds.push(`pr.student_user_id=$${params.length}`); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  // Always JOIN batches b so b.course_id filter works in WHERE
  const { rows: data } = await query(
    `SELECT pr.*, u.first_name, u.last_name, b.name as batch_name, b.course_id
     FROM progress_reports pr
     JOIN users u ON u.id=pr.student_user_id
     JOIN batches b ON b.id=pr.batch_id
     ${where} ORDER BY pr.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
    [...params, limit, offset]
  );
  const { rows: [{ total }] } = await query(
    `SELECT COUNT(*) AS total FROM progress_reports pr
     JOIN batches b ON b.id=pr.batch_id
     ${where}`, params
  );
  res.json({ success: true, data, pagination: buildPaginationMeta(parseInt(total), page, limit) });
}));

/**
 * @swagger
 * /progress-reports:
 *   post:
 *     tags: [Progress Reports]
 *     summary: Create a progress report entry for a student module
 *     responses:
 *       201:
 *         description: Progress report created
 */
router.post('/', requirePermission('progress_reports', 'create'), validate(createSchema), asyncHandler(async (req, res) => {
  const { rows: [r] } = await query(
    `INSERT INTO progress_reports (batch_id,student_user_id,semester,module_name,description,due_date)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.body.batch_id, req.body.student_user_id, req.body.semester, req.body.module_name,
     req.body.description||null, req.body.due_date||null]
  );
  created(res, r, 'Progress report created');
}));

/**
 * @swagger
 * /progress-reports/{id}:
 *   put:
 *     tags: [Progress Reports]
 *     summary: Update progress status and completion percentage
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', requirePermission('progress_reports', 'update'), validate(updateSchema), asyncHandler(async (req, res) => {
  const fields = [];
  const params = [];
  const { status, completion_percentage, description, completed_at } = req.body;
  if (status !== undefined) { params.push(status); fields.push(`status=$${params.length}`); }
  if (completion_percentage !== undefined) { params.push(completion_percentage); fields.push(`completion_percentage=$${params.length}`); }
  if (description !== undefined) { params.push(description); fields.push(`description=$${params.length}`); }
  if (completed_at !== undefined) { params.push(completed_at); fields.push(`completed_at=$${params.length}`); }
  if (!fields.length) return notFound(res, 'Nothing to update');
  params.push(req.params.id);
  const { rows: [r] } = await query(
    `UPDATE progress_reports SET ${fields.join(',')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`, params
  );
  if (!r) return notFound(res, 'Not found');
  ok(res, r, 'Updated');
}));

export default router;
