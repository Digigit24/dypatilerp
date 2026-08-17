/**
 * Targets module (formerly "milestones").
 *
 * Batch-scoped definitions a coordinator creates once per batch+semester —
 * scholars submit against them, approved by ONE approver
 * (approval_config.target — coordinator by default). Completion is derived
 * from submissions, never typed in. Mirrors the assignments module's shape
 * (definition vs. per-scholar submission) by design.
 *
 * See documentation/SOP-V2.html §M4.
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission, allowedBatchIds } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, notFound, badRequest, noContent } from '../../utils/response.js';
import { getPagination } from '../../utils/pagination.js';
import * as svc from './targets.service.js';
import { createTargetSchema, updateTargetSchema, bulkCreateTargetSchema } from './targets.schema.js';

const router = Router();
router.use(authenticate);

/**
 * GET /targets
 *   Scholar: ?mine=1 (or no filters at all) → every target for MY batch +
 *            my submission status
 *   Staff:   ?student_user_id= → that scholar's targets + their submission
 *            status (e.g. viewing one scholar's profile)
 *   Staff:   ?batch_id= &semester= (no student_user_id) → definitions +
 *            aggregate submission stats across the batch
 */
router.get('/', requirePermission('targets', 'read'), asyncHandler(async (req, res) => {
  const isStudent = req.user.roles.includes('student');
  const studentParam = isStudent ? req.user.id : req.query.student_user_id;
  if (req.query.mine === '1' || studentParam) {
    return ok(res, await svc.listMyTargets(studentParam || req.user.id));
  }

  const { limit, offset } = getPagination(req.query);
  const filters = {
    batch_id: req.query.batch_id,
    semester: req.query.semester,
    course_id: req.courseId || req.query.course_id,
    limit, offset,
  };
  const ab = allowedBatchIds(req);
  if (ab) filters.allowed_batch_ids = ab;

  const { data, total } = await svc.listTargets(filters);
  res.json({ success: true, data, total });
}));

/** GET /targets/progress-summary?student_user_id= — derived completion %. */
router.get('/progress-summary', requirePermission('targets', 'read'), asyncHandler(async (req, res) => {
  const studentId = req.user.roles.includes('student')
    ? req.user.id
    : (req.query.student_user_id || req.user.id);
  ok(res, await svc.getProgressSummary(studentId));
}));

router.get('/:id', requirePermission('targets', 'read'), asyncHandler(async (req, res) => {
  const target = await svc.getTargetById(req.params.id);
  if (!target) return notFound(res, 'Target not found');
  ok(res, target);
}));

/** GET /targets/:id/submissions — admin: every scholar's submission against one target. */
router.get('/:id/submissions', requirePermission('targets', 'read'), asyncHandler(async (req, res) => {
  ok(res, await svc.getTargetSubmissions(req.params.id));
}));

/** POST /targets — one target definition. */
router.post('/', requirePermission('targets', 'create'), validate(createTargetSchema),
  asyncHandler(async (req, res) => {
    created(res, await svc.createTarget(req.body, req.user.id), 'Target created');
  }));

/**
 * POST /targets/bulk — a set of target definitions for one batch+semester in
 * one call. One row per target NAME — not per scholar (closes V1 gap G-05
 * the right way: 6 targets across 30 scholars is 6 rows, scholars submit
 * against the shared definition).
 */
router.post('/bulk', requirePermission('targets', 'create'), validate(bulkCreateTargetSchema),
  asyncHandler(async (req, res) => {
    const result = await svc.bulkCreateTargets(req.body, req.user.id);
    created(res, result,
      `Created ${result.created} target(s)` +
      (result.skipped ? ` — ${result.skipped} already existed and were skipped.` : '.'));
  }));

router.patch('/:id', requirePermission('targets', 'update'), validate(updateTargetSchema),
  asyncHandler(async (req, res) => {
    const target = await svc.updateTarget(req.params.id, req.body);
    if (!target) return notFound(res, 'Target not found');
    ok(res, target, 'Target updated');
  }));

/** DELETE /targets/:id — refused once a scholar has submitted against it. */
router.delete('/:id', requirePermission('targets', 'delete'), asyncHandler(async (req, res) => {
  const result = await svc.deleteTarget(req.params.id);
  if (result.reason) return badRequest(res, result.reason);
  if (!result.deleted) return notFound(res, 'Target not found');
  noContent(res);
}));

export default router;
