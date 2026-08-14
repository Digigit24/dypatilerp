import * as svc from './submissions.service.js';
import { ok, created, notFound, forbidden, badRequest, noContent } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';
import { isOwnScope, allowedBatchIds } from '../../middleware/rbac.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const filters = { ...req.query, limit, offset };
  // Scope enforcement: 'own' → only my submissions; 'batch' → my batches only
  if (isOwnScope(req) || req.user.roles.includes('student')) {
    filters.student_user_id = req.user.id;
  }
  const ab = allowedBatchIds(req);
  if (ab) filters.allowed_batch_ids = ab;
  const { data, total } = await svc.listSubmissions(filters);
  res.json({ success: true, data, pagination: buildPaginationMeta(total, page, limit) });
});

export const getOne = asyncHandler(async (req, res) => {
  const submission = await svc.getSubmissionById(req.params.id);
  if (!submission) return notFound(res, 'Submission not found');
  if (req.user.roles.includes('student') && submission.student_user_id !== req.user.id) {
    return forbidden(res);
  }
  ok(res, submission);
});

export const create = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  // Resolve the batch for a self-serve student when not supplied (a scholar's
  // batch comes from their active enrollment, not from the request).
  if (!payload.batch_id) {
    payload.batch_id = await svc.resolveActiveBatchForStudent(req.user.id);
    if (!payload.batch_id) {
      return badRequest(res, 'Could not determine your batch — please contact your coordinator.');
    }
  }
  const submission = await svc.createSubmission(payload, req.user.id, req.user.id);
  created(res, submission, 'Submission created');
});

// An admin or coordinator uploads a progress report on behalf of a scholar.
// Owner = scholar; created_by = the acting staff member. Route is gated by
// requireRole('admin', 'coordinator').
export const createOnBehalf = asyncHandler(async (req, res) => {
  const submission = await svc.createSubmissionOnBehalf(req.body, req.user.id);
  created(res, submission, 'Submission created on behalf of scholar');
});

export const update = asyncHandler(async (req, res) => {
  const existing = await svc.getSubmissionById(req.params.id);
  if (!existing) return notFound(res, 'Submission not found');
  if (req.user.roles.includes('student') && existing.student_user_id !== req.user.id) {
    return forbidden(res);
  }
  const submission = await svc.updateSubmission(req.params.id, req.body);
  ok(res, submission, 'Submission updated');
});

export const submit = asyncHandler(async (req, res) => {
  // Student self-submit: owner and submitter are both the caller.
  const submission = await svc.submitForReview(req.params.id, req.user.id, req.user.id);
  ok(res, submission, 'Submitted for review');
});

// An admin or coordinator submits on behalf of the scholar. Owner is taken from
// the submission; the acting staff member is recorded as submitted_by. Route
// gated by requireRole('admin', 'coordinator').
export const submitOnBehalf = asyncHandler(async (req, res) => {
  const existing = await svc.getSubmissionById(req.params.id);
  if (!existing) return notFound(res, 'Submission not found');
  const submission = await svc.submitForReview(req.params.id, existing.student_user_id, req.user.id);
  ok(res, submission, 'Submitted for review on behalf of scholar');
});

// ─── Remarks / feedback thread ────────────────────────────────────────────────

export const listRemarks = asyncHandler(async (req, res) => {
  const access = await svc.canAccessSubmission(req.params.id, req.user);
  if (!access.found) return notFound(res, 'Submission not found');
  if (!access.allowed) return forbidden(res);
  ok(res, await svc.listRemarks(req.params.id));
});

export const addRemark = asyncHandler(async (req, res) => {
  const access = await svc.canAccessSubmission(req.params.id, req.user);
  if (!access.found) return notFound(res, 'Submission not found');
  // A scholar reads the feedback on their own report but never writes into the
  // reviewers' thread — only staff who can act on the submission may post.
  if (!access.allowed || access.isOwner) return forbidden(res);
  const remark = (req.body.remark || '').trim();
  if (!remark) return badRequest(res, 'Remark cannot be empty');
  const authorRole = (req.user.roles || []).find((r) =>
    ['admin', 'coordinator', 'academic_guide', 'industry_mentor'].includes(r)) || null;
  created(res, await svc.addRemark(req.params.id, req.user.id, remark, authorRole), 'Remark added');
});

export const removeRemark = asyncHandler(async (req, res) => {
  const isAdmin = (req.user.roles || []).includes('admin');
  const result = await svc.deleteRemark(req.params.remarkId, req.user.id, isAdmin);
  if (result.notFound) return notFound(res, 'Remark not found');
  if (result.forbidden) return forbidden(res, 'You can only delete your own remarks.');
  noContent(res);
});
