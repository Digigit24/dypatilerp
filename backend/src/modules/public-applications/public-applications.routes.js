import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { publicApplicationSchema } from './public-applications.schema.js';
import * as ctrl from './public-applications.controller.js';

const router = Router();

/**
 * @swagger
 * /public/applications:
 *   post:
 *     tags: [Public Applications]
 *     summary: Submit a public application for a configured program (e.g. "dlitt")
 *     security: []
 *     description: >
 *       The client sends only { program, applicant }. course_id/batch_id are
 *       resolved server-side from the trusted `public_application_targets`
 *       app_settings entry and re-verified against the courses/batches
 *       tables — the client can never choose them directly.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [program, applicant]
 *             properties:
 *               program:   { type: string, example: dlitt }
 *               applicant: { type: object }
 *     responses:
 *       201:
 *         description: Application submitted
 *       400:
 *         description: Validation failed
 *       409:
 *         description: Duplicate application for this program
 *       503:
 *         description: Program not currently accepting applications
 */
router.post('/', validate(publicApplicationSchema), ctrl.submit);

export default router;
