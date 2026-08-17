/**
 * Progress-report cycles.
 *
 * A cycle is the 6-monthly submission window for one batch and semester.
 * Exactly ONE submission per scholar per cycle, carrying exactly TWO named
 * files: the report (PDF) and the presentation (PPT/PPTX).
 *
 * Cycles are created automatically — on batch creation and on semester
 * advance — so a coordinator can never forget to open one. See SOP-V2 §M3.
 */
import { query } from '../../config/database.js';

// Either slot accepts either file type — a scholar's report or presentation
// can each be a PDF or a PPT/PPTX (mirrored in videos.controller.js's
// SLOT_EXTS, which is what actually enforces this on upload).
const PROGRESS_REPORT_EXTS = ['pdf', 'ppt', 'pptx'];
const PROGRESS_REPORT_MIMES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];
export const SLOTS = {
  report:       { label: 'Progress Report', exts: PROGRESS_REPORT_EXTS, mimes: PROGRESS_REPORT_MIMES },
  presentation: { label: 'Presentation',    exts: PROGRESS_REPORT_EXTS, mimes: PROGRESS_REPORT_MIMES },
};
export const REQUIRED_SLOTS = ['report', 'presentation'];

export const listCycles = async ({ batch_id, semester, status, course_id, allowed_batch_ids }) => {
  const params = [];
  const conds = [];
  if (course_id)         { params.push(course_id);         conds.push(`b.course_id = $${params.length}`); }
  if (batch_id)          { params.push(batch_id);          conds.push(`c.batch_id = $${params.length}`); }
  if (semester)          { params.push(Number(semester));  conds.push(`c.semester = $${params.length}`); }
  if (status)            { params.push(status);            conds.push(`c.status = $${params.length}`); }
  if (allowed_batch_ids) { params.push(allowed_batch_ids); conds.push(`c.batch_id = ANY($${params.length}::uuid[])`); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT c.*, b.name AS batch_name, b.course_id,
            (SELECT COUNT(*) FROM batch_enrollments be
              WHERE be.batch_id = c.batch_id AND be.status='active')::int AS scholars,
            (SELECT COUNT(*) FROM submissions s
              WHERE s.cycle_id = c.id AND s.status <> 'draft' AND s.merged_into_id IS NULL)::int AS submitted,
            (SELECT COUNT(*) FROM submissions s
              WHERE s.cycle_id = c.id AND s.status = 'approved' AND s.merged_into_id IS NULL)::int AS approved
     FROM progress_report_cycles c
     JOIN batches b ON b.id = c.batch_id
     ${where}
     ORDER BY c.semester DESC, c.created_at DESC`,
    params
  );
  return rows;
};

export const getCycleById = async (id) => {
  const { rows } = await query(
    `SELECT c.*, b.name AS batch_name, b.course_id
     FROM progress_report_cycles c JOIN batches b ON b.id=c.batch_id WHERE c.id=$1`, [id]
  );
  return rows[0] || null;
};

/**
 * The cycle for one scholar + explicit semester (e.g. "Report 3" regardless
 * of where they currently are), plus their submission if they have one.
 *
 * A cycle can end up with more than one submissions row for the same
 * (cycle, student) — an admin on-behalf upload and a student self-submit
 * both landing separately, or a submit failing partway leaving an empty
 * draft behind (uq_sub_cycle is intentionally not enforced yet — see
 * CLAUDE.md §7). Resolving via a LATERAL pick instead of a plain JOIN means
 * that case always deterministically prefers the actually-submitted row
 * (over an empty/abandoned draft) and then the most recent, rather than
 * silently returning whichever row Postgres happened to scan first.
 */
export const getCycleForStudent = async (studentUserId, semester) => {
  const { rows } = await query(
    `SELECT c.*, b.name AS batch_name, b.course_id, co.duration_months,
            be.current_semester,
            s.id AS submission_id, s.status AS submission_status,
            s.file_urls, s.submitted_at, s.title AS submission_title
     FROM batch_enrollments be
     JOIN batches b ON b.id = be.batch_id
     JOIN courses co ON co.id = b.course_id
     JOIN progress_report_cycles c ON c.batch_id = be.batch_id AND c.semester = $2
     LEFT JOIN LATERAL (
       SELECT * FROM submissions
       WHERE cycle_id = c.id AND student_user_id = be.user_id AND merged_into_id IS NULL
       ORDER BY (status <> 'draft') DESC, created_at DESC
       LIMIT 1
     ) s ON TRUE
     WHERE be.user_id = $1 AND be.status = 'active'
     LIMIT 1`,
    [studentUserId, semester]
  );
  const cycle = rows[0];
  if (!cycle) return null;
  const files = Array.isArray(cycle.file_urls) ? cycle.file_urls : [];
  return {
    ...cycle,
    // A 24-month course = 4 six-monthly cycles; scales the same way for any
    // other course length instead of hardcoding "8 reports" for everyone.
    total_semesters: Math.max(1, Math.ceil((cycle.duration_months || 24) / 6)),
    slots: REQUIRED_SLOTS.map((slot) => ({
      slot,
      label: SLOTS[slot].label,
      accepts: SLOTS[slot].exts,
      file: files.find((f) => f.slot === slot) || null,
    })),
    can_submit: REQUIRED_SLOTS.every((slot) => files.some((f) => f.slot === slot)),
  };
};

/** The cycle a given scholar should be submitting into right now (their current semester). */
export const getMyCycle = async (studentUserId) => {
  const { rows: [enrollment] } = await query(
    `SELECT current_semester FROM batch_enrollments WHERE user_id=$1 AND status='active' ORDER BY enrolled_at DESC LIMIT 1`,
    [studentUserId]
  );
  if (!enrollment) return null;
  return getCycleForStudent(studentUserId, enrollment.current_semester);
};

/** Idempotent: one cycle per (batch, semester). */
export const ensureCycle = async (batchId, semester, createdBy = null, dueDate = null) => {
  const { rows } = await query(
    `INSERT INTO progress_report_cycles (batch_id, semester, title, due_date, status, created_by)
     VALUES ($1, $2, $3, $4, 'open', $5)
     ON CONFLICT (batch_id, semester) DO NOTHING
     RETURNING *`,
    [batchId, semester, `Progress Report — Semester ${semester}`, dueDate, createdBy]
  );
  if (rows[0]) return rows[0];
  const { rows: existing } = await query(
    'SELECT * FROM progress_report_cycles WHERE batch_id=$1 AND semester=$2', [batchId, semester]
  );
  return existing[0] || null;
};

export const updateCycle = async (id, payload) => {
  const fields = [];
  const params = [];
  for (const key of ['title', 'description', 'opens_at', 'due_date', 'status']) {
    if (payload[key] !== undefined) { params.push(payload[key]); fields.push(`${key}=$${params.length}`); }
  }
  if (!fields.length) return getCycleById(id);
  params.push(id);
  const { rows } = await query(
    `UPDATE progress_report_cycles SET ${fields.join(',')}, updated_at=NOW()
     WHERE id=$${params.length} RETURNING *`, params
  );
  return rows[0] || null;
};

/** Who in a cycle has and has not submitted — drives the coordinator's roster. */
export const getCycleRoster = async (cycleId) => {
  const { rows } = await query(
    `SELECT u.id AS student_user_id, u.first_name, u.last_name, u.email,
            be.enrollment_number,
            s.id AS submission_id, s.status AS submission_status, s.submitted_at,
            s.file_urls,
            COALESCE(jsonb_array_length(s.file_urls), 0)::int AS file_count
     FROM progress_report_cycles c
     JOIN batch_enrollments be ON be.batch_id = c.batch_id AND be.status='active'
     JOIN users u ON u.id = be.user_id
     LEFT JOIN submissions s
       ON s.cycle_id = c.id AND s.student_user_id = u.id AND s.merged_into_id IS NULL
     WHERE c.id = $1
     ORDER BY s.submitted_at NULLS FIRST, u.last_name`,
    [cycleId]
  );
  return rows;
};

/**
 * Validate that a submission has BOTH required slots filled.
 * Returns { ok, missing: ['presentation'] }.
 */
export const checkSlots = (fileUrls) => {
  const files = Array.isArray(fileUrls) ? fileUrls : [];
  const missing = REQUIRED_SLOTS.filter((slot) => !files.some((f) => f.slot === slot));
  return { ok: missing.length === 0, missing };
};
