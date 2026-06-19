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
router.get('/admin', requirePermission('dashboard_admin', 'read'), asyncHandler(async (req, res) => {
  // Course context comes from the app header (X-Course-Id) or ?course_id;
  // optional ?batch_id narrows further. No context = global numbers.
  const courseId = req.courseId || req.query.course_id || null;
  const batchId  = req.batchId || req.query.batch_id || null;

  // Parameterised course condition; batch id is validated as a UUID and
  // inlined only when it matches, so no user-typed text reaches the SQL.
  const courseCond = courseId ? 'AND course_id = $1' : '';
  const params = courseId ? [courseId] : [];
  const safeBatch = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(batchId || '') ? batchId : null;
  const batchCondB = safeBatch ? `AND b.id = '${safeBatch}'` : '';
  const batchCondPlain = safeBatch ? `AND batch_id = '${safeBatch}'` : '';

  const [
    applicantsByStatus, monthlyApplicants, students, pendingApprovals,
    submissionsByStatus, monthlySubmissions, fees, batches, testsAgg,
    attemptsAgg, assignmentsAgg, mediaAgg, recentApplicants, recentSubmissions,
  ] = await Promise.all([
    // Applicant pipeline (narrowed to the selected batch when one is active)
    query(`SELECT status, COUNT(*)::int AS count FROM applicants WHERE 1=1 ${courseCond} ${batchCondPlain} GROUP BY status`, params),
    // Applications per month (last 6 months)
    query(
      `SELECT to_char(date_trunc('month', applied_at), 'Mon YY') AS label,
              date_trunc('month', applied_at) AS m, COUNT(*)::int AS count
       FROM applicants
       WHERE applied_at > NOW() - INTERVAL '6 months' ${courseCond} ${batchCondPlain}
       GROUP BY m ORDER BY m`, params),
    // Active scholars
    query(
      `SELECT COUNT(*)::int AS count
       FROM batch_enrollments be JOIN batches b ON b.id = be.batch_id
       WHERE be.status = 'active' ${courseId ? "AND b.course_id = $1" : ''} ${batchCondB}`, params),
    // Pending approvals
    query(
      `SELECT COUNT(*)::int AS count
       FROM approvals a JOIN submissions s ON s.id = a.submission_id
       JOIN batches b ON b.id = s.batch_id
       WHERE a.status = 'pending' ${courseId ? "AND b.course_id = $1" : ''} ${batchCondB}`, params),
    // Submissions by status
    query(
      `SELECT s.status, COUNT(*)::int AS count
       FROM submissions s JOIN batches b ON b.id = s.batch_id
       WHERE 1=1 ${courseId ? "AND b.course_id = $1" : ''} ${batchCondB}
       GROUP BY s.status`, params),
    // Submissions per month (last 6 months)
    query(
      `SELECT to_char(date_trunc('month', s.created_at), 'Mon YY') AS label,
              date_trunc('month', s.created_at) AS m, COUNT(*)::int AS count
       FROM submissions s JOIN batches b ON b.id = s.batch_id
       WHERE s.created_at > NOW() - INTERVAL '6 months' ${courseId ? "AND b.course_id = $1" : ''} ${batchCondB}
       GROUP BY m ORDER BY m`, params),
    // Fees
    query(
      `SELECT COALESCE(SUM(f.amount), 0) AS total_due,
              COALESCE(SUM(CASE WHEN f.status = 'paid' THEN f.amount ELSE 0 END), 0) AS total_paid
       FROM fees f JOIN batches b ON b.id = f.batch_id
       WHERE 1=1 ${courseId ? "AND b.course_id = $1" : ''} ${batchCondB}`, params),
    // Batches with fill
    query(
      `SELECT b.id, b.name, b.code, b.status, b.max_students,
              (SELECT COUNT(*)::int FROM batch_enrollments be WHERE be.batch_id = b.id AND be.status = 'active') AS enrolled
       FROM batches b
       WHERE 1=1 ${courseId ? "AND b.course_id = $1" : ''} ${batchCondB}
       ORDER BY b.start_date DESC NULLS LAST LIMIT 6`, params),
    // Tests
    query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'published')::int AS published
       FROM tests WHERE 1=1 ${courseCond}`, params),
    // Test attempts
    query(
      `SELECT COUNT(*)::int AS submitted, ROUND(AVG(ta.score)::numeric, 1) AS avg_score
       FROM test_attempts ta JOIN tests t ON t.id = ta.test_id
       WHERE ta.status = 'submitted' ${courseId ? "AND t.course_id = $1" : ''}`, params),
    // Assignments
    query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE is_mandatory)::int AS mandatory
       FROM assignments WHERE 1=1 ${courseCond} ${batchCondPlain}`, params),
    // Media library
    query(`SELECT COUNT(*)::int AS total FROM videos WHERE 1=1 ${courseCond}`, params),
    // Recent applicants
    query(
      `SELECT 'applicant' AS type, first_name || ' ' || last_name AS who,
              status AS detail, applied_at AS at
       FROM applicants WHERE 1=1 ${courseCond} ${batchCondPlain}
       ORDER BY applied_at DESC LIMIT 6`, params),
    // Recent submissions
    query(
      `SELECT 'submission' AS type, u.first_name || ' ' || u.last_name AS who,
              s.title AS detail, s.created_at AS at
       FROM submissions s
       JOIN users u ON u.id = s.student_user_id
       JOIN batches b ON b.id = s.batch_id
       WHERE 1=1 ${courseId ? "AND b.course_id = $1" : ''} ${batchCondB}
       ORDER BY s.created_at DESC LIMIT 6`, params),
  ]);

  // This-month applicant delta
  const thisMonth = monthlyApplicants.rows.length
    ? monthlyApplicants.rows[monthlyApplicants.rows.length - 1].count : 0;

  const recent = [...recentApplicants.rows, ...recentSubmissions.rows]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 8);

  ok(res, {
    course_id: courseId,
    batch_id: safeBatch,
    applicants_by_status: applicantsByStatus.rows,
    applicants_total: applicantsByStatus.rows.reduce((sum, r) => sum + r.count, 0),
    applicants_this_month: thisMonth,
    monthly_applicants: monthlyApplicants.rows,
    monthly_submissions: monthlySubmissions.rows,
    total_active_students: students.rows[0]?.count || 0,
    pending_approvals: pendingApprovals.rows[0]?.count || 0,
    submissions_by_status: submissionsByStatus.rows,
    fees: {
      total_due: Number(fees.rows[0]?.total_due || 0),
      total_paid: Number(fees.rows[0]?.total_paid || 0),
    },
    batches: batches.rows,
    tests: testsAgg.rows[0] || { total: 0, published: 0 },
    attempts: attemptsAgg.rows[0] || { submitted: 0, avg_score: null },
    assignments: assignmentsAgg.rows[0] || { total: 0, mandatory: 0 },
    media_total: mediaAgg.rows[0]?.total || 0,
    recent_activity: recent,
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
router.get('/student', requirePermission('dashboard_student', 'read'), asyncHandler(async (req, res) => {
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
