/**
 * Targets (formerly "milestones").
 *
 * A target is a compulsory item a scholar submits work against. Unlike a
 * progress report (3-layer chain) a target has exactly ONE approver, configured
 * per batch via approval_config.target — defaulting to the coordinator.
 *
 * Completion is DERIVED, never typed in by hand: a target counts as complete
 * only when a submission against it has been approved. The percentage shown on
 * a scholar's profile is approved targets / total targets for that semester.
 *
 * The underlying table is `targets` (renamed from progress_reports in
 * alter.js block 25). `module_name` holds the target's name.
 */
import { query, getClient } from '../../config/database.js';

const SELECT_COLS = `
  t.*,
  t.module_name AS name,
  u.first_name, u.last_name, u.email,
  b.name AS batch_name, b.course_id,
  s.id     AS submission_id,
  s.status AS submission_status,
  s.submitted_at`;

const FROM_JOINS = `
  FROM targets t
  JOIN users   u ON u.id = t.student_user_id
  JOIN batches b ON b.id = t.batch_id
  LEFT JOIN LATERAL (
    SELECT id, status, submitted_at FROM submissions
    WHERE target_id = t.id AND student_user_id = t.student_user_id
      AND merged_into_id IS NULL
    ORDER BY created_at DESC LIMIT 1
  ) s ON TRUE`;

export const listTargets = async ({
  batch_id, student_user_id, semester, course_id, status,
  allowed_batch_ids, limit = 200, offset = 0,
}) => {
  const params = [];
  const conds = [];
  if (course_id)         { params.push(course_id);         conds.push(`b.course_id = $${params.length}`); }
  if (batch_id)          { params.push(batch_id);          conds.push(`t.batch_id = $${params.length}`); }
  if (student_user_id)   { params.push(student_user_id);   conds.push(`t.student_user_id = $${params.length}`); }
  if (semester)          { params.push(Number(semester));  conds.push(`t.semester = $${params.length}`); }
  if (status)            { params.push(status);            conds.push(`t.status = $${params.length}`); }
  if (allowed_batch_ids) { params.push(allowed_batch_ids); conds.push(`t.batch_id = ANY($${params.length}::uuid[])`); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

  const { rows: data } = await query(
    `SELECT ${SELECT_COLS} ${FROM_JOINS} ${where}
     ORDER BY t.semester ASC, t.order_index ASC, t.created_at ASC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const { rows: [{ total }] } = await query(
    `SELECT COUNT(*) AS total FROM targets t JOIN batches b ON b.id = t.batch_id ${where}`,
    params
  );
  return { data, total: parseInt(total) };
};

export const getTargetById = async (id) => {
  const { rows } = await query(`SELECT ${SELECT_COLS} ${FROM_JOINS} WHERE t.id = $1`, [id]);
  return rows[0] || null;
};

export const createTarget = async (payload, createdBy) => {
  const { rows: [row] } = await query(
    `INSERT INTO targets
       (batch_id, student_user_id, semester, module_name, description, due_date,
        requires_file, is_mandatory, order_index, created_by, status, completion_percentage)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'not_started',0) RETURNING *`,
    [payload.batch_id, payload.student_user_id, payload.semester, payload.name,
     payload.description || null, payload.due_date || null,
     payload.requires_file !== false, payload.is_mandatory !== false,
     payload.order_index ?? 0, createdBy]
  );
  return row;
};

/**
 * Create a SET of targets for every actively-enrolled scholar in a batch.
 * This is the action that replaces creating targets one scholar at a time —
 * 6 targets across 30 scholars is one call, not 180.
 *
 * Idempotent by (batch, student, semester, name): re-running with the same set
 * skips scholars who already have that target instead of duplicating it.
 */
export const bulkCreateTargets = async ({ batch_id, semester, targets, student_user_ids }, createdBy) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    let students = student_user_ids;
    if (!students?.length) {
      const { rows } = await client.query(
        `SELECT user_id FROM batch_enrollments WHERE batch_id = $1 AND status = 'active'`,
        [batch_id]
      );
      students = rows.map((r) => r.user_id);
    }
    if (!students.length) {
      await client.query('ROLLBACK');
      return { created: 0, skipped: 0, students: 0, targets: targets.length };
    }

    let createdCount = 0;
    let skipped = 0;
    for (const studentId of students) {
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        const { rows: [dup] } = await client.query(
          `SELECT id FROM targets
           WHERE batch_id=$1 AND student_user_id=$2 AND semester=$3 AND module_name=$4 LIMIT 1`,
          [batch_id, studentId, semester, t.name]
        );
        if (dup) { skipped++; continue; }
        await client.query(
          `INSERT INTO targets
             (batch_id, student_user_id, semester, module_name, description, due_date,
              requires_file, is_mandatory, order_index, created_by, status, completion_percentage)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'not_started',0)`,
          [batch_id, studentId, semester, t.name, t.description || null, t.due_date || null,
           t.requires_file !== false, t.is_mandatory !== false, t.order_index ?? i, createdBy]
        );
        createdCount++;
      }
    }
    await client.query('COMMIT');
    return { created: createdCount, skipped, students: students.length, targets: targets.length };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const updateTarget = async (id, payload) => {
  const fields = [];
  const params = [];
  const map = {
    name: 'module_name', description: 'description', due_date: 'due_date',
    requires_file: 'requires_file', is_mandatory: 'is_mandatory', order_index: 'order_index',
    semester: 'semester',
  };
  for (const [key, col] of Object.entries(map)) {
    if (payload[key] !== undefined) { params.push(payload[key]); fields.push(`${col}=$${params.length}`); }
  }
  if (!fields.length) return getTargetById(id);
  params.push(id);
  const { rows } = await query(
    `UPDATE targets SET ${fields.join(',')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`,
    params
  );
  return rows[0] || null;
};

/**
 * A target is only deletable while nothing has been submitted against it —
 * deleting one with a submission would orphan a scholar's work.
 */
export const deleteTarget = async (id) => {
  const { rows: [sub] } = await query(
    'SELECT id FROM submissions WHERE target_id=$1 AND merged_into_id IS NULL LIMIT 1', [id]
  );
  if (sub) return { deleted: false, reason: 'A scholar has already submitted against this target.' };
  const { rowCount } = await query('DELETE FROM targets WHERE id=$1', [id]);
  return { deleted: rowCount > 0 };
};

/**
 * Called by the approvals service when a target submission is decided.
 * Approved  → completed / 100%.
 * Otherwise → back to in_progress so the scholar can resubmit. Never destructive.
 */
export const applyTargetDecision = async (targetId, approved, reviewerId) => {
  if (approved) {
    const { rows: [row] } = await query(
      `UPDATE targets SET status='completed', completion_percentage=100,
              completed_at=NOW(), approved_at=NOW(), approved_by=$2, updated_at=NOW()
       WHERE id=$1 RETURNING *`, [targetId, reviewerId]
    );
    return row;
  }
  const { rows: [row] } = await query(
    `UPDATE targets SET status='in_progress', completion_percentage=0,
            completed_at=NULL, approved_at=NULL, approved_by=NULL, updated_at=NOW()
     WHERE id=$1 RETURNING *`, [targetId]
  );
  return row;
};

/** Mark a target in progress the moment a scholar submits against it. */
export const markTargetSubmitted = async (targetId) => {
  await query(
    `UPDATE targets SET status='in_progress', updated_at=NOW()
     WHERE id=$1 AND status='not_started'`, [targetId]
  );
};

/**
 * Derived progress for a scholar, per semester. This replaces the old
 * hand-typed completion_percentage as the number the UI trusts.
 */
export const getProgressSummary = async (studentUserId) => {
  const { rows } = await query(
    `SELECT t.semester,
            COUNT(*)::int                                                        AS total,
            COUNT(*) FILTER (WHERE t.status = 'completed')::int                  AS approved,
            COUNT(*) FILTER (WHERE t.status <> 'completed' AND s.id IS NOT NULL)::int AS awaiting_review,
            COUNT(*) FILTER (WHERE t.status = 'not_started' AND s.id IS NULL)::int    AS not_started
     FROM targets t
     LEFT JOIN LATERAL (
       SELECT id FROM submissions
       WHERE target_id = t.id AND status <> 'draft' AND merged_into_id IS NULL LIMIT 1
     ) s ON TRUE
     WHERE t.student_user_id = $1
     GROUP BY t.semester ORDER BY t.semester`,
    [studentUserId]
  );
  const bySemester = rows.map((r) => ({
    ...r,
    percent: r.total ? Math.round((r.approved / r.total) * 100) : 0,
  }));
  const total = bySemester.reduce((a, r) => a + r.total, 0);
  const approved = bySemester.reduce((a, r) => a + r.approved, 0);
  return {
    by_semester: bySemester,
    overall: { total, approved, percent: total ? Math.round((approved / total) * 100) : 0 },
  };
};
