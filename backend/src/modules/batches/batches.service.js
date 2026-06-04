import { query } from '../../config/database.js';

export const listBatches = async ({ course_id, status, limit, offset }) => {
  const conditions = [];
  const params = [];
  if (course_id) { params.push(course_id); conditions.push(`b.course_id = $${params.length}`); }
  if (status) { params.push(status); conditions.push(`b.status = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: data } = await query(
    `SELECT b.*,
            c.name as course_name, c.code as course_code,
            (SELECT COUNT(*) FROM batch_enrollments WHERE batch_id = b.id AND status = 'active') as enrolled_count
     FROM batches b
     JOIN courses c ON c.id = b.course_id
     ${where}
     ORDER BY b.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const { rows: [{ total }] } = await query(
    `SELECT COUNT(*) AS total FROM batches b ${where}`, params
  );
  return { data, total: parseInt(total) };
};

export const getBatchById = async (id) => {
  const { rows } = await query(
    `SELECT b.*, c.name as course_name, c.code as course_code, c.max_students_per_batch,
            (SELECT COUNT(*) FROM batch_enrollments WHERE batch_id = b.id AND status = 'active') as enrolled_count
     FROM batches b JOIN courses c ON c.id = b.course_id
     WHERE b.id = $1`,
    [id]
  );
  return rows[0] || null;
};

export const createBatch = async (payload, createdBy) => {
  const { rows } = await query(
    `INSERT INTO batches (course_id, name, code, status, start_date, end_date, max_students, description, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [payload.course_id, payload.name, payload.code, payload.status,
     payload.start_date, payload.end_date, payload.max_students, payload.description || null, createdBy]
  );
  return rows[0];
};

export const updateBatch = async (id, payload) => {
  const fields = [];
  const params = [];
  const allowed = ['name','code','status','start_date','end_date','max_students','description'];
  for (const key of allowed) {
    if (payload[key] !== undefined) { params.push(payload[key]); fields.push(`${key}=$${params.length}`); }
  }
  if (!fields.length) return getBatchById(id);
  params.push(id);
  const { rows } = await query(
    `UPDATE batches SET ${fields.join(',')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`,
    params
  );
  return rows[0] || null;
};

export const deleteBatch = async (id) => query('DELETE FROM batches WHERE id=$1', [id]);

export const getBatchStudents = async (batchId, { limit, offset }) => {
  const { rows } = await query(
    `SELECT be.*, u.first_name, u.last_name, u.email, u.phone, u.avatar_url
     FROM batch_enrollments be
     JOIN users u ON u.id = be.user_id
     WHERE be.batch_id = $1
     ORDER BY be.enrolled_at DESC
     LIMIT $2 OFFSET $3`,
    [batchId, limit, offset]
  );
  const { rows: [{ total }] } = await query(
    'SELECT COUNT(*) AS total FROM batch_enrollments WHERE batch_id=$1', [batchId]
  );
  return { data: rows, total: parseInt(total) };
};

export const getBatchStats = async (batchId) => {
  const [students, submissions, fees, progress] = await Promise.all([
    query(`SELECT COUNT(*), status FROM batch_enrollments WHERE batch_id=$1 GROUP BY status`, [batchId]),
    query(`SELECT COUNT(*), status FROM submissions WHERE batch_id=$1 GROUP BY status`, [batchId]),
    query(`SELECT SUM(amount) as total_due, SUM(CASE WHEN status='paid' THEN amount ELSE 0 END) as total_paid FROM fees WHERE batch_id=$1`, [batchId]),
    query(`SELECT AVG(completion_percentage) as avg_progress FROM progress_reports WHERE batch_id=$1`, [batchId]),
  ]);
  return {
    students: students.rows,
    submissions: submissions.rows,
    fees: fees.rows[0],
    avg_progress: parseFloat(progress.rows[0]?.avg_progress || 0).toFixed(1),
  };
};
