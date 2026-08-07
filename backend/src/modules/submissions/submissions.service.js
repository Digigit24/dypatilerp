import { query, getClient } from '../../config/database.js';
import { notifyStageOpened } from '../notifications/notify.service.js';

export const listSubmissions = async ({ batch_id, assignment_id, student_user_id, status, search, allowed_batch_ids, limit, offset }) => {
  const params = [];
  const conditions = [];
  if (batch_id) { params.push(batch_id); conditions.push(`s.batch_id=$${params.length}`); }
  if (allowed_batch_ids) {
    params.push(allowed_batch_ids);
    conditions.push(`s.batch_id = ANY($${params.length}::uuid[])`);
  }
  if (assignment_id) { params.push(assignment_id); conditions.push(`s.assignment_id=$${params.length}`); }
  if (student_user_id) { params.push(student_user_id); conditions.push(`s.student_user_id=$${params.length}`); }
  if (status) { params.push(status); conditions.push(`s.status=$${params.length}`); }
  if (search?.trim()) {
    params.push(`%${search.trim()}%`);
    conditions.push(`(u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR s.title ILIKE $${params.length})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows: data } = await query(
    `SELECT s.*, u.first_name, u.last_name, u.email, b.name as batch_name,
            a.title AS assignment_title, a.is_mandatory AS assignment_mandatory
     FROM submissions s
     JOIN users u ON u.id=s.student_user_id
     JOIN batches b ON b.id=s.batch_id
     LEFT JOIN assignments a ON a.id = s.assignment_id
     ${where} ORDER BY s.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
    [...params, limit, offset]
  );
  const { rows: [{ total }] } = await query(
    `SELECT COUNT(*) AS total FROM submissions s JOIN users u ON u.id=s.student_user_id ${where}`,
    params
  );
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

/**
 * Resolve the batch a student is actively enrolled in. Returns the batch_id or
 * null. If the student is active in more than one batch the caller must supply
 * batch_id explicitly (we return null so the controller can 400).
 */
export const resolveActiveBatchForStudent = async (studentUserId) => {
  const { rows } = await query(
    `SELECT DISTINCT batch_id FROM batch_enrollments
     WHERE user_id=$1 AND status='active'`,
    [studentUserId]
  );
  return rows.length === 1 ? rows[0].batch_id : null;
};

/** Confirm a scholar is actively enrolled in a specific batch. */
export const isStudentEnrolledInBatch = async (studentUserId, batchId) => {
  const { rows } = await query(
    `SELECT 1 FROM batch_enrollments WHERE user_id=$1 AND batch_id=$2 AND status='active' LIMIT 1`,
    [studentUserId, batchId]
  );
  return rows.length > 0;
};

/**
 * Look up an actively-enrolled student in a given batch by email. Used by the
 * admin bulk-import flow to resolve each Excel row to a real account without
 * ever trusting a client-supplied user id — the match is server-side only.
 */
export const findEnrolledStudentByEmail = async (email, batchId) => {
  const { rows: [row] } = await query(
    `SELECT u.id, u.first_name, u.last_name, u.email
     FROM users u
     JOIN batch_enrollments be ON be.user_id = u.id
     WHERE LOWER(u.email) = LOWER($1) AND be.batch_id = $2 AND be.status = 'active'
     LIMIT 1`,
    [email, batchId]
  );
  return row || null;
};

/**
 * Create a submission. ownerId is always the scholar (student_user_id).
 * createdByUserId records who created the row (scholar for self-serve, admin
 * for on-behalf). Defaults to the owner to preserve the pre-existing behaviour.
 */
export const createSubmission = async (payload, ownerId, createdByUserId = null) => {
  // One submission per assignment per student (also enforced by a DB unique index)
  if (payload.assignment_id) {
    const { rows: [dup] } = await query(
      'SELECT id FROM submissions WHERE assignment_id=$1 AND student_user_id=$2',
      [payload.assignment_id, ownerId]
    );
    if (dup) {
      throw Object.assign(new Error('You have already created a submission for this assignment.'), { status: 400 });
    }
  }
  const { rows } = await query(
    `INSERT INTO submissions
       (batch_id,student_user_id,title,submission_type,semester,content,file_urls,assignment_id,created_by_user_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [payload.batch_id, ownerId, payload.title, payload.submission_type, payload.semester,
     payload.content||null, JSON.stringify(payload.file_urls||[]), payload.assignment_id||null,
     createdByUserId || ownerId]
  );
  return rows[0];
};

/**
 * Admin-on-behalf create: owner = scholar, created_by = admin. Batch must be one
 * the scholar is actively enrolled in.
 *
 * When payload.assignment_id is supplied, this is an assignment submission —
 * batch_id, title and semester are resolved from the assignment itself (the
 * client only needs to say which scholar and which assignment), and the usual
 * one-submission-per-assignment guard in createSubmission applies.
 */
export const createSubmissionOnBehalf = async (payload, adminUserId) => {
  let { batch_id, title, submission_type, semester, assignment_id } = payload;

  if (assignment_id) {
    const { rows: [assignment] } = await query('SELECT * FROM assignments WHERE id=$1', [assignment_id]);
    if (!assignment) throw Object.assign(new Error('Assignment not found'), { status: 404 });
    batch_id = assignment.batch_id;
    title = assignment.title;
    semester = assignment.semester || 1;
    submission_type = 'assignment';
  }

  const enrolled = await isStudentEnrolledInBatch(payload.student_user_id, batch_id);
  if (!enrolled) {
    throw Object.assign(new Error('Scholar is not actively enrolled in this batch.'), { status: 400 });
  }
  return createSubmission(
    { batch_id, title, submission_type: submission_type || 'progress_report',
      semester: semester || 1, content: null, file_urls: [], assignment_id: assignment_id || null },
    payload.student_user_id,
    adminUserId
  );
};

/**
 * Admin bulk-import: create one assignment submission on behalf of a student
 * from a single (already-validated) Excel row — a link to the student's
 * already-hosted file, never a re-uploaded file — then immediately run it
 * through the normal submit-for-review flow, exactly as if the student had
 * clicked Submit themselves. Reuses createSubmission's built-in one-per-
 * assignment duplicate guard, so re-running the same sheet safely skips rows
 * that already have a submission instead of creating duplicates.
 */
export const createAndSubmitAssignmentSubmission = async (assignment, studentUserId, file, adminUserId) => {
  const submission = await createSubmission(
    {
      batch_id: assignment.batch_id,
      assignment_id: assignment.id,
      title: assignment.title,
      submission_type: 'assignment',
      semester: assignment.semester || 1,
      content: file.notes || null,
      file_urls: [{ name: file.name || 'Submission', url: file.url }],
    },
    studentUserId,
    adminUserId
  );
  return submitForReview(submission.id, studentUserId, adminUserId);
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

/**
 * Append a verified attachment descriptor to a submission's file_urls, server-side.
 * The client never supplies the descriptor — the finalize step builds it after a
 * successful HEAD-verify, so an arbitrary url/object_key can't be injected.
 */
export const appendFileDescriptor = async (submissionId, descriptor) => {
  const { rows: [s] } = await query('SELECT file_urls FROM submissions WHERE id=$1', [submissionId]);
  if (!s) return null;
  const current = Array.isArray(s.file_urls)
    ? s.file_urls
    : (typeof s.file_urls === 'string' ? JSON.parse(s.file_urls || '[]') : []);
  current.push(descriptor);
  const { rows: [u] } = await query(
    'UPDATE submissions SET file_urls=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
    [JSON.stringify(current), submissionId]
  );
  return u;
};

/**
 * Submit a draft for review.
 * ownerId is the scholar who owns the submission (for a student self-submit this
 * equals the caller). submittedByUserId records who clicked Submit (scholar or
 * admin) for audit — it never affects workflow selection, which comes solely from
 * the batch's approval_config.
 */
export const submitForReview = async (id, ownerId, submittedByUserId = null) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Mark submission as submitted (owner + status guard preserved)
    const { rows: [sub] } = await client.query(
      `UPDATE submissions SET status='submitted', submitted_at=NOW(),
              submitted_by_user_id=$3, updated_at=NOW()
       WHERE id=$1 AND student_user_id=$2 AND status IN ('draft','needs_revision') RETURNING *`,
      [id, ownerId, submittedByUserId || ownerId]
    );
    if (!sub) throw Object.assign(new Error('Cannot submit — not found or wrong status'), { status: 400 });

    // 1b. A progress report must carry a verified ('ready') attachment before it
    //     can go for review — never mark submitted without a stored file.
    if (sub.submission_type === 'progress_report') {
      const { rows: [att] } = await client.query(
        `SELECT 1 FROM videos WHERE submission_id=$1 AND upload_status='ready' LIMIT 1`, [id]
      );
      if (!att) throw Object.assign(new Error('Attach a file before submitting this report.'), { status: 400 });
    }

    // 2. Determine the approval depth from the linked assignment (if any):
    //    optional assignment  → ONE layer (coordinator only)
    //    mandatory / no link  → the batch's configured chain or classic 3 layers
    let isOptionalAssignment = false;
    if (sub.assignment_id) {
      const { rows: [asg] } = await client.query(
        'SELECT is_mandatory FROM assignments WHERE id=$1', [sub.assignment_id]
      );
      isOptionalAssignment = asg ? asg.is_mandatory === false : false;
    }

    // 3. Build stage list — batch approval_config is the sole source of truth.
    const { rows: [batch] } = await client.query(
      'SELECT approval_config FROM batches WHERE id=$1', [sub.batch_id]
    );
    const configStages = batch?.approval_config?.stages || [];

    const stages = isOptionalAssignment
      ? [{ name: 'coordinator', type: 'role', role: 'coordinator', order_index: 1 }]
      : (configStages.length > 0 ? configStages : [
          { name: 'coordinator',    type: 'role', role: 'coordinator',    order_index: 1 },
          { name: 'academic_guide', type: 'student_guide', guide_type: 'academic', order_index: 2 },
          { name: 'industry_mentor',type: 'student_guide', guide_type: 'industry', order_index: 3 },
        ]);

    // 4. Delete any previous pending approvals for this submission (e.g. resubmission)
    await client.query(
      `DELETE FROM approvals WHERE submission_id=$1 AND status='pending'`, [id]
    );

    // 5. Resolve reviewer IDs and insert approval rows. Guide resolution is keyed
    //    to the OWNER (the scholar), never the acting submitter.
    let firstReviewerId = null;
    for (const s of stages) {
      let resolvedReviewerId = null;
      const roleName = s.role || null;

      if (s.type === 'student_guide') {
        // Resolve to the specific guide assigned to this student
        const { rows: [guide] } = await client.query(
          `SELECT guide_user_id FROM student_guides
           WHERE student_user_id=$1 AND guide_type=$2 AND is_active=true LIMIT 1`,
          [ownerId, s.guide_type]
        );
        resolvedReviewerId = guide?.guide_user_id || null;
      } else if (s.type === 'specific_user') {
        resolvedReviewerId = s.user_id || null;
      } else if (s.type === 'role') {
        // For an 'admin' role stage (the single institute-review stage) leave the
        // reviewer unassigned so ANY authorized admin can act. For other roles the
        // existing auto-assign is preserved byte-for-byte.
        if (s.role && s.role !== 'admin') {
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
      if (firstReviewerId === null && s === stages[0]) firstReviewerId = resolvedReviewerId;
    }

    await client.query('COMMIT');

    // Automated "Approval Stage Opened" email to the first-stage reviewer
    const first = stages[0];
    if (first) {
      setImmediate(() => notifyStageOpened(id, {
        stage: first.label || first.name,
        reviewerUserId: firstReviewerId,
        reviewerRole: first.role || first.name,
      }).catch(() => {}));
    }

    return sub;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
