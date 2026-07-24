import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate.js';
import { publicApplicationSchema } from './public-applications.schema.js';
import * as ctrl from './public-applications.controller.js';

const router = Router();

// ── Route-specific abuse protection ──────────────────────────────────────────
// Conservative, application-form-appropriate limit (a human fills this in once).
// Configurable via env with safe defaults; reuses the project's existing
// express-rate-limit dependency (same library/options style as the global
// limiter in app.js). Runs BEFORE validation/controller so a throttled request
// never reaches the service — no applicant is created and no notification fires.
const WINDOW_MS = Number(process.env.PUBLIC_APPLICATIONS_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 min
const MAX_REQ = Number(process.env.PUBLIC_APPLICATIONS_RATE_LIMIT_MAX) || 5;

export const publicApplicationLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQ,
  standardHeaders: true,
  legacyHeaders: false,
  // Safe, generic 429 — no internal limiter details leaked.
  handler: (req, res) => res.status(429).json({
    success: false,
    message: 'Too many application attempts. Please try again later.',
  }),
});

// Route-specific request-size guard. The global body parser (app.js) accepts up
// to 5mb; a public application form is tiny, so anything larger is rejected here
// with a safe 413 before the controller runs — the global cap still prevents
// truly enormous bodies from being buffered. Content-Length is checked without
// exposing the configured threshold.
const MAX_BODY_BYTES = Number(process.env.PUBLIC_APPLICATIONS_MAX_BODY_BYTES) || 16 * 1024; // 16kb

export const limitBodySize = (req, res, next) => {
  const len = Number(req.headers['content-length']);
  if (Number.isFinite(len) && len > MAX_BODY_BYTES) {
    return res.status(413).json({ success: false, message: 'Request payload too large.' });
  }
  next();
};

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
 *       tables — the client can never choose them directly. Rate limited and
 *       size limited.
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
 *       201: { description: Application submitted }
 *       400: { description: Validation failed / unexpected fields }
 *       409: { description: Duplicate application for this program }
 *       413: { description: Request payload too large }
 *       429: { description: Too many attempts }
 *       503: { description: Program not currently accepting applications }
 */
router.post('/', publicApplicationLimiter, limitBodySize, validate(publicApplicationSchema), ctrl.submit);

export default router;
