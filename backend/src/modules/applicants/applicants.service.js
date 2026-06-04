import { query, getClient } from '../../config/database.js';

export const listApplicants = async ({ course_id, status, search, limit, offset }) => {
  const params = [];
  const conditions = [];
  if (course_id) { params.push(course_id); conditions.push(`course_id=$${params.length}`); }
  if (status) { params.push(status); conditions.push(`status=$${params.length}`); }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows: data } = await query(
    `SELECT a.*, b.name as batch_name, b.code as batch_code
     FROM applicants a LEFT JOIN batches b ON b.id=a.batch_id
     ${where} ORDER BY a.applied_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
    [...params, limit, offset]
  );
  const { rows: [{ total }] } = await query(`SELECT COUNT(*) AS total FROM applicants ${where}`, params);
  return { data, total: parseInt(total) };
};

export const getApplicantById = async (id) => {
  const { rows } = await query(
    `SELECT a.*, b.name as batch_name FROM applicants a LEFT JOIN batches b ON b.id=a.batch_id WHERE a.id=$1`, [id]
  );
  return rows[0] || null;
};

export const createApplicant = async (payload) => {
  const { rows } = await query(
    `INSERT INTO applicants (course_id,first_name,last_name,email,phone,phd_details,application_data)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [payload.course_id, payload.first_name, payload.last_name, payload.email,
     payload.phone||null, JSON.stringify(payload.phd_details||{}), JSON.stringify(payload.application_data||{})]
  );
  return rows[0];
};

export const updateApplicantStatus = async (id, { status, batch_id }, reviewedBy) => {
  const { rows } = await query(
    `UPDATE applicants SET status=$1, batch_id=$2, reviewed_by=$3, reviewed_at=NOW(), updated_at=NOW()
     WHERE id=$4 RETURNING *`,
    [status, batch_id||null, reviewedBy, id]
  );
  return rows[0] || null;
};

export const convertToStudent = async (applicantId, { batch_id, enrollment_number }, enrolledBy) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { rows: [applicant] } = await client.query('SELECT * FROM applicants WHERE id=$1', [applicantId]);
    if (!applicant) throw new Error('Applicant not found');

    let userId = applicant.user_id;
    if (!userId) {
      const { rows: [user] } = await client.query(
        `INSERT INTO users (email,password_hash,first_name,last_name,is_active,email_verified)
         VALUES ($1,$2,$3,$4,true,false) RETURNING id`,
        [applicant.email, 'PENDING_SETUP', applicant.first_name, applicant.last_name]
      );
      userId = user.id;
      await client.query('UPDATE applicants SET user_id=$1 WHERE id=$2', [userId, applicantId]);
    }

    const enrNum = enrollment_number || `ENR-${Date.now()}`;
    await client.query(
      `INSERT INTO batch_enrollments (batch_id,user_id,applicant_id,enrollment_number,enrolled_by)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      [batch_id, userId, applicantId, enrNum, enrolledBy]
    );

    const { rows: [role] } = await client.query(`SELECT id FROM roles WHERE name='student'`);
    if (role) {
      await client.query(
        `INSERT INTO user_roles (user_id,role_id,batch_id,assigned_by) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [userId, role.id, batch_id, enrolledBy]
      );
    }

    await client.query(
      `UPDATE applicants SET status='enrolled', batch_id=$1, updated_at=NOW() WHERE id=$2`,
      [batch_id, applicantId]
    );
    await client.query('COMMIT');
    return { user_id: userId, enrollment_number: enrNum };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
