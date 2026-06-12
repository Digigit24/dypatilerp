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
         OR (a.reviewer_user_id IS NULL AND a.stage = ANY($2::text[]))
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

export const takeAction = async (approvalId, action, reviewerId, comments) => {
  const statusMap = { approve: 'approved', reject: 'rejected', request_revision: 'needs_revision' };
  const newStatus = statusMap[action];
  if (!newStatus) throw Object.assign(new Error('Invalid action'), { status: 400 });

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

  writeAuditLog({
    userId: reviewerId, action: `APPROVAL_${action.toUpperCase()}`,
    resourceType: 'approval', resourceId: approvalId,
    changes: { submission_id: approval.submission_id, stage: approval.stage, status: newStatus, comments },
  });

  return approval;
};

export const listApprovals = async ({ submission_id, stage, status, allowed_batch_ids, limit, offset }) => {
  const params = [];
  const conditions = [];
  if (submission_id) { params.push(submission_id); conditions.push(`a.submission_id=$${params.length}`); }
  if (allowed_batch_ids) {
    params.push(allowed_batch_ids);
    conditions.push(`s.batch_id = ANY($${params.length}::uuid[])`);
  }
  if (stage) { params.push(stage); conditions.push(`a.stage=$${params.length}`); }
  if (status) { params.push(status); conditions.push(`a.status=$${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT a.*, s.title, u.first_name, u.last_name FROM approvals a
     JOIN submissions s ON s.id=a.submission_id
     LEFT JOIN users u ON u.id=a.reviewer_user_id
     ${where} ORDER BY a.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
    [...params, limit, offset]
  );
  const { rows: [{ total }] } = await query(
    `SELECT COUNT(*) AS total FROM approvals a JOIN submissions s ON s.id=a.submission_id ${where}`, params);
  return { data: rows, total: parseInt(total) };
};
