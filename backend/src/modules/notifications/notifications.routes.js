import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/response.js';
import { query } from '../../config/database.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';

const router = Router();
router.use(authenticate);

const sendSchema = z.object({
  type: z.enum(['approval','revision','zoom_link','announcement','report_due','fee_due','test_scheduled']),
  title: z.string().min(1).max(500),
  message: z.string().min(1),
  recipient_ids: z.array(z.string().uuid()).min(1),
  course_id: z.string().uuid().optional(),
  batch_id: z.string().uuid().optional(),
  data: z.record(z.any()).optional().default({}),
});

/**
 * @swagger
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Get notifications for the current user
 *     parameters:
 *       - in: query
 *         name: is_read
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Paginated notifications
 */
router.get('/', requirePermission('notifications', 'read'), asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const isRead = req.query.is_read;
  const params = [req.user.id];
  let extra = '';
  if (isRead !== undefined) { params.push(isRead === 'true'); extra = `AND nr.is_read=$${params.length}`; }
  const { rows: data } = await query(
    `SELECT n.*, nr.is_read, nr.read_at FROM notifications n
     JOIN notification_recipients nr ON nr.notification_id=n.id
     WHERE nr.user_id=$1 ${extra} ORDER BY n.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
    [...params, limit, offset]
  );
  const { rows: [{ total }] } = await query(
    `SELECT COUNT(*) AS total FROM notification_recipients WHERE user_id=$1`, [req.user.id]
  );
  res.json({ success: true, data, pagination: buildPaginationMeta(parseInt(total), page, limit) });
}));

/**
 * @swagger
 * /notifications:
 *   post:
 *     tags: [Notifications]
 *     summary: Send a notification to specific users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, title, message, recipient_ids]
 *             properties:
 *               type: { type: string }
 *               title: { type: string }
 *               message: { type: string }
 *               recipient_ids: { type: array, items: { type: string, format: uuid } }
 *               batch_id: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Notification sent
 */
router.post('/', requirePermission('notifications', 'create'), validate(sendSchema), asyncHandler(async (req, res) => {
  const { type, title, message, recipient_ids, course_id, batch_id, data } = req.body;
  const { rows: [notif] } = await query(
    `INSERT INTO notifications (type,title,message,course_id,batch_id,data,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [type, title, message, course_id||null, batch_id||null, JSON.stringify(data), req.user.id]
  );
  for (const userId of recipient_ids) {
    await query(
      `INSERT INTO notification_recipients (notification_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [notif.id, userId]
    );
  }
  created(res, { ...notif, recipient_count: recipient_ids.length }, 'Notification sent');
}));

/**
 * @swagger
 * /notifications/{id}/read:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark a notification as read
 *     responses:
 *       200:
 *         description: Marked as read
 */
router.put('/:id/read', requirePermission('notifications', 'read'), asyncHandler(async (req, res) => {
  await query(
    `UPDATE notification_recipients SET is_read=true, read_at=NOW()
     WHERE notification_id=$1 AND user_id=$2`,
    [req.params.id, req.user.id]
  );
  ok(res, null, 'Marked as read');
}));

/**
 * @swagger
 * /notifications/mark-all-read:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read for the current user
 *     responses:
 *       200:
 *         description: All marked as read
 */
router.put('/mark-all-read', requirePermission('notifications', 'read'), asyncHandler(async (req, res) => {
  await query(
    `UPDATE notification_recipients SET is_read=true, read_at=NOW() WHERE user_id=$1 AND is_read=false`,
    [req.user.id]
  );
  ok(res, null, 'All marked as read');
}));

export default router;
