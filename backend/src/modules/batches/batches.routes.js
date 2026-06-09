import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import * as ctrl from './batches.controller.js';
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

export default router;
