import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission, isOwnScope, allowedBatchIds } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/response.js';
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

export default router;
