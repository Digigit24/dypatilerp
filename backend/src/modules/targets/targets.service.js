/**
 * Targets (formerly "milestones").
 *
 * A target is a BATCH-SCOPED DEFINITION — a coordinator creates it once per
 * batch+semester, exactly like an assignment. Scholars submit against it via
 * submissions.target_id; there is no per-scholar row on `targets` itself.
 * Completion is entirely derived from submissions — never typed in and never
 * written back onto the target row (targets.status/completion_percentage/
 * completed_at/approved_at/approved_by are vestigial columns from the old
 * per-scholar-row model; left in place, unused, per the additive-only rule).
 *
 * The underlying table is `targets` (renamed from progress_reports in
 * alter.js block 25). `module_name` holds the target's name.
 */
import { query, getClient } from '../../config/database.js';

/** Admin/coordinator view: one row per target, with aggregate submission stats. */
export const listTargets = async ({
  batch_id, semester, course_id, allowed_batch_ids, limit = 200, offset = 0,
}) => {
  const params = [];
  const conds = [];
  if (course_id)         { params.push(course_id);         conds.push(`b.course_id = $${params.length}`); }
  if (batch_id)          { params.push(batch_id);          conds.push(`t.batch_id = $${params.length}`); }
  if (semester)          { params.push(Number(semester));  conds.push(`t.semester = $${params.length}`); }
  if (allowed_batch_ids) { params.push(allowed_batch_ids); conds.push(`t.batch_id = ANY($${params.length}::uuid[])`); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

  const { rows: data } = await query(
    `SELECT t.*, t.module_name AS name, b.name AS batch_name, b.code AS batch_code,
            (SELECT COUNT(*) FROM submissions s WHERE s.target_id = t.id AND s.merged_into_id IS NULL)::int AS submission_count,
            (SELECT COUNT(*) FROM submissions s WHERE s.target_id = t.id AND s.status = 'approved' AND s.merged_into_id IS NULL)::int AS approved_count,
            (SELECT COUNT(*) FROM batch_enrollments be WHERE be.batch_id = t.batch_id AND be.status = 'active')::int AS student_count
     FROM targets t
     LEFT JOIN batches b ON b.id = t.batch_id
     ${where}
     ORDER BY t.semester ASC, t.order_index ASC, t.created_at ASC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const { rows: [{ total }] } = await query(
    `SELECT COUNT(*) AS total FROM targets t LEFT JOIN batches b ON b.id = t.batch_id ${where}`,
    params
  );
  return { data, total: parseInt(total) };
};

/**
 * Scholar's own view: every target for their batch, with MY submission
 * status joined in. Mirrors GET /assignments?mine=1 exactly.
 */
export const listMyTargets = async (studentUserId) => {
  const { rows } = await query(
    `SELECT t.*, t.module_name AS name, b.name AS batch_name,
            s.id     AS my_submission_id,
            s.status AS my_submission_status,
            s.submitted_at AS my_submitted_at
     FROM targets t
     JOIN batch_enrollments be ON be.batch_id = t.batch_id AND be.user_id = $1 AND be.status = 'active'
     LEFT JOIN batches b ON b.id = t.batch_id
     LEFT JOIN submissions s ON s.target_id = t.id AND s.student_user_id = $1 AND s.merged_into_id IS NULL
     ORDER BY t.semester ASC, t.order_index ASC, t.created_at ASC`,
    [studentUserId]
  );
  return rows;
};

export const getTargetById = async (id) => {
  const { rows } = await query(
    `SELECT t.*, t.module_name AS name, b.name AS batch_name, b.course_id
     FROM targets t LEFT JOIN batches b ON b.id = t.batch_id WHERE t.id = $1`,
    [id]
  );
  return rows[0] || null;
};

/** Admin: every scholar's submission against one target (review roster). */
export const getTargetSubmissions = async (targetId) => {
  const { rows } = await query(
    `SELECT s.*, u.first_name, u.last_name, u.email
     FROM submissions s
     JOIN users u ON u.id = s.student_user_id
     WHERE s.target_id = $1 AND s.merged_into_id IS NULL
     ORDER BY s.submitted_at DESC NULLS LAST`,
    [targetId]
  );
  return rows;
};

export const createTarget = async (payload, createdBy) => {
  const { rows: [row] } = await query(
    `INSERT INTO targets
       (batch_id, semester, module_name, description,
        requires_file, is_mandatory, order_index, created_by, status, completion_percentage)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'not_started',0) RETURNING *`,
    [payload.batch_id, payload.semester, payload.name, payload.description || null,
     payload.requires_file !== false, payload.is_mandatory !== false,
     payload.order_index ?? 0, createdBy]
  );
  return row;
};

/**
 * Create a SET of targets for a batch+semester in one call. One row per
 * target name — NOT one row per (target × scholar); scholars submit against
 * the shared definition. Idempotent by (batch, semester, name): re-running
 * with the same set skips names that already exist instead of duplicating.
 */
export const bulkCreateTargets = async ({ batch_id, semester, targets }, createdBy) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    let createdCount = 0;
    let skipped = 0;
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      const { rows: [dup] } = await client.query(
        `SELECT id FROM targets WHERE batch_id=$1 AND semester=$2 AND module_name=$3 LIMIT 1`,
        [batch_id, semester, t.name]
      );
      if (dup) { skipped++; continue; }
      await client.query(
        `INSERT INTO targets
           (batch_id, semester, module_name, description,
            requires_file, is_mandatory, order_index, created_by, status, completion_percentage)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'not_started',0)`,
        [batch_id, semester, t.name, t.description || null,
         t.requires_file !== false, t.is_mandatory !== false, t.order_index ?? i, createdBy]
      );
      createdCount++;
    }
    await client.query('COMMIT');
    return { created: createdCount, skipped, targets: targets.length };
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
    name: 'module_name', description: 'description', batch_id: 'batch_id',
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
 * deleting one with submissions in flight would orphan scholars' work.
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
 * Derived progress for a scholar, scoped to their CURRENT semester only.
 * "Current semester" comes from batch_enrollments.current_semester for
 * their active enrollment (falling back to their most recent enrollment if
 * none is active, e.g. withdrawn/completed scholars). Targets are now
 * batch-scoped definitions, so this counts "targets defined for my batch +
 * semester" against "of those, how many have MY submission approved" —
 * not a per-scholar target count.
 */
export const getProgressSummary = async (studentUserId) => {
  const { rows: [active] } = await query(
    `SELECT batch_id, current_semester FROM batch_enrollments
     WHERE user_id = $1 AND status = 'active'
     ORDER BY enrolled_at DESC LIMIT 1`,
    [studentUserId]
  );
  const enrollment = active || (await query(
    `SELECT batch_id, current_semester FROM batch_enrollments
     WHERE user_id = $1 ORDER BY enrolled_at DESC LIMIT 1`,
    [studentUserId]
  )).rows[0];

  if (!enrollment) {
    return { batch_id: null, semester: null, total: 0, approved: 0, awaiting_review: 0, not_started: 0, percent: 0 };
  }

  const { rows: [row] } = await query(
    `SELECT COUNT(*)::int                                                              AS total,
            COUNT(*) FILTER (WHERE s.status = 'approved')::int                         AS approved,
            COUNT(*) FILTER (WHERE s.id IS NOT NULL AND s.status <> 'approved')::int    AS awaiting_review,
            COUNT(*) FILTER (WHERE s.id IS NULL)::int                                  AS not_started
     FROM targets t
     LEFT JOIN LATERAL (
       SELECT id, status FROM submissions
       WHERE target_id = t.id AND student_user_id = $1 AND status <> 'draft' AND merged_into_id IS NULL
       ORDER BY created_at DESC LIMIT 1
     ) s ON TRUE
     WHERE t.batch_id = $2 AND t.semester = $3`,
    [studentUserId, enrollment.batch_id, enrollment.current_semester]
  );

  return {
    batch_id: enrollment.batch_id,
    semester: enrollment.current_semester,
    total: row.total,
    approved: row.approved,
    awaiting_review: row.awaiting_review,
    not_started: row.not_started,
    percent: row.total ? Math.round((row.approved / row.total) * 100) : 0,
  };
};
