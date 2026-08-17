import { query } from '../../config/database.js';
import { writeAuditLog } from '../../utils/auditLog.js';
import { notifyStageOpened, notifySubmissionOutcome } from '../notifications/notify.service.js';

export const listPendingForUser = async (userId, roles) => {
  // Dynamic workflow: match by direct reviewer assignment OR by open role slot
  const { rows } = await query(
    `SELECT a.*, s.title, s.submission_type, s.semester, s.batch_id,
            u.first_name, u.last_name, u.email, b.name as batch_name
     FROM approvals a
     JOIN submissions s ON s.id=a.submission_id
     JOIN users u ON u.id=s.student_user_id
     JOIN batches b ON b.id=s.batch_id
     WHERE a.status='pending'
       AND (
         a.reviewer_user_id = $1
         OR (a.reviewer_user_id IS NULL AND a.reviewer_role = ANY($2::text[]))
         OR (a.reviewer_user_id IS NULL AND a.reviewer_role IS NULL AND a.stage = ANY($2::text[]))
       )
     ORDER BY a.created_at ASC`,
    [userId, roles]
  );
  return rows;
};

export const getApprovalById = async (id) => {
  const { rows } = await query('SELECT * FROM approvals WHERE id=$1', [id]);
  return rows[0] || null;
};

export const takeAction = async (approvalId, action, reviewerId, comments, actorRoles = []) => {
  const statusMap = { approve: 'approved', reject: 'rejected', request_revision: 'needs_revision' };
  const newStatus = statusMap[action];
  if (!newStatus) throw Object.assign(new Error('Invalid action'), { status: 400 });

  // Per-row authorization (the route only checks the approvals:update permission).
  // An actor may act only on a review assigned to them, or on an unassigned
  // role-slot whose reviewer_role they currently hold. No blanket admin override.
  const { rows: [existing] } = await query('SELECT * FROM approvals WHERE id=$1', [approvalId]);
  if (!existing) throw Object.assign(new Error('Approval not found'), { status: 404 });
  const authorized =
    existing.reviewer_user_id === reviewerId ||
    (existing.reviewer_user_id === null && existing.reviewer_role !== null && actorRoles.includes(existing.reviewer_role));
  if (!authorized) throw Object.assign(new Error('You are not authorized to action this review.'), { status: 403 });

  const { rows: [approval] } = await query(
    `UPDATE approvals SET status=$1, reviewer_user_id=$2, action_at=NOW(), comments=$3
     WHERE id=$4 RETURNING *`,
    [newStatus, reviewerId, comments||null, approvalId]
  );
  if (!approval) throw Object.assign(new Error('Approval not found'), { status: 404 });

  const { id: submissionId, order_index, stage } = approval;

  // Resolve the approver's display name once for outgoing notifications
  const { rows: [approver] } = await query(
    `SELECT first_name, last_name FROM users WHERE id=$1`, [reviewerId]
  );
  const approverName = approver ? `${approver.first_name || ''} ${approver.last_name || ''}`.trim() : null;

  if (newStatus === 'approved') {
    const { rows: [next] } = await query(
      `SELECT * FROM approvals WHERE submission_id=$1 AND order_index=$2`,
      [approval.submission_id, order_index + 1]
    );
    if (!next) {
      await query(`UPDATE submissions SET status='approved', updated_at=NOW() WHERE id=$1`, [approval.submission_id]);
      // Final approval → notify the scholar
      setImmediate(() => notifySubmissionOutcome(approval.submission_id, 'approved', { approverName, comments }).catch(() => {}));
    } else {
      await query(`UPDATE submissions SET status='under_review', updated_at=NOW() WHERE id=$1`, [approval.submission_id]);
      // Next stage just opened → notify its reviewer(s)
      setImmediate(() => notifyStageOpened(approval.submission_id, {
        stage: next.stage,
        reviewerUserId: next.reviewer_user_id,
        reviewerRole: next.reviewer_role || next.stage,
      }).catch(() => {}));
    }
  } else if (newStatus === 'rejected') {
    await query(`UPDATE submissions SET status='rejected', updated_at=NOW() WHERE id=$1`, [approval.submission_id]);
    setImmediate(() => notifySubmissionOutcome(approval.submission_id, 'needs_revision', { approverName, comments }).catch(() => {}));
  } else if (newStatus === 'needs_revision') {
    await query(`UPDATE submissions SET status='needs_revision', updated_at=NOW() WHERE id=$1`, [approval.submission_id]);
    setImmediate(() => notifySubmissionOutcome(approval.submission_id, 'needs_revision', { approverName, comments }).catch(() => {}));
  }

  // A target carries a single approval, so this decision IS the scholar's
  // outcome for it — but targets are shared batch definitions now (many
  // scholars submit against the same one), so completion lives entirely on
  // `submissions.status` (set above), never written back onto the target row.

  writeAuditLog({
    userId: reviewerId, action: `APPROVAL_${action.toUpperCase()}`,
    resourceType: 'approval', resourceId: approvalId,
    changes: { submission_id: approval.submission_id, stage: approval.stage, status: newStatus, comments },
  });

  return approval;
};

/** Record one uploaded feedback document against an approval row. Multiple allowed — supporting documents, not a single slot. */
export const addFeedbackAttachment = async ({ approval_id, title, object_key, file_size, mime_type }, uploadedBy) => {
  const { rows: [row] } = await query(
    `INSERT INTO videos (title, object_key, file_size, mime_type, media_type, uploaded_by, is_published, visibility, upload_status, approval_id)
     VALUES ($1,$2,$3,$4,'document',$5,false,'private','ready',$6) RETURNING *`,
    [title, object_key, file_size || 0, mime_type || null, uploadedBy, approval_id]
  );
  return row;
};

export const listApprovals = async ({ submission_id, stage, status, course_id, batch_id, allowed_batch_ids, limit, offset }) => {
  const params = [];
  const conditions = [];
  if (submission_id) { params.push(submission_id); conditions.push(`a.submission_id=$${params.length}`); }
  // RBAC scoping (never weakened) AND-combined with the picker's batch/course.
  if (allowed_batch_ids) {
    params.push(allowed_batch_ids);
    conditions.push(`s.batch_id = ANY($${params.length}::uuid[])`);
  }
  if (batch_id)  { params.push(batch_id);  conditions.push(`s.batch_id=$${params.length}`); }
  if (course_id) { params.push(course_id); conditions.push(`b.course_id=$${params.length}`); }
  if (stage)  { params.push(stage);  conditions.push(`a.stage=$${params.length}`); }
  if (status) { params.push(status); conditions.push(`a.status=$${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT a.*, s.title, s.student_user_id, s.batch_id,
            stu.first_name AS student_first_name, stu.last_name AS student_last_name, stu.email AS student_email,
            b.name AS batch_name, c.name AS course_name,
            rev.first_name AS reviewer_first_name, rev.last_name AS reviewer_last_name,
            (SELECT json_agg(json_build_object(
                      'id', v.id, 'title', v.title, 'mime_type', v.mime_type,
                      'file_size', v.file_size, 'created_at', v.created_at
                    ) ORDER BY v.created_at)
             FROM videos v WHERE v.approval_id = a.id) AS feedback_files
     FROM approvals a
     JOIN submissions s ON s.id=a.submission_id
     JOIN batches b ON b.id=s.batch_id
     LEFT JOIN courses c ON c.id=b.course_id
     LEFT JOIN users stu ON stu.id=s.student_user_id
     LEFT JOIN users rev ON rev.id=a.reviewer_user_id
     ${where} ORDER BY a.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
    [...params, limit, offset]
  );
  const { rows: [{ total }] } = await query(
    `SELECT COUNT(*) AS total FROM approvals a
     JOIN submissions s ON s.id=a.submission_id
     JOIN batches b ON b.id=s.batch_id
     ${where}`, params);
  return { data: rows, total: parseInt(total) };
};
