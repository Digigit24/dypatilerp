import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission, isOwnScope, allowedBatchIds } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, notFound, badRequest } from '../../utils/response.js';
import { query } from '../../config/database.js';
import * as svc from './fees.service.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';

const router = Router();
router.use(authenticate);

const createFeeSchema = z.object({
  batch_id: z.string().uuid(),
  student_user_id: z.string().uuid(),
  semester: z.number().int().min(1),
  amount: z.number().positive(),
  due_date: z.string().date(),
  description: z.string().optional(),
});

const paymentSchema = z.object({
  amount: z.number().positive(),
  payment_method: z.string().min(1),
  transaction_id: z.string().optional(),
  receipt_url: z.string().url().optional(),
  paid_at: z.string().datetime().optional(),
  notes: z.string().optional(),
});

/**
 * @swagger
 * /fees:
 *   get:
 *     tags: [Fees]
 *     summary: List fees (filter by batch_id, student_user_id, status)
 *     responses:
 *       200:
 *         description: Paginated fee records
 */
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get('/', requirePermission('fees', 'read'), asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  // X-Course-Id header takes precedence over query param
  const course_id = req.courseId || req.query.course_id;
  const filters = { ...req.query, course_id, limit, offset };
  if (isOwnScope(req) || req.user.roles.includes('student')) {
    filters.student_user_id = req.user.id;
  } else if (filters.student_user_id && !uuidRe.test(filters.student_user_id)) {
    return res.status(400).json({ success: false, message: 'Invalid student_user_id — must be a UUID' });
  }
  const ab = allowedBatchIds(req);
  if (ab) filters.allowed_batch_ids = ab;
  const { data, total } = await svc.listFees(filters);
  res.json({ success: true, data, pagination: buildPaginationMeta(total, page, limit) });
}));

/**
 * @swagger
 * /fees/{id}:
 *   get:
 *     tags: [Fees]
 *     summary: Get fee record with payment history
 *     responses:
 *       200:
 *         description: Fee detail
 */
router.get('/:id', requirePermission('fees', 'read'), asyncHandler(async (req, res) => {
  const fee = await svc.getFeeById(req.params.id);
  if (!fee) return res.status(404).json({ success: false, message: 'Not found' });
  ok(res, fee);
}));

/**
 * @swagger
 * /fees:
 *   post:
 *     tags: [Fees]
 *     summary: Create a fee record for a student
 *     responses:
 *       201:
 *         description: Fee created
 */
router.post('/', requirePermission('fees', 'create'), validate(createFeeSchema), asyncHandler(async (req, res) => {
  const fee = await svc.createFee(req.body);
  created(res, fee, 'Fee record created');
}));

/**
 * @swagger
 * /fees/{id}/payments:
 *   post:
 *     tags: [Fees]
 *     summary: Record a payment against a fee
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
 *             required: [amount, payment_method]
 *             properties:
 *               amount: { type: number }
 *               payment_method: { type: string }
 *               transaction_id: { type: string }
 *               receipt_url: { type: string, format: uri }
 *     responses:
 *       201:
 *         description: Payment recorded, fee status updated if fully paid
 */
router.post('/:id/payments', requirePermission('fees', 'update'), validate(paymentSchema), asyncHandler(async (req, res) => {
  const payment = await svc.recordPayment(req.params.id, req.body, req.user.id);
  created(res, payment, 'Payment recorded');
}));


/**
 * POST /fees/bulk
 * Closes V1 gap G-02 — bulkCreateFees() existed in the service but no route
 * exposed it, so 30 scholars x 4 semesters meant 120 fee rows created by hand.
 *
 * Body: { batch_id, semester, due_date, amount? }
 * The amount defaults to the course's fee_structure for that semester.
 * Idempotent: a scholar who already has a fee for this batch+semester is
 * skipped, never double-charged.
 */
router.post('/bulk', requirePermission('fees', 'create'), asyncHandler(async (req, res) => {
  const { batch_id, semester, due_date } = req.body;
  if (!batch_id || !semester || !due_date) {
    return badRequest(res, 'batch_id, semester and due_date are required');
  }
  const { rows: [batch] } = await query(
    `SELECT b.id, b.name, c.fee_structure FROM batches b
     JOIN courses c ON c.id = b.course_id WHERE b.id=$1`, [batch_id]
  );
  if (!batch) return notFound(res, 'Batch not found');

  const fromCourse = batch.fee_structure?.[String(semester)];
  const amount = req.body.amount != null ? Number(req.body.amount) : Number(fromCourse);
  if (!amount || Number.isNaN(amount)) {
    return badRequest(res,
      `No amount given and the course has no fee configured for semester ${semester}.`);
  }

  const { rows: created_rows } = await query(
    `INSERT INTO fees (batch_id, student_user_id, semester, amount, due_date, description)
     SELECT $1, be.user_id, $2, $3, $4, $5
       FROM batch_enrollments be
      WHERE be.batch_id=$1 AND be.status='active'
        AND NOT EXISTS (
          SELECT 1 FROM fees f
           WHERE f.batch_id=$1 AND f.student_user_id=be.user_id AND f.semester=$2)
     RETURNING id`,
    [batch_id, Number(semester), amount, due_date,
     req.body.description || `Semester ${semester} fee`]
  );

  const { rows: [{ total }] } = await query(
    `SELECT COUNT(*) AS total FROM batch_enrollments WHERE batch_id=$1 AND status='active'`,
    [batch_id]
  );
  const skipped = parseInt(total) - created_rows.length;
  created(res, {
    created: created_rows.length, skipped, amount,
    amount_source: req.body.amount != null ? 'request' : 'course fee structure',
  }, `Raised ${created_rows.length} fee(s) of ${amount} for semester ${semester}` +
     (skipped ? ` — ${skipped} scholar(s) already had one.` : '.'));
}));

export default router;
