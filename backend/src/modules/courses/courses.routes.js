import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission, requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import * as ctrl from './courses.controller.js';
import { createCourseSchema, updateCourseSchema } from './courses.schema.js';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /courses:
 *   get:
 *     tags: [Courses]
 *     summary: List all courses
 *     parameters:
 *       - in: query
 *         name: is_active
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated course list
 */
router.get('/', requirePermission('courses', 'read'), ctrl.list);

/**
 * @swagger
 * /courses/{id}:
 *   get:
 *     tags: [Courses]
 *     summary: Get a course by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Course details
 *       404:
 *         description: Not found
 */
router.get('/:id', requirePermission('courses', 'read'), ctrl.getOne);

/**
 * @swagger
 * /courses/{id}/dashboard:
 *   get:
 *     tags: [Courses]
 *     summary: Get centralised dashboard for a course (all batches aggregated)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Aggregated course stats across all batches
 */
router.get('/:id/dashboard', requirePermission('dashboard', 'read'), ctrl.dashboard);

/**
 * @swagger
 * /courses:
 *   post:
 *     tags: [Courses]
 *     summary: Create a new course
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, code]
 *             properties:
 *               name: { type: string }
 *               code: { type: string }
 *               description: { type: string }
 *               duration_months: { type: integer }
 *               max_students_per_batch: { type: integer }
 *               fee_structure: { type: object }
 *     responses:
 *       201:
 *         description: Course created
 */
router.post('/', requirePermission('courses', 'create'), validate(createCourseSchema), ctrl.create);

/**
 * @swagger
 * /courses/{id}:
 *   put:
 *     tags: [Courses]
 *     summary: Update a course
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated course
 */
router.put('/:id', requirePermission('courses', 'update'), validate(updateCourseSchema), ctrl.update);

/**
 * @swagger
 * /courses/{id}:
 *   delete:
 *     tags: [Courses]
 *     summary: Delete a course
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deleted
 */
router.delete('/:id', requireRole('admin'), ctrl.remove);

export default router;
