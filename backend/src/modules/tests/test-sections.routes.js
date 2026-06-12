import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, notFound } from '../../utils/response.js';
import { query } from '../../config/database.js';

const router = Router({ mergeParams: true }); // mergeParams for :testId

/**
 * GET /tests/:testId/sections
 * List all sections for a test, ordered
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT s.*, COUNT(q.id)::int AS question_count
     FROM test_sections s
     LEFT JOIN test_questions q ON q.section_id = s.id
     WHERE s.test_id = $1
     GROUP BY s.id
     ORDER BY s.order_index ASC`,
    [req.params.testId]
  );
  ok(res, rows);
}));

/**
 * POST /tests/:testId/sections
 * Create a new section
 */
router.post('/', authenticate, requirePermission('tests', 'update'), asyncHandler(async (req, res) => {
  const { title, description, order_index } = req.body;
  const { rows: [maxRow] } = await query(
    'SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM test_sections WHERE test_id = $1',
    [req.params.testId]
  );
  const { rows: [section] } = await query(
    `INSERT INTO test_sections (test_id, title, description, order_index)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.params.testId, title, description || null, order_index ?? maxRow.next]
  );
  created(res, section, 'Section created');
}));

/**
 * PATCH /tests/:testId/sections/:sectionId
 * Update section title/description/order
 */
router.patch('/:sectionId', authenticate, requirePermission('tests', 'update'), asyncHandler(async (req, res) => {
  const { title, description, order_index } = req.body;
  const { rows: [section] } = await query(
    `UPDATE test_sections SET
       title       = COALESCE($1, title),
       description = COALESCE($2, description),
       order_index = COALESCE($3, order_index)
     WHERE id = $4 AND test_id = $5 RETURNING *`,
    [title || null, description || null, order_index ?? null, req.params.sectionId, req.params.testId]
  );
  if (!section) return notFound(res, 'Section not found');

  // pick_count: how many questions to randomly serve from this section's bank.
  // Explicitly settable to null/0 = serve all questions.
  if (Object.prototype.hasOwnProperty.call(req.body, 'pick_count')) {
    const pc = parseInt(req.body.pick_count, 10);
    const value = Number.isFinite(pc) && pc > 0 ? pc : null;
    const { rows: [updated] } = await query(
      'UPDATE test_sections SET pick_count=$1 WHERE id=$2 AND test_id=$3 RETURNING *',
      [value, req.params.sectionId, req.params.testId]
    );
    return ok(res, updated);
  }

  ok(res, section);
}));

/**
 * DELETE /tests/:testId/sections/:sectionId
 * Delete a section (questions become section-less, not deleted)
 */
router.delete('/:sectionId', authenticate, requirePermission('tests', 'update'), asyncHandler(async (req, res) => {
  // Unlink questions instead of deleting them
  await query('UPDATE test_questions SET section_id = NULL WHERE section_id = $1', [req.params.sectionId]);
  await query('DELETE FROM test_sections WHERE id = $1 AND test_id = $2', [req.params.sectionId, req.params.testId]);
  res.status(204).send();
}));

/**
 * PUT /tests/:testId/sections/reorder
 * Bulk reorder: body = [{ id, order_index }, ...]
 */
router.put('/reorder', authenticate, requirePermission('tests', 'update'), asyncHandler(async (req, res) => {
  const items = req.body.sections || [];
  for (const { id, order_index } of items) {
    await query('UPDATE test_sections SET order_index=$1 WHERE id=$2 AND test_id=$3', [order_index, id, req.params.testId]);
  }
  ok(res, null, 'Sections reordered');
}));

export default router;
