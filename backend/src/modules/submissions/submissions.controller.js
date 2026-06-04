import * as svc from './submissions.service.js';
import { ok, created, notFound, forbidden } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const filters = { ...req.query, limit, offset };
  if (req.user.roles.includes('student')) {
    filters.student_user_id = req.user.id;
  }
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
  const submission = await svc.createSubmission(req.body, req.user.id);
  created(res, submission, 'Submission created');
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
  const submission = await svc.submitForReview(req.params.id, req.user.id);
  ok(res, submission, 'Submitted for review');
});
