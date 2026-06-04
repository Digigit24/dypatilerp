import { query, getClient } from '../../config/database.js';

export const listSubmissions = async ({ batch_id, student_user_id, status, limit, offset }) => {
  const params = [];
  const conditions = [];
  if (batch_id) { params.push(batch_id); conditions.push(`s.batch_id=$${params.length}`); }
  if (student_user_id) { params.push(student_user_id); conditions.push(`s.student_user_id=$${params.length}`); }
  if (status) { params.push(status); conditions.push(`s.status=$${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows: data } = await query(
    `SELECT s.*, u.first_name, u.last_name, u.email, b.name as batch_name
     FROM submissions s
     JOIN users u ON u.id=s.student_user_id
     JOIN batches b ON b.id=s.batch_id
     ${where} ORDER BY s.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
    [...params, limit, offset]
  );
  const { rows: [{ total }] } = await query(`SELECT COUNT(*) AS total FROM submissions s ${where}`, params);
  return { data, total: parseInt(total) };
};

export const getSubmissionById = async (id) => {
  const { rows } = await query(
    `SELECT s.*, u.first_name, u.last_name, u.email, b.name as batch_name,
            (SELECT json_agg(a ORDER BY a.order_index)
             FROM approvals a WHERE a.submission_id=s.id) as approvals
     FROM submissions s
     JOIN users u ON u.id=s.student_user_id
     JOIN batches b ON b.id=s.batch_id
     WHERE s.id=$1`, [id]
  );
  return rows[0] || null;
};

export const createSubmission = async (payload, studentId) => {
  const { rows } = await query(
    `INSERT INTO submissions (batch_id,student_user_id,title,submission_type,semester,content,file_urls)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [payload.batch_id, studentId, payload.title, payload.submission_type, payload.semester,
     payload.content||null, JSON.stringify(payload.file_urls||[])]
  );
  return rows[0];
};

export const updateSubmission = async (id, payload) => {
  const fields = [];
  const params = [];
  if (payload.title !== undefined) { params.push(payload.title); fields.push(`title=$${params.length}`); }
  if (payload.content !== undefined) { params.push(payload.content); fields.push(`content=$${params.length}`); }
  if (payload.file_urls !== undefined) { params.push(JSON.stringify(payload.file_urls)); fields.push(`file_urls=$${params.length}`); }
  if (payload.submission_type !== undefined) { params.push(payload.submission_type); fields.push(`submission_type=$${params.length}`); }
  if (!fields.length) return getSubmissionById(id);
  params.push(id);
  const { rows } = await query(
    `UPDATE submissions SET ${fields.join(',')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`, params
  );
  return rows[0] || null;
};

export const submitForReview = async (id, studentId) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { rows: [sub] } = await client.query(
      `UPDATE submissions SET status='submitted', submitted_at=NOW(), updated_at=NOW()
       WHERE id=$1 AND student_user_id=$2 AND status IN ('draft','needs_revision') RETURNING *`,
      [id, studentId]
    );
    if (!sub) throw Object.assign(new Error('Cannot submit'), { status: 400 });

    // Create approval chain
    const stages = [
      { stage: 'coordinator', order_index: 1 },
      { stage: 'academic_guide', order_index: 2 },
      { stage: 'industry_mentor', order_index: 3 },
    ];
    for (const s of stages) {
      await client.query(
        `INSERT INTO approvals (submission_id, stage, status, order_index) VALUES ($1,$2,'pending',$3)
         ON CONFLICT DO NOTHING`,
        [id, s.stage, s.order_index]
      );
    }
    await client.query('COMMIT');
    return sub;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
