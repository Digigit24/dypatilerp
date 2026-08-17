import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission, allowedBatchIds } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as svc from './approvals.service.js';
import { ok, notFound, forbidden, badRequest } from '../../utils/response.js';
import { query } from '../../config/database.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';
import { IncomingForm } from 'formidable';
import { unlink, open } from 'fs/promises';
import * as s3 from '../../services/s3.js';
import * as videoSvc from '../videos/videos.service.js';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /approvals:
 *   get:
 *     tags: [Approvals]
 *     summary: List all approvals (filterable by submission_id, stage, status)
 *     parameters:
 *       - in: query
 *         name: submission_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: stage
 *         schema: { type: string, enum: [coordinator, academic_guide, industry_mentor] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, approved, rejected, needs_revision] }
 *     responses:
 *       200:
 *         description: Paginated approvals list
 */
router.get('/', requirePermission('approvals', 'read'), asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const filters = { ...req.query, limit, offset };
  // The app's course/batch picker sends X-Course-Id / X-Batch-Id (header wins
  // over any query param); scope the queue by it, AND-combined with RBAC below.
  if (req.courseId) filters.course_id = req.courseId;
  if (req.batchId)  filters.batch_id  = req.batchId;
  const ab = allowedBatchIds(req);
  if (ab) filters.allowed_batch_ids = ab;
  const { data, total } = await svc.listApprovals(filters);
  res.json({ success: true, data, pagination: buildPaginationMeta(total, page, limit) });
}));

/**
 * @swagger
 * /approvals/pending:
 *   get:
 *     tags: [Approvals]
 *     summary: Get approvals pending action for the current user (based on their role)
 *     responses:
 *       200:
 *         description: List of pending approval tasks
 */
router.get('/pending', requirePermission('approvals', 'read'), asyncHandler(async (req, res) => {
  const data = await svc.listPendingForUser(req.user.id, req.user.roles);
  ok(res, data);
}));

/**
 * @swagger
 * /approvals/{id}/action:
 *   post:
 *     tags: [Approvals]
 *     summary: Take action on an approval (approve / reject / request_revision)
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
 *             required: [action]
 *             properties:
 *               action: { type: string, enum: [approve, reject, request_revision] }
 *               comments: { type: string }
 *     responses:
 *       200:
 *         description: Action taken, submission status updated
 */
router.post('/:id/action', requirePermission('approvals', 'update'), asyncHandler(async (req, res) => {
  const { action, comments } = req.body;
  const result = await svc.takeAction(req.params.id, action, req.user.id, comments, req.user.roles);
  ok(res, result, 'Action recorded');
}));


/**
 * PATCH /approvals/:id/feedback
 * Autosave document-style feedback WITHOUT taking the stage action, so a
 * reviewer can write a page over two sittings and never lose it (SOP-V2 §M3).
 * Only the assigned reviewer, or a holder of the stage's role, may write.
 */
router.patch('/:id/feedback', requirePermission('approvals', 'update'), asyncHandler(async (req, res) => {
  const { rows: [ap] } = await query('SELECT * FROM approvals WHERE id=$1', [req.params.id]);
  if (!ap) return notFound(res, 'Review not found');
  const roles = req.user.roles || [];
  const authorized =
    ap.reviewer_user_id === req.user.id ||
    (ap.reviewer_user_id === null && ap.reviewer_role && roles.includes(ap.reviewer_role));
  if (!authorized) return forbidden(res, 'You are not the reviewer for this stage.');
  if (ap.status !== 'pending') return badRequest(res, 'This review has already been actioned.');

  const html = typeof req.body.feedback_html === 'string' ? req.body.feedback_html : '';
  // Keep `comments` as the plain-text mirror used by emails, lists and exports.
  const plain = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const { rows: [saved] } = await query(
    `UPDATE approvals SET feedback_html=$1, comments=$2, feedback_updated_at=NOW()
     WHERE id=$3 RETURNING id, feedback_updated_at`,
    [html, plain.slice(0, 5000) || null, req.params.id]
  );
  ok(res, saved, 'Feedback saved');
}));

/**
 * POST /approvals/:id/feedback-attachment
 * Attach a supporting document to this approval stage's feedback — same
 * reviewer-authorization rule as PATCH /feedback, and same verify-before-
 * write discipline as every other upload path in this codebase (CLAUDE.md
 * §4): upload to Zata, HEAD-verify, THEN write the DB row.
 */
const FEEDBACK_MAX_BYTES = 25 * 1024 * 1024;
const FEEDBACK_MIME_BY_EXT = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  png: ['image/png'], jpg: ['image/jpeg'], jpeg: ['image/jpeg'], webp: ['image/webp'],
};
const FEEDBACK_EXT_FAMILY = { pdf: 'pdf', docx: 'zip', doc: 'ole', png: 'png', jpg: 'jpg', jpeg: 'jpg', webp: 'webp' };
const sniffFeedbackFamily = (buf) => {
  if (buf.length >= 5 && buf.slice(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b) return 'zip';
  if (buf.length >= 4 && buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) return 'ole';
  if (buf.length >= 8 && buf[0] === 0x89 && buf.slice(1, 4).toString('latin1') === 'PNG') return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length >= 12 && buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
};

router.post('/:id/feedback-attachment', requirePermission('approvals', 'update'), asyncHandler(async (req, res) => {
  if (!s3.isConfigured()) return res.status(503).json({ success: false, message: 'File storage is not configured.' });
  const { rows: [ap] } = await query('SELECT * FROM approvals WHERE id=$1', [req.params.id]);
  if (!ap) return notFound(res, 'Review not found');
  const roles = req.user.roles || [];
  const authorized =
    ap.reviewer_user_id === req.user.id ||
    (ap.reviewer_user_id === null && ap.reviewer_role && roles.includes(ap.reviewer_role));
  if (!authorized) return forbidden(res, 'You are not the reviewer for this stage.');
  if (ap.status !== 'pending') return badRequest(res, 'This review has already been actioned.');

  const form = new IncomingForm({ maxFileSize: FEEDBACK_MAX_BYTES, maxFiles: 1, keepExtensions: true });
  let files;
  try {
    ({ files } = await new Promise((resolve, reject) =>
      form.parse(req, (err, f, fi) => (err ? reject(err) : resolve({ fields: f, files: fi })))
    ));
  } catch (err) {
    const tooBig = /maxFileSize|maxTotalFileSize|biggerThan/i.test(err?.message || '') || err?.code === 1009;
    return badRequest(res, tooBig ? 'File exceeds the 25MB limit' : 'Upload failed — please try again');
  }

  const file = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!file) return badRequest(res, 'No file uploaded (field name must be "file")');
  const cleanup = async () => { if (file?.filepath) await unlink(file.filepath).catch(() => {}); };

  try {
    const origName = file.originalFilename || 'feedback';
    const ext = (origName.split('.').pop() || '').toLowerCase();
    const declaredMime = file.mimetype || '';
    const size = file.size || 0;

    if (size <= 0 || size > FEEDBACK_MAX_BYTES) { await cleanup(); return badRequest(res, 'File exceeds the 25MB limit'); }
    if (!FEEDBACK_MIME_BY_EXT[ext]) { await cleanup(); return badRequest(res, 'Only PDF, DOC/DOCX, PNG, JPEG or WEBP files are allowed.'); }
    if (!(FEEDBACK_MIME_BY_EXT[ext] || []).includes(declaredMime)) { await cleanup(); return badRequest(res, 'File type does not match its contents.'); }
    const fh = await open(file.filepath, 'r');
    const head = Buffer.alloc(12);
    try { await fh.read(head, 0, 12, 0); } finally { await fh.close(); }
    if (sniffFeedbackFamily(head) !== FEEDBACK_EXT_FAMILY[ext]) { await cleanup(); return badRequest(res, 'File content does not match its type'); }

    const safe = origName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    const objectKey = `feedback/${req.params.id}/${Date.now()}-${safe}`;

    await s3.uploadFile(objectKey, file.filepath, declaredMime, size);
    try { await s3.headObject(objectKey); }
    catch (e) {
      return res.status(502).json({ success: false, message: 'Upload could not be verified in storage — please retry.', detail: e.message });
    }

    const media = await svc.addFeedbackAttachment({
      approval_id: req.params.id, title: origName.replace(/\.[^.]+$/, ''),
      object_key: objectKey, file_size: size, mime_type: declaredMime,
    }, req.user.id);
    ok(res, media, 'Feedback document uploaded');
  } finally {
    await cleanup();
  }
}));

export default router;
