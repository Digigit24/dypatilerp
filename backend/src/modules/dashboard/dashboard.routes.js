import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { query } from '../../config/database.js';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /dashboard/admin:
 *   get:
 *     tags: [Dashboard]
 *     summary: Admin/coordinator global dashboard stats
 *     responses:
 *       200:
 *         description: Aggregated platform KPIs
 */
router.get('/admin', requirePermission('dashboard', 'read'), asyncHandler(async (req, res) => {
  const [applicants, students, submissions, tests, fees, courses, batches] = await Promise.all([
    query(`SELECT COUNT(*), status FROM applicants GROUP BY status`),
    query(`SELECT COUNT(*) FROM batch_enrollments WHERE status='active'`),
    query(`SELECT COUNT(*), status FROM submissions GROUP BY status`),
    query(`SELECT COUNT(*), status FROM tests GROUP BY status`),
    query(`SELECT SUM(amount) as total_due, SUM(CASE WHEN status='paid' THEN amount ELSE 0 END) as total_paid FROM fees`),
    query(`SELECT COUNT(*) FROM courses WHERE is_active=true`),
    query(`SELECT COUNT(*), status FROM batches GROUP BY status`),
  ]);
  const recentActivity = await query(
    `SELECT 'submission' as type, title as description, created_at
     FROM submissions ORDER BY created_at DESC LIMIT 5`
  );
  ok(res, {
    applicants: applicants.rows,
    total_active_students: parseInt(students.rows[0]?.count || 0),
    submissions: submissions.rows,
    tests: tests.rows,
    fees: fees.rows[0],
    total_active_courses: parseInt(courses.rows[0]?.count || 0),
    batches: batches.rows,
    recent_activity: recentActivity.rows,
  });
}));

/**
 * @swagger
 * /dashboard/student:
 *   get:
 *     tags: [Dashboard]
 *     summary: Student personal dashboard stats
 *     responses:
 *       200:
 *         description: Student's own KPIs and recent activity
 */
router.get('/student', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const [enrollment, submissions, progress, fees, guides, notifications] = await Promise.all([
    query(
      `SELECT be.*, b.name as batch_name, b.code as batch_code, c.name as course_name
       FROM batch_enrollments be JOIN batches b ON b.id=be.batch_id JOIN courses c ON c.id=b.course_id
       WHERE be.user_id=$1 AND be.status='active' LIMIT 1`, [userId]
    ),
    query(`SELECT COUNT(*), status FROM submissions WHERE student_user_id=$1 GROUP BY status`, [userId]),
    query(`SELECT AVG(completion_percentage) as avg_pct, COUNT(*) as total FROM progress_reports WHERE student_user_id=$1`, [userId]),
    query(`SELECT SUM(amount) as total_due, SUM(CASE WHEN status='paid' THEN amount ELSE 0 END) as total_paid FROM fees WHERE student_user_id=$1`, [userId]),
    query(`SELECT sg.guide_type, u.first_name, u.last_name, u.email FROM student_guides sg JOIN users u ON u.id=sg.guide_user_id WHERE sg.student_user_id=$1 AND sg.is_active=true`, [userId]),
    query(`SELECT COUNT(*) as unread FROM notification_recipients WHERE user_id=$1 AND is_read=false`, [userId]),
  ]);
  ok(res, {
    enrollment: enrollment.rows[0] || null,
    submissions: submissions.rows,
    progress: progress.rows[0],
    fees: fees.rows[0],
    guides: guides.rows,
    unread_notifications: parseInt(notifications.rows[0]?.unread || 0),
  });
}));

/**
 * @swagger
 * /dashboard/courses/{courseId}:
 *   get:
 *     tags: [Dashboard]
 *     summary: Centralised per-course dashboard aggregating all batches
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Course-level aggregated data across all batches
 */
router.get('/courses/:courseId', requirePermission('dashboard', 'read'), asyncHandler(async (req, res) => {
  const cid = req.params.courseId;
  const [batches, students, applicants, submissions, fees, topStudents] = await Promise.all([
    query(`SELECT b.*, (SELECT COUNT(*) FROM batch_enrollments WHERE batch_id=b.id AND status='active') as enrolled FROM batches b WHERE b.course_id=$1 ORDER BY b.start_date DESC`, [cid]),
    query(`SELECT COUNT(*) FROM batch_enrollments be JOIN batches b ON b.id=be.batch_id WHERE b.course_id=$1 AND be.status='active'`, [cid]),
    query(`SELECT COUNT(*), status FROM applicants WHERE course_id=$1 GROUP BY status`, [cid]),
    query(`SELECT COUNT(*), s.status FROM submissions s JOIN batches b ON b.id=s.batch_id WHERE b.course_id=$1 GROUP BY s.status`, [cid]),
    query(`SELECT SUM(f.amount) as total_due, SUM(CASE WHEN f.status='paid' THEN f.amount ELSE 0 END) as collected FROM fees f JOIN batches b ON b.id=f.batch_id WHERE b.course_id=$1`, [cid]),
    query(
      `SELECT u.first_name, u.last_name, u.email, AVG(pr.completion_percentage) as avg_progress
       FROM users u JOIN progress_reports pr ON pr.student_user_id=u.id
       JOIN batches b ON b.id=pr.batch_id WHERE b.course_id=$1
       GROUP BY u.id, u.first_name, u.last_name, u.email ORDER BY avg_progress DESC LIMIT 10`, [cid]
    ),
  ]);
  ok(res, {
    batches: batches.rows,
    total_active_students: parseInt(students.rows[0]?.count || 0),
    applicants: applicants.rows,
    submissions: submissions.rows,
    fees: fees.rows[0],
    top_students_by_progress: topStudents.rows,
  });
}));

export default router;
