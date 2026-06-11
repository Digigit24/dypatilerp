import { Router } from 'express';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import * as ctrl from './applicants.controller.js';
import {
  createApplicantSchema, updateApplicantStatusSchema,
  updateApplicantDetailsSchema, convertToStudentSchema, bulkConvertSchema,
} from './applicants.schema.js';

const router = Router();

/**
 * @swagger
 * /applicants:
 *   get:
 *     tags: [Applicants]
 *     summary: List applicants (filterable by course_id, status, search)
 *     parameters:
 *       - in: query
 *         name: course_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [submitted,test_pending,test_completed,shortlisted,rejected,enrolled] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated applicants list
 */
router.get('/', authenticate, requirePermission('applicants', 'read'), ctrl.list);

/**
 * @swagger
 * /applicants/{id}:
 *   get:
 *     tags: [Applicants]
 *     summary: Get applicant by ID
 *     responses:
 *       200:
 *         description: Applicant detail
 */
router.get('/:id', authenticate, requirePermission('applicants', 'read'), ctrl.getOne);

/**
 * @swagger
 * /applicants:
 *   post:
 *     tags: [Applicants]
 *     summary: Submit a new application (public endpoint)
 *     security: []
 *     responses:
 *       201:
 *         description: Application submitted
 */
router.post('/', optionalAuth, validate(createApplicantSchema), ctrl.create);

/**
 * @swagger
 * /applicants/{id}/status:
 *   put:
 *     tags: [Applicants]
 *     summary: Update applicant status (shortlist, reject, assign batch, etc.)
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
 *             required: [status]
 *             properties:
 *               status: { type: string }
 *               batch_id: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Status updated
 */
/**
 * @swagger
 * /applicants/{id}:
 *   put:
 *     tags: [Applicants]
 *     summary: Edit applicant personal/academic details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Applicant updated
 */
router.put('/:id', authenticate, requirePermission('applicants', 'update'),
  validate(updateApplicantDetailsSchema), ctrl.updateDetails);

router.put('/:id/status', authenticate, requirePermission('applicants', 'update'),
  validate(updateApplicantStatusSchema), ctrl.updateStatus);

/**
 * @swagger
 * /applicants/{id}/convert:
 *   post:
 *     tags: [Applicants]
 *     summary: Convert a shortlisted applicant to an enrolled student
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
 *             required: [batch_id]
 *             properties:
 *               batch_id: { type: string, format: uuid }
 *               enrollment_number: { type: string }
 *     responses:
 *       200:
 *         description: Converted to student
 */
router.post('/:id/convert', authenticate, requirePermission('applicants', 'update'),
  validate(convertToStudentSchema), ctrl.convertToStudent);

/**
 * @swagger
 * /applicants/bulk-convert:
 *   post:
 *     tags: [Applicants]
 *     summary: Bulk convert multiple applicants to students
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [applicant_ids, batch_id]
 *             properties:
 *               applicant_ids: { type: array, items: { type: string, format: uuid } }
 *               batch_id: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Bulk conversion results
 */
router.post('/bulk-convert', authenticate, requirePermission('applicants', 'update'),
  validate(bulkConvertSchema), ctrl.bulkConvert);

export default router;
