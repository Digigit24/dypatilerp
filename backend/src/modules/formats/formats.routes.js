/**
 * Formats module — downloadable template files (PDF/DOCX/etc.) for students.
 * Files are stored through the existing media pipeline (videos table,
 * media_type=document) so upload, storage and secure download are reused.
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
 * GET /formats — list formats for a course (and optionally a batch).
 * Students see formats for their course where batch is NULL (course-wide)
 * or matches the given batch_id. Admins see everything for the course.
 */
router.get('/', asyncHandler(async (req, res) => {
  const course_id = req.courseId || req.query.course_id;
  const params = [];
  const conds = [];
  if (course_id) { params.push(course_id); conds.push(`f.course_id = $${params.length}`); }
  if (req.query.batch_id) {
    params.push(req.query.batch_id);
    conds.push(`(f.batch_id IS NULL OR f.batch_id = $${params.length})`);
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT f.*, b.name AS batch_name,
            m.object_key, m.file_size, m.mime_type, m.media_type,
            u.first_name || ' ' || u.last_name AS uploaded_by_name
     FROM formats f
     LEFT JOIN batches b ON b.id = f.batch_id
     LEFT JOIN videos  m ON m.id = f.media_id
     LEFT JOIN users   u ON u.id = f.created_by
     ${where}
     ORDER BY f.created_at DESC`,
    params
  );
  ok(res, rows);
}));

/**
 * POST /formats — register a format (file already uploaded via /videos/upload
 * and registered via POST /videos; pass the resulting media_id here).
 */
router.post('/', requirePermission('formats', 'create'), asyncHandler(async (req, res) => {
  const { course_id, batch_id, title, description, media_id } = req.body;
  if (!title?.trim()) return res.status(400).json({ success: false, message: 'Title is required' });
  if (!media_id)      return res.status(400).json({ success: false, message: 'media_id is required (upload the file first)' });
  const { rows: [row] } = await query(
    `INSERT INTO formats (course_id, batch_id, title, description, media_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [course_id || req.courseId || null, batch_id || null, title.trim(), description?.trim() || null, media_id, req.user.id]
  );
  created(res, row, 'Format added');
}));

/** PATCH /formats/:id — edit title/description/batch */
router.patch('/:id', requirePermission('formats', 'update'), asyncHandler(async (req, res) => {
  const { title, description, batch_id } = req.body;
  const { rows: [row] } = await query(
    `UPDATE formats SET
       title       = COALESCE($1, title),
       description = COALESCE($2, description),
       batch_id    = $3,
       updated_at  = NOW()
     WHERE id = $4 RETURNING *`,
    [title?.trim() || null, description?.trim() ?? null, batch_id || null, req.params.id]
  );
  if (!row) return notFound(res, 'Format not found');
  ok(res, row, 'Format updated');
}));

/** DELETE /formats/:id — removes the format AND its underlying media file */
router.delete('/:id', requirePermission('formats', 'delete'), asyncHandler(async (req, res) => {
  const { rows: [row] } = await query('DELETE FROM formats WHERE id=$1 RETURNING media_id', [req.params.id]);
  if (!row) return notFound(res, 'Format not found');
  if (row.media_id) {
    await query('DELETE FROM videos WHERE id=$1', [row.media_id]).catch(() => {});
  }
  res.status(204).send();
}));

export default router;
