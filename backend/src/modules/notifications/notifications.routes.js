import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/response.js';
import { query } from '../../config/database.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { sendNotificationEmail } from '../email/email.service.js';
import { runScheduledScans, processDueQueue } from './notify.service.js';

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

// Map notification type → email event key
const TYPE_TO_EVENT = {
  announcement:   'announcement',
  zoom_link:      'zoom_link',
  report_due:     'deadline_overdue',
  fee_due:        'fee_due',
  approval:       'approval_stage_opened',
  revision:       'submission_needs_revision',
  test_scheduled: 'announcement',
};

// ─── GET /notifications ───────────────────────────────────────────────────────
// Admin/coordinator: returns all notifications for the active course.
// Students: returns notifications received by them.
router.get('/', requirePermission('notifications', 'read'), asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const isStudent = req.user.roles?.includes('student');
  // X-Course-Id header takes precedence over query param
  const course_id = req.courseId || req.query.course_id;

  if (isStudent) {
    // Student view: show only notifications addressed to them
    const params = [req.user.id];
    let extra = '';
    const isRead = req.query.is_read;
    if (isRead !== undefined) {
      params.push(isRead === 'true');
      extra = `AND nr.is_read=$${params.length}`;
    }
    const { rows: data } = await query(
      `SELECT n.*, nr.is_read, nr.read_at FROM notifications n
       JOIN notification_recipients nr ON nr.notification_id=n.id
       WHERE nr.user_id=$1 ${extra} ORDER BY n.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
      [...params, limit, offset]
    );
    const { rows: [{ total }] } = await query(
      `SELECT COUNT(*) AS total FROM notification_recipients WHERE user_id=$1`, [req.user.id]
    );
    return res.json({ success: true, data, pagination: buildPaginationMeta(parseInt(total), page, limit) });
  }

  // Admin / coordinator view: list sent notifications filtered by course
  const params = [];
  const conds = [];
  if (course_id) { params.push(course_id); conds.push(`n.course_id=$${params.length}`); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const { rows: data } = await query(
    `SELECT n.*, COUNT(nr.user_id) AS recipient_count
     FROM notifications n
     LEFT JOIN notification_recipients nr ON nr.notification_id=n.id
     ${where} GROUP BY n.id ORDER BY n.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
    [...params, limit, offset]
  );
  const { rows: [{ total }] } = await query(
    `SELECT COUNT(*) AS total FROM notifications n ${where}`, params
  );
  res.json({ success: true, data, pagination: buildPaginationMeta(parseInt(total), page, limit) });
}));

// ─── POST /notifications ──────────────────────────────────────────────────────
router.post('/', requirePermission('notifications', 'create'), validate(sendSchema), asyncHandler(async (req, res) => {
  const { type, title, message, recipient_ids, course_id, batch_id, data } = req.body;

  // 1. Persist in-app notification
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

  // 2. Fire transactional emails (non-blocking — failures don't break the response)
  const eventKey = TYPE_TO_EVENT[type] || 'announcement';
  setImmediate(async () => {
    try {
      // Fetch recipient user details for email
      if (recipient_ids.length === 0) return;
      const placeholders = recipient_ids.map((_, i) => `$${i + 1}`).join(', ');
      const { rows: users } = await query(
        `SELECT id, email, first_name, last_name FROM users WHERE id IN (${placeholders}) AND email IS NOT NULL`,
        recipient_ids
      );
      for (const user of users) {
        await sendNotificationEmail(eventKey, user, {
          title,
          message,
          zoomLink: data?.zoom_link,
          ...data,
        }, course_id || null);
      }
    } catch (err) {
      console.error('[notifications] Email dispatch error:', err.message);
    }
  });

  created(res, { ...notif, recipient_count: recipient_ids.length }, 'Notification sent');
}));

// ─── PUT /notifications/mark-all-read ─────────────────────────────────────────
// IMPORTANT: must be declared BEFORE /:id to avoid route shadowing
router.put('/mark-all-read', requirePermission('notifications', 'read'), asyncHandler(async (req, res) => {
  await query(
    `UPDATE notification_recipients SET is_read=true, read_at=NOW() WHERE user_id=$1 AND is_read=false`,
    [req.user.id]
  );
  ok(res, null, 'All marked as read');
}));

// ─── PUT /notifications/:id/read ──────────────────────────────────────────────
router.put('/:id/read', requirePermission('notifications', 'read'), asyncHandler(async (req, res) => {
  await query(
    `UPDATE notification_recipients SET is_read=true, read_at=NOW()
     WHERE notification_id=$1 AND user_id=$2`,
    [req.params.id, req.user.id]
  );
  ok(res, null, 'Marked as read');
}));

// ─── GET /notifications/queue ─────────────────────────────────────────────────
// Recent automated (event-driven) emails for a course — admin/coordinator only.
router.get('/queue', requirePermission('notifications', 'create'), asyncHandler(async (req, res) => {
  const course_id = req.courseId || req.query.course_id;
  const params = [];
  let where = '';
  if (course_id) { params.push(course_id); where = 'WHERE course_id=$1'; }
  const { rows } = await query(
    `SELECT id, event_key, course_id, recipient, status, attempts, error, run_at, sent_at, created_at
     FROM notification_queue ${where}
     ORDER BY created_at DESC LIMIT 50`, params
  );
  ok(res, rows);
}));

// ─── POST /notifications/run-scans ────────────────────────────────────────────
// "Run checks now" — immediately runs the fee-due / deadline-overdue scans
// (ignores the configured hour; dedupe still prevents double emails).
router.post('/run-scans', requirePermission('notifications', 'create'), asyncHandler(async (req, res) => {
  const course_id = req.body?.course_id || req.courseId || null;
  const summary = await runScheduledScans({ force: true, courseId: course_id });
  // Drain whatever was just queued so results are visible immediately
  const drained = await processDueQueue(50);
  ok(res, { ...summary, delivered_now: drained.sent ?? 0 }, 'Scheduled checks executed');
}));

export default router;
