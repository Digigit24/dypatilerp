import { query, getClient } from '../../config/database.js';

export const listCourses = async ({ is_active, limit, offset }) => {
  const conditions = [];
  const params = [];
  if (is_active !== undefined) {
    params.push(is_active);
    conditions.push(`is_active = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: data } = await query(
    `SELECT c.*,
            (SELECT COUNT(*) FROM batches WHERE course_id = c.id) as batch_count,
            (SELECT COUNT(*) FROM batch_enrollments be
             JOIN batches b ON b.id = be.batch_id WHERE b.course_id = c.id AND be.status = 'active') as student_count
     FROM courses c ${where}
     ORDER BY c.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const { rows: [{ total }] } = await query(
    `SELECT COUNT(*) AS total FROM courses ${where}`,
    params
  );
  return { data, total: parseInt(total) };
};

export const getCourseById = async (id) => {
  const { rows } = await query(`SELECT * FROM courses WHERE id = $1`, [id]);
  return rows[0] || null;
};

const DEFAULT_PREFERENCES = {
  modules: {
    applicants: true, students: true, batches: true, progress: true,
    approvals: true, fees: true, 'test-builder': true, notifications: true,
    users: true, settings: true, courses: true, roles: true,
  },
};

export const createCourse = async (payload, createdBy) => {
  const { rows } = await query(
    `INSERT INTO courses (name, code, description, duration_months, max_students_per_batch, fee_structure, is_active, preferences, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      payload.name, payload.code, payload.description || null,
      payload.duration_months, payload.max_students_per_batch,
      JSON.stringify(payload.fee_structure || {}),
      payload.is_active ?? true,
      JSON.stringify(payload.preferences || DEFAULT_PREFERENCES),
      createdBy,
    ]
  );
  return rows[0];
};

export const updateCourse = async (id, payload) => {
  const fields = [];
  const params = [];
  const map = {
    name: payload.name, code: payload.code, description: payload.description,
    duration_months: payload.duration_months,
    max_students_per_batch: payload.max_students_per_batch,
    fee_structure: payload.fee_structure ? JSON.stringify(payload.fee_structure) : undefined,
    is_active: payload.is_active,
    preferences: payload.preferences ? JSON.stringify(payload.preferences) : undefined,
  };
  for (const [k, v] of Object.entries(map)) {
    if (v !== undefined) { params.push(v); fields.push(`${k} = $${params.length}`); }
  }
  if (!fields.length) return getCourseById(id);
  params.push(id);
  const { rows } = await query(
    `UPDATE courses SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
    params
  );
  return rows[0] || null;
};

/**
 * Cascade-delete a course and EVERYTHING under it:
 * tests (sections/questions/attempts/responses/tokens), applicants, batches,
 * enrollments, submissions + approvals, fees + payments, progress reports,
 * notifications, assignments, formats, media. Wrapped in one transaction.
 * Ordered explicitly so RESTRICT / NO ACTION constraints never fire.
 */
export const deleteCourse = async (id) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const batchesOf = `(SELECT id FROM batches WHERE course_id = $1)`;
    const testsOf = `(SELECT id FROM tests WHERE course_id = $1 OR batch_id IN ${batchesOf})`;
    const applicantsOf = `(SELECT id FROM applicants WHERE course_id = $1)`;

    // Test data
    await client.query(`DELETE FROM test_responses WHERE attempt_id IN (SELECT id FROM test_attempts WHERE test_id IN ${testsOf})`, [id]);
    await client.query(`DELETE FROM test_attempts WHERE test_id IN ${testsOf} OR applicant_id IN ${applicantsOf}`, [id]);
    await client.query(`DELETE FROM tests WHERE course_id = $1 OR batch_id IN ${batchesOf}`, [id]);

    // Submissions + approvals (approvals cascade from submissions)
    await client.query(`DELETE FROM submissions WHERE batch_id IN ${batchesOf}`, [id]);

    // Fees
    await client.query(`DELETE FROM fee_payments WHERE fee_id IN (SELECT id FROM fees WHERE batch_id IN ${batchesOf})`, [id]);
    await client.query(`DELETE FROM fees WHERE batch_id IN ${batchesOf}`, [id]);

    // Progress reports + enrollments
    await client.query(`DELETE FROM progress_reports WHERE batch_id IN ${batchesOf}`, [id]);
    await client.query(`DELETE FROM batch_enrollments WHERE batch_id IN ${batchesOf} OR applicant_id IN ${applicantsOf}`, [id]);

    // Notifications
    await client.query(`DELETE FROM notification_recipients WHERE notification_id IN (SELECT id FROM notifications WHERE course_id = $1 OR batch_id IN ${batchesOf})`, [id]);
    await client.query(`DELETE FROM notifications WHERE course_id = $1 OR batch_id IN ${batchesOf}`, [id]);

    // Applicants (their access tokens cascade)
    await client.query(`DELETE FROM applicants WHERE course_id = $1`, [id]);

    // Course content (formats/media/assignments/folders cascade on course,
    // but delete explicitly so batch-scoped rows are covered too)
    await client.query(`DELETE FROM formats WHERE course_id = $1 OR batch_id IN ${batchesOf}`, [id]);
    await client.query(`DELETE FROM videos WHERE course_id = $1 OR batch_id IN ${batchesOf}`, [id]);
    await client.query(`DELETE FROM media_folders WHERE course_id = $1`, [id]);
    await client.query(`DELETE FROM assignments WHERE course_id = $1 OR batch_id IN ${batchesOf}`, [id]);

    // Role scoping rows (cascade exists; explicit for clarity)
    await client.query(`DELETE FROM user_roles WHERE course_id = $1 OR batch_id IN ${batchesOf}`, [id]);
    await client.query(`DELETE FROM student_guides WHERE batch_id IN ${batchesOf}`, [id]);

    // Finally the batches and the course itself
    await client.query(`DELETE FROM batches WHERE course_id = $1`, [id]);
    await client.query(`DELETE FROM courses WHERE id = $1`, [id]);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const getCourseDashboard = async (courseId) => {
  const [batches, students, applicants, submissions] = await Promise.all([
    query(`SELECT COUNT(*), status FROM batches WHERE course_id=$1 GROUP BY status`, [courseId]),
    query(
      `SELECT COUNT(*) FROM batch_enrollments be JOIN batches b ON b.id=be.batch_id
       WHERE b.course_id=$1 AND be.status='active'`, [courseId]
    ),
    query(`SELECT COUNT(*), status FROM applicants WHERE course_id=$1 GROUP BY status`, [courseId]),
    query(
      `SELECT COUNT(*), s.status FROM submissions s
       JOIN batch_enrollments be ON be.user_id=s.student_user_id
       JOIN batches b ON b.id=s.batch_id WHERE b.course_id=$1
       GROUP BY s.status`, [courseId]
    ),
  ]);
  return {
    batches: batches.rows,
    total_active_students: parseInt(students.rows[0]?.count || 0),
    applicants: applicants.rows,
    submissions: submissions.rows,
  };
};
