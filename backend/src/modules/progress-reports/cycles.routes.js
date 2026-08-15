/**
 * Progress-report cycle routes. Mounted at /progress-reports/cycles.
 * See SOP-V2 §M3.
 */
import { Router } from 'express';
import { requirePermission, allowedBatchIds, isOwnScope } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, notFound, badRequest } from '../../utils/response.js';
import * as svc from './cycles.service.js';

const router = Router();

/** GET /progress-reports/cycles — staff view of every window. */
router.get('/', requirePermission('progress_reports', 'read'), asyncHandler(async (req, res) => {
  const filters = {
    batch_id: req.query.batch_id,
    semester: req.query.semester,
    status: req.query.status,
    course_id: req.courseId || req.query.course_id,
  };
  const ab = allowedBatchIds(req);
  if (ab) filters.allowed_batch_ids = ab;
  ok(res, await svc.listCycles(filters));
}));

/**
 * GET /progress-reports/cycles/mine — the scholar's current window, with both
 * slots resolved and a can_submit flag so the UI never has to work it out.
 */
router.get('/mine', requirePermission('progress_reports', 'read'), asyncHandler(async (req, res) => {
  const cycle = await svc.getMyCycle(req.user.id);
  if (!cycle) return ok(res, null, 'No open progress-report window for your current semester.');
  ok(res, cycle);
}));

router.get('/:id', requirePermission('progress_reports', 'read'), asyncHandler(async (req, res) => {
  const cycle = await svc.getCycleById(req.params.id);
  if (!cycle) return notFound(res, 'Cycle not found');
  ok(res, cycle);
}));

/** GET /progress-reports/cycles/:id/roster — who has and has not submitted. */
router.get('/:id/roster', requirePermission('progress_reports', 'read'), asyncHandler(async (req, res) => {
  const cycle = await svc.getCycleById(req.params.id);
  if (!cycle) return notFound(res, 'Cycle not found');
  ok(res, await svc.getCycleRoster(req.params.id));
}));

/**
 * POST /progress-reports/cycles — normally unnecessary (cycles are created
 * automatically on batch creation and semester advance) but available for a
 * coordinator who needs an extra window.
 */
router.post('/', requirePermission('progress_reports', 'create'), asyncHandler(async (req, res) => {
  const { batch_id, semester, due_date } = req.body;
  if (!batch_id || !semester) return badRequest(res, 'batch_id and semester are required');
  const cycle = await svc.ensureCycle(batch_id, Number(semester), req.user.id, due_date || null);
  created(res, cycle, 'Cycle ready');
}));

/** PATCH /progress-reports/cycles/:id — usually just the due date. */
router.patch('/:id', requirePermission('progress_reports', 'update'), asyncHandler(async (req, res) => {
  const cycle = await svc.updateCycle(req.params.id, req.body);
  if (!cycle) return notFound(res, 'Cycle not found');
  ok(res, cycle, 'Cycle updated');
}));

export default router;
