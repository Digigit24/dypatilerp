/**
 * Assignments module.
 * Admins/coordinators define per-batch assignments (mandatory or optional).
 * Students see their batch's assignments and submit exactly ONE submission per
 * assignment. Approval depth is decided at submit time:
 *   mandatory  → full 3-layer chain (or the batch's custom approval_config)
 *   optional   → single coordinator approval
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission, scopeBatchSQL } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, notFound } from '../../utils/response.js';
import { query } from '../../config/database.js';

const router = Router();
router.use(authenticate);

/**
 * GET /assignments
 *  Admin view:   ?batch_id=… (course from header) → all assignments + submission stats
 *  Student view: ?mine=1 → published assignments for MY batch + my submission status
 */
router.get('/', requirePermission('assignments', 'read'), asyncHandler(async (req, res) => {
  if (req.query.mine === '1') {
    // Resolve the student's batch(es) from enrollments
    const { rows } = await query(
      `SELECT a.*, b.name AS batch_name,
              s.id     AS my_submission_id,
              s.status AS my_submission_status,
              s.submitted_at AS my_submitted_at
       FROM assignments a
       JOIN batch_enrollments be ON be.batch_id = a.batch_id AND be.user_id = $1
       LEFT JOIN batches b ON b.id = a.batch_id
       LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_user_id = $1
       WHERE a.is_published = TRUE
       ORDER BY a.semester ASC, a.due_date ASC NULLS LAST, a.created_at ASC`,
      [req.user.id]
    );
    return ok(res, rows);
  }

  const course_id = req.courseId || req.query.course_id;
  const params = [];
  const conds = [];
  if (course_id)         { params.push(course_id);         conds.push(`a.course_id = $${params.length}`); }
  if (req.query.batch_id){ params.push(req.query.batch_id); conds.push(`a.batch_id = $${params.length}`); }
  const scopeFrag = scopeBatchSQL(req, 'a.batch_id');
  const where = (conds.length ? `WHERE ${conds.join(' AND ')}` : 'WHERE TRUE') + ` ${scopeFrag}`;
  const { rows } = await query(
    `SELECT a.*, b.name AS batch_name, b.code AS batch_code,
            (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id)::int AS submission_count,
            (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id AND s.status = 'approved')::int AS approved_count,
            (SELECT COUNT(*) FROM batch_enrollments be WHERE be.batch_id = a.batch_id)::int AS student_count
     FROM assignments a
     LEFT JOIN batches b ON b.id = a.batch_id
     ${where}
     ORDER BY a.semester ASC, a.due_date ASC NULLS LAST, a.created_at DESC`,
    params
  );
  ok(res, rows);
}));

/** POST /assignments — create */
router.post('/', requirePermission('assignments', 'create'), asyncHandler(async (req, res) => {
  const b = req.body;
  if (!b.title?.trim())  return res.status(400).json({ success: false, message: 'Title is required' });
  if (!b.batch_id)       return res.status(400).json({ success: false, message: 'batch_id is required' });
  const { rows: [row] } = await query(
    `INSERT INTO assignments (course_id, batch_id, title, description, semester, due_date, is_mandatory, is_published, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [b.course_id || req.courseId || null, b.batch_id, b.title.trim(), b.description?.trim() || null,
     Number(b.semester) || 1, b.due_date || null,
     b.is_mandatory !== false, b.is_published !== false, req.user.id]
  );
  created(res, row, 'Assignment created');
}));

/** PATCH /assignments/:id — edit */
router.patch('/:id', requirePermission('assignments', 'update'), asyncHandler(async (req, res) => {
  const b = req.body;
  const { rows: [row] } = await query(
    `UPDATE assignments SET
       title        = COALESCE($1, title),
       description  = COALESCE($2, description),
       semester     = COALESCE($3, semester),
       due_date     = $4,
       is_mandatory = COALESCE($5, is_mandatory),
       is_published = COALESCE($6, is_published),
       batch_id     = COALESCE($7, batch_id),
       updated_at   = NOW()
     WHERE id = $8 RETURNING *`,
    [b.title?.trim() || null, b.description?.trim() ?? null,
     b.semester !== undefined ? Number(b.semester) : null,
     b.due_date !== undefined ? (b.due_date || null) : null,
     typeof b.is_mandatory === 'boolean' ? b.is_mandatory : null,
     typeof b.is_published === 'boolean' ? b.is_published : null,
     b.batch_id || null, req.params.id]
  );
  if (!row) return notFound(res, 'Assignment not found');
  ok(res, row, 'Assignment updated');
}));

/** DELETE /assignments/:id — submissions keep existing (assignment_id set NULL by FK) */
router.delete('/:id', requirePermission('assignments', 'delete'), asyncHandler(async (req, res) => {
  await query('DELETE FROM assignments WHERE id=$1', [req.params.id]);
  res.status(204).send();
}));

/** GET /assignments/:id/submissions — admin: all submissions for one assignment */
router.get('/:id/submissions', requirePermission('assignments', 'read'), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT s.*, u.first_name, u.last_name, u.email
     FROM submissions s
     JOIN users u ON u.id = s.student_user_id
     WHERE s.assignment_id = $1
     ORDER BY s.submitted_at DESC NULLS LAST`,
    [req.params.id]
  );
  ok(res, rows);
}));

export default router;
