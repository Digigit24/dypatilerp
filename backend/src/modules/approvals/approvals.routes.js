import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission, allowedBatchIds } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as svc from './approvals.service.js';
import { ok, notFound, forbidden, badRequest } from '../../utils/response.js';
import { query } from '../../config/database.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /approvals:
 *   get:
 *     tags: [Approvals]
 *     summary: List all approvals (filterable by submission_id, stage, status)
 *     parameters:
 *       - in: query
 *         name: submission_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: stage
 *         schema: { type: string, enum: [coordinator, academic_guide, industry_mentor] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, approved, rejected, needs_revision] }
 *     responses:
 *       200:
 *         description: Paginated approvals list
 */
router.get('/', requirePermission('approvals', 'read'), asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const filters = { ...req.query, limit, offset };
  // The app's course/batch picker sends X-Course-Id / X-Batch-Id (header wins
  // over any query param); scope the queue by it, AND-combined with RBAC below.
  if (req.courseId) filters.course_id = req.courseId;
  if (req.batchId)  filters.batch_id  = req.batchId;
  const ab = allowedBatchIds(req);
  if (ab) filters.allowed_batch_ids = ab;
  const { data, total } = await svc.listApprovals(filters);
  res.json({ success: true, data, pagination: buildPaginationMeta(total, page, limit) });
}));

/**
 * @swagger
 * /approvals/pending:
 *   get:
 *     tags: [Approvals]
 *     summary: Get approvals pending action for the current user (based on their role)
 *     responses:
 *       200:
 *         description: List of pending approval tasks
 */
router.get('/pending', requirePermission('approvals', 'read'), asyncHandler(async (req, res) => {
  const data = await svc.listPendingForUser(req.user.id, req.user.roles);
  ok(res, data);
}));

/**
 * @swagger
 * /approvals/{id}/action:
 *   post:
 *     tags: [Approvals]
 *     summary: Take action on an approval (approve / reject / request_revision)
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
 *             required: [action]
 *             properties:
 *               action: { type: string, enum: [approve, reject, request_revision] }
 *               comments: { type: string }
 *     responses:
 *       200:
 *         description: Action taken, submission status updated
 */
router.post('/:id/action', requirePermission('approvals', 'update'), asyncHandler(async (req, res) => {
  const { action, comments } = req.body;
  const result = await svc.takeAction(req.params.id, action, req.user.id, comments, req.user.roles);
  ok(res, result, 'Action recorded');
}));


/**
 * PATCH /approvals/:id/feedback
 * Autosave document-style feedback WITHOUT taking the stage action, so a
 * reviewer can write a page over two sittings and never lose it (SOP-V2 §M3).
 * Only the assigned reviewer, or a holder of the stage's role, may write.
 */
router.patch('/:id/feedback', requirePermission('approvals', 'update'), asyncHandler(async (req, res) => {
  const { rows: [ap] } = await query('SELECT * FROM approvals WHERE id=$1', [req.params.id]);
  if (!ap) return notFound(res, 'Review not found');
  const roles = req.user.roles || [];
  const authorized =
    ap.reviewer_user_id === req.user.id ||
    (ap.reviewer_user_id === null && ap.reviewer_role && roles.includes(ap.reviewer_role));
  if (!authorized) return forbidden(res, 'You are not the reviewer for this stage.');
  if (ap.status !== 'pending') return badRequest(res, 'This review has already been actioned.');

  const html = typeof req.body.feedback_html === 'string' ? req.body.feedback_html : '';
  // Keep `comments` as the plain-text mirror used by emails, lists and exports.
  const plain = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const { rows: [saved] } = await query(
    `UPDATE approvals SET feedback_html=$1, comments=$2, feedback_updated_at=NOW()
     WHERE id=$3 RETURNING id, feedback_updated_at`,
    [html, plain.slice(0, 5000) || null, req.params.id]
  );
  ok(res, saved, 'Feedback saved');
}));

export default router;
