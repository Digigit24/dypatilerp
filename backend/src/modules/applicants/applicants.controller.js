import * as svc from './applicants.service.js';
import { ok, created, notFound, noContent } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const { data, total } = await svc.listApplicants({ ...req.query, limit, offset });
  res.json({ success: true, data, pagination: buildPaginationMeta(total, page, limit) });
});

export const getOne = asyncHandler(async (req, res) => {
  const applicant = await svc.getApplicantById(req.params.id);
  if (!applicant) return notFound(res, 'Applicant not found');
  ok(res, applicant);
});

export const create = asyncHandler(async (req, res) => {
  const applicant = await svc.createApplicant(req.body);
  created(res, applicant, 'Application submitted');
});

export const updateStatus = asyncHandler(async (req, res) => {
  const applicant = await svc.updateApplicantStatus(req.params.id, req.body, req.user.id);
  if (!applicant) return notFound(res, 'Applicant not found');
  ok(res, applicant, 'Status updated');
});

export const convertToStudent = asyncHandler(async (req, res) => {
  const result = await svc.convertToStudent(req.params.id, req.body, req.user.id);
  ok(res, result, 'Applicant converted to student');
});

export const bulkConvert = asyncHandler(async (req, res) => {
  const results = [];
  for (const id of req.body.applicant_ids) {
    try {
      const r = await svc.convertToStudent(id, { batch_id: req.body.batch_id }, req.user.id);
      results.push({ id, success: true, ...r });
    } catch (e) {
      results.push({ id, success: false, error: e.message });
    }
  }
  ok(res, results, 'Bulk conversion complete');
});
