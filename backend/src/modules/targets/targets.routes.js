/**
 * Targets module (formerly "milestones").
 *
 * Compulsory items a scholar submits against, approved by ONE approver
 * (approval_config.target — coordinator by default). Completion is derived
 * from approvals, never typed in.
 *
 * See documentation/SOP-V2.html §M4.
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission, scopeBatchSQL, isOwnScope, allowedBatchIds } from '../../middleware/rbac.js';
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
 *   Staff:   ?batch_id= &semester= &student_user_id=
 *   Scholar: automatically scoped to their own targets
 */
router.get('/', requirePermission('targets', 'read'), asyncHandler(async (req, res) => {
  const { limit, offset } = getPagination(req.query);
  const filters = {
    batch_id: req.query.batch_id,
    semester: req.query.semester,
    status: req.query.status,
    student_user_id: req.query.student_user_id,
    course_id: req.courseId || req.query.course_id,
    limit, offset,
  };
  // A scholar only ever sees their own targets, whatever they ask for.
  if (isOwnScope(req) || req.user.roles.includes('student')) {
    filters.student_user_id = req.user.id;
    delete filters.course_id;
  }
  const ab = allowedBatchIds(req);
  if (ab) filters.allowed_batch_ids = ab;

  const { data, total } = await svc.listTargets(filters);
  res.json({ success: true, data, total });
}));

/** GET /targets/progress-summary?student_user_id= — derived completion %. */
router.get('/progress-summary', requirePermission('targets', 'read'), asyncHandler(async (req, res) => {
  const studentId = (isOwnScope(req) || req.user.roles.includes('student'))
    ? req.user.id
    : (req.query.student_user_id || req.user.id);
  ok(res, await svc.getProgressSummary(studentId));
}));

router.get('/:id', requirePermission('targets', 'read'), asyncHandler(async (req, res) => {
  const target = await svc.getTargetById(req.params.id);
  if (!target) return notFound(res, 'Target not found');
  if (req.user.roles.includes('student') && target.student_user_id !== req.user.id) {
    return notFound(res, 'Target not found');
  }
  ok(res, target);
}));

/** POST /targets — one target for one scholar. */
router.post('/', requirePermission('targets', 'create'), validate(createTargetSchema),
  asyncHandler(async (req, res) => {
    created(res, await svc.createTarget(req.body, req.user.id), 'Target created');
  }));

/**
 * POST /targets/bulk — one set of targets applied to a whole batch.
 * This is the action that makes targets usable: 6 targets × 30 scholars in one
 * call instead of 180 separate creates. Closes V1 gap G-05.
 */
router.post('/bulk', requirePermission('targets', 'create'), validate(bulkCreateTargetSchema),
  asyncHandler(async (req, res) => {
    const result = await svc.bulkCreateTargets(req.body, req.user.id);
    if (!result.students) return badRequest(res, 'No actively-enrolled scholars in this batch.');
    created(res, result,
      `Created ${result.created} target(s) across ${result.students} scholar(s)` +
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
