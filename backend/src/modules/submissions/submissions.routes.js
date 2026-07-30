import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission, requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import * as ctrl from './submissions.controller.js';
import { uploadSubmissionAttachment } from '../videos/videos.controller.js';
import { createSubmissionSchema, updateSubmissionSchema, createSubmissionOnBehalfSchema } from './submissions.schema.js';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /submissions:
 *   get:
 *     tags: [Submissions]
 *     summary: List submissions (students see only their own)
 *     parameters:
 *       - in: query
 *         name: batch_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [draft,submitted,under_review,approved,needs_revision,rejected] }
 *     responses:
 *       200:
 *         description: Paginated submissions
 */
router.get('/', requirePermission('submissions', 'read'), ctrl.list);

/**
 * @swagger
 * /submissions/{id}:
 *   get:
 *     tags: [Submissions]
 *     summary: Get submission with full approval chain
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Submission detail with approvals
 */
router.get('/:id', requirePermission('submissions', 'read'), ctrl.getOne);

/**
 * @swagger
 * /submissions:
 *   post:
 *     tags: [Submissions]
 *     summary: Create a new submission (draft)
 *     responses:
 *       201:
 *         description: Submission created as draft
 */
router.post('/', requirePermission('submissions', 'create'), validate(createSubmissionSchema), ctrl.create);

/**
 * @swagger
 * /submissions/on-behalf:
 *   post:
 *     tags: [Submissions]
 *     summary: Admin creates a progress-report draft on behalf of a scholar (owner = scholar)
 *     responses:
 *       201:
 *         description: Draft created, owned by the scholar
 */
router.post('/on-behalf', requireRole('admin'), validate(createSubmissionOnBehalfSchema), ctrl.createOnBehalf);

/**
 * @swagger
 * /submissions/{id}:
 *   put:
 *     tags: [Submissions]
 *     summary: Update a draft submission
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', requirePermission('submissions', 'update'), validate(updateSubmissionSchema), ctrl.update);

/**
 * @swagger
 * /submissions/{id}/submit:
 *   post:
 *     tags: [Submissions]
 *     summary: Submit a draft for review (creates coordinator → guide → mentor approval chain)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Submission sent for review
 */
router.post('/:id/submit', requirePermission('submissions', 'update'), ctrl.submit);

/**
 * @swagger
 * /submissions/{submissionId}/attachment:
 *   post:
 *     tags: [Submissions]
 *     summary: Server-proxied progress-report file upload (multipart, field "file")
 *     description: |
 *       The browser POSTs multipart/form-data to our own API; the backend streams
 *       the file to Zata server-side (no browser→Zata hop, no extra CORS). Records
 *       a private, submission-bound media row and appends the descriptor to
 *       file_urls. Authorized for the owning scholar or an admin (on-behalf).
 */
router.post('/:submissionId/attachment', requirePermission('submissions', 'create'), uploadSubmissionAttachment);

/**
 * @swagger
 * /submissions/{id}/submit-on-behalf:
 *   post:
 *     tags: [Submissions]
 *     summary: Admin submits a scholar's draft for review (owner stays the scholar)
 *     responses:
 *       200:
 *         description: Submission sent for review on behalf of the scholar
 */
router.post('/:id/submit-on-behalf', requireRole('admin'), ctrl.submitOnBehalf);

export default router;
