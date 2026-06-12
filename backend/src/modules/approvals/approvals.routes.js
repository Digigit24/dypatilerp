import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission, allowedBatchIds } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as svc from './approvals.service.js';
import { ok } from '../../utils/response.js';
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
  const result = await svc.takeAction(req.params.id, action, req.user.id, comments);
  ok(res, result, 'Action recorded');
}));

export default router;
