import { Router } from 'express';
import { query } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, notFound } from '../../utils/response.js';
import { ensureCycle } from '../progress-reports/cycles.service.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission, requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import * as ctrl from './batches.controller.js';
import * as letterCtrl from '../students/admission-letters.controller.js';
import { createBatchSchema, updateBatchSchema } from './batches.schema.js';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /batches:
 *   get:
 *     tags: [Batches]
 *     summary: List batches (filterable by course_id, status)
 *     parameters:
 *       - in: query
 *         name: course_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [upcoming, active, completed] }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated batch list
 */
router.get('/', requirePermission('batches', 'read'), ctrl.list);

/**
 * @swagger
 * /batches/{id}:
 *   get:
 *     tags: [Batches]
 *     summary: Get batch by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Batch details with enrollment count
 */
router.get('/:id', requirePermission('batches', 'read'), ctrl.getOne);

/**
 * @swagger
 * /batches/{id}/students:
 *   get:
 *     tags: [Batches]
 *     summary: Get all students enrolled in a batch
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Paginated enrolled students list
 */
router.get('/:id/students', requirePermission('students', 'read'), ctrl.students);

/**
 * @swagger
 * /batches/{id}/stats:
 *   get:
 *     tags: [Batches]
 *     summary: Get aggregated stats for a batch (fees, progress, submissions)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Batch statistics
 */
router.get('/:id/stats', requirePermission('dashboard', 'read'), ctrl.stats);

/**
 * @swagger
 * /batches:
 *   post:
 *     tags: [Batches]
 *     summary: Create a new batch
 *     responses:
 *       201:
 *         description: Batch created
 */
router.post('/', requirePermission('batches', 'create'), validate(createBatchSchema), ctrl.create);

/**
 * @swagger
 * /batches/{id}:
 *   put:
 *     tags: [Batches]
 *     summary: Update a batch
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', requirePermission('batches', 'update'), validate(updateBatchSchema), ctrl.update);

/**
 * @swagger
 * /batches/{id}:
 *   delete:
 *     tags: [Batches]
 *     summary: Delete a batch
 *     responses:
 *       204:
 *         description: Deleted
 */
router.delete('/:id', requirePermission('batches', 'delete'), ctrl.remove);

/**
 * @swagger
 * /batches/{id}/approval-config:
 *   put:
 *     tags: [Batches]
 *     summary: Save the dynamic approval workflow configuration for a batch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [stages]
 *             properties:
 *               stages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name: { type: string }
 *                     type: { type: string, enum: [student_guide, specific_user, role] }
 *                     guide_type: { type: string, enum: [academic, industry] }
 *                     user_id: { type: string, format: uuid }
 *                     role: { type: string }
 *                     order_index: { type: integer }
 *     responses:
 *       200:
 *         description: Config saved
 */
router.put('/:id/approval-config', requirePermission('batches', 'update'), ctrl.updateApprovalConfig);


/**
 * POST /batches/:id/advance-semester
 * Closes V1 gap G-01 — until now nothing in the system ever wrote
 * batch_enrollments.current_semester after enrolment, so a 4-semester
 * programme was permanently stuck on Semester 1.
 *
 * Body: { to_semester?, student_user_ids?, due_date? }
 *   to_semester       defaults to current + 1
 *   student_user_ids  omit to advance the whole batch
 *
 * Also opens the progress-report cycle for the new semester, so the window a
 * scholar submits into can never be forgotten.
 */
router.post('/:id/advance-semester', requirePermission('batches', 'update'), asyncHandler(async (req, res) => {
  const batchId = req.params.id;
  const { rows: [batch] } = await query('SELECT id, name FROM batches WHERE id=$1', [batchId]);
  if (!batch) return notFound(res, 'Batch not found');

  const ids = Array.isArray(req.body.student_user_ids) && req.body.student_user_ids.length
    ? req.body.student_user_ids : null;

  // Warn (never block) about scholars with unfinished work in the semester
  // they are leaving — advancing is a human decision, not the system's.
  const { rows: warnings } = await query(
    `SELECT u.id AS student_user_id, u.first_name || ' ' || u.last_name AS scholar,
            be.current_semester,
            (SELECT COUNT(*) FROM targets t
              WHERE t.student_user_id=be.user_id AND t.semester=be.current_semester
                AND t.status <> 'completed')::int AS open_targets,
            (SELECT COUNT(*) FROM fees f
              WHERE f.student_user_id=be.user_id AND f.status IN ('pending','overdue'))::int AS unpaid_fees
     FROM batch_enrollments be JOIN users u ON u.id=be.user_id
     WHERE be.batch_id=$1 AND be.status='active'
       AND ($2::uuid[] IS NULL OR be.user_id = ANY($2::uuid[]))`,
    [batchId, ids]
  );

  const { rows: advanced } = await query(
    `UPDATE batch_enrollments
        SET current_semester = COALESCE($3, current_semester + 1)
      WHERE batch_id=$1 AND status='active'
        AND ($2::uuid[] IS NULL OR user_id = ANY($2::uuid[]))
      RETURNING user_id, current_semester`,
    [batchId, ids, req.body.to_semester ? Number(req.body.to_semester) : null]
  );

  // Open the window for whatever semester the batch now sits in.
  const semesters = [...new Set(advanced.map((r) => r.current_semester))];
  const cycles = [];
  for (const sem of semesters) {
    const c = await ensureCycle(batchId, sem, req.user.id, req.body.due_date || null);
    if (c) cycles.push(c);
  }

  ok(res, {
    advanced: advanced.length,
    semesters,
    cycles_opened: cycles.length,
    warnings: warnings.filter((w) => w.open_targets > 0 || w.unpaid_fees > 0),
  }, `Advanced ${advanced.length} scholar(s).`);
}));

// ─── Admission Letters (batch-scoped) ──────────────────────────────────────────
// Generated letters are saved via the exact same official-letter slot/folder
// mechanism as a manual upload (see admission-letter.service.js), so preview
// and download reuse the EXISTING GET /students/:userId/official-letters/
// admission_confirmation/file endpoint — no new preview route needed here.
// Gated with requireRole to match that existing upload endpoint's gate
// exactly, rather than the batches:* permission module.
router.get('/:id/admission-letters', requirePermission('students', 'read'), letterCtrl.getRoster);
router.post('/:id/admission-letters/generate-all', requireRole('admin', 'coordinator'), letterCtrl.generateAll);
router.get('/:id/admission-letters/generate-all/status', requirePermission('students', 'read'), letterCtrl.getGenerateAllStatus);
router.post('/:id/admission-letters/email-all', requireRole('admin', 'coordinator'), letterCtrl.emailAll);
router.get('/:id/admission-letters/email-all/status', requirePermission('students', 'read'), letterCtrl.getEmailAllStatus);
router.post('/:id/admission-letters/scholars/:userId/generate', requireRole('admin', 'coordinator'), letterCtrl.generateOne);
router.post('/:id/admission-letters/scholars/:userId/send-email', requireRole('admin', 'coordinator'), letterCtrl.emailOne);
router.post('/:id/admission-letters/publish-all', requireRole('admin', 'coordinator'), letterCtrl.publishAll);
router.post('/:id/admission-letters/publish', requireRole('admin', 'coordinator'), letterCtrl.publishSelected);
router.post('/:id/admission-letters/delete-drafts', requireRole('admin', 'coordinator'), letterCtrl.deleteAllDrafts);

export default router;
