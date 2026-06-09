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

    // 1. Mark submission as submitted
    const { rows: [sub] } = await client.query(
      `UPDATE submissions SET status='submitted', submitted_at=NOW(), updated_at=NOW()
       WHERE id=$1 AND student_user_id=$2 AND status IN ('draft','needs_revision') RETURNING *`,
      [id, studentId]
    );
    if (!sub) throw Object.assign(new Error('Cannot submit — not found or wrong status'), { status: 400 });

    // 2. Load the batch's approval_config
    const { rows: [batch] } = await client.query(
      'SELECT approval_config FROM batches WHERE id=$1', [sub.batch_id]
    );
    const configStages = batch?.approval_config?.stages || [];

    // 3. Fall back to the classic three-stage chain if no config is set
    const stages = configStages.length > 0 ? configStages : [
      { name: 'coordinator',    type: 'role', role: 'coordinator',    order_index: 1 },
      { name: 'academic_guide', type: 'student_guide', guide_type: 'academic', order_index: 2 },
      { name: 'industry_mentor',type: 'student_guide', guide_type: 'industry', order_index: 3 },
    ];

    // 4. Delete any previous pending approvals for this submission (e.g. resubmission)
    await client.query(
      `DELETE FROM approvals WHERE submission_id=$1 AND status='pending'`, [id]
    );

    // 5. Resolve reviewer IDs and insert approval rows
    for (const s of stages) {
      let resolvedReviewerId = null;
      const roleName = s.role || null;

      if (s.type === 'student_guide') {
        // Resolve to the specific guide assigned to this student
        const { rows: [guide] } = await client.query(
          `SELECT guide_user_id FROM student_guides
           WHERE student_user_id=$1 AND guide_type=$2 AND is_active=true LIMIT 1`,
          [studentId, s.guide_type]
        );
        resolvedReviewerId = guide?.guide_user_id || null;
      } else if (s.type === 'specific_user') {
        resolvedReviewerId = s.user_id || null;
      } else if (s.type === 'role') {
        // Leave reviewer_user_id null; anyone with that role can claim it.
        // Optionally auto-assign to the batch's coordinator if one exists.
        if (s.role) {
          const { rows: [coord] } = await client.query(
            `SELECT ur.user_id FROM user_roles ur
             JOIN roles r ON r.id=ur.role_id
             WHERE r.name=$1
               AND (ur.batch_id=$2 OR ur.batch_id IS NULL)
             LIMIT 1`,
            [s.role, sub.batch_id]
          );
          resolvedReviewerId = coord?.user_id || null;
        }
      }

      await client.query(
        `INSERT INTO approvals (submission_id, stage, status, order_index, reviewer_user_id, reviewer_role)
         VALUES ($1, $2, 'pending', $3, $4, $5)`,
        [id, s.name, s.order_index, resolvedReviewerId, roleName]
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
