import { query } from '../../config/database.js';

export const listFees = async ({ batch_id, student_user_id, status, course_id, limit, offset }) => {
  const params = [];
  const conds = [];
  if (course_id)        { params.push(course_id);        conds.push(`b.course_id=$${params.length}`);         }
  if (batch_id)         { params.push(batch_id);         conds.push(`f.batch_id=$${params.length}`);          }
  if (student_user_id)  { params.push(student_user_id);  conds.push(`f.student_user_id=$${params.length}`);   }
  if (status)           { params.push(status);           conds.push(`f.status=$${params.length}`);            }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const { rows: data } = await query(
    `SELECT f.*, u.first_name, u.last_name, u.email, b.name as batch_name,
            COALESCE((SELECT SUM(amount) FROM fee_payments WHERE fee_id=f.id),0) as amount_paid
     FROM fees f JOIN users u ON u.id=f.student_user_id JOIN batches b ON b.id=f.batch_id
     ${where} ORDER BY f.due_date ASC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
    [...params, limit, offset]
  );
  const { rows: [{ total }] } = await query(`SELECT COUNT(*) FROM fees f ${where}`, params);
  return { data, total: parseInt(total) };
};

export const getFeeById = async (id) => {
  const { rows } = await query(
    `SELECT f.*, u.first_name, u.last_name,
            (SELECT json_agg(fp ORDER BY fp.paid_at DESC) FROM fee_payments fp WHERE fp.fee_id=f.id) as payments
     FROM fees f JOIN users u ON u.id=f.student_user_id WHERE f.id=$1`, [id]
  );
  return rows[0] || null;
};

export const createFee = async (payload) => {
  const { rows } = await query(
    `INSERT INTO fees (batch_id,student_user_id,semester,amount,due_date,description)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [payload.batch_id, payload.student_user_id, payload.semester, payload.amount, payload.due_date, payload.description||null]
  );
  return rows[0];
};

export const recordPayment = async (feeId, payload, recordedBy) => {
  const { rows: [payment] } = await query(
    `INSERT INTO fee_payments (fee_id,amount,payment_method,transaction_id,receipt_url,paid_at,recorded_by,notes)
     VALUES ($1,$2,$3,$4,$5,COALESCE($6,NOW()),$7,$8) RETURNING *`,
    [feeId, payload.amount, payload.payment_method, payload.transaction_id||null,
     payload.receipt_url||null, payload.paid_at||null, recordedBy, payload.notes||null]
  );

  const { rows: [fee] } = await query('SELECT * FROM fees WHERE id=$1', [feeId]);
  const { rows: [{ total_paid }] } = await query(
    'SELECT SUM(amount) as total_paid FROM fee_payments WHERE fee_id=$1', [feeId]
  );
  if (parseFloat(total_paid) >= parseFloat(fee.amount)) {
    await query(`UPDATE fees SET status='paid', updated_at=NOW() WHERE id=$1`, [feeId]);
  }
  return payment;
};

export const bulkCreateFees = async (batch_id, semester, studentIds, amount, due_date) => {
  const results = [];
  for (const studentId of studentIds) {
    const fee = await createFee({ batch_id, student_user_id: studentId, semester, amount, due_date });
    results.push(fee);
  }
  return results;
};
