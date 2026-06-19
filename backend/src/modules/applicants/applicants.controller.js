import * as svc from './applicants.service.js';
import { notifyApplicationSubmitted } from '../notifications/notify.service.js';
import { ok, created, notFound, noContent } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  // X-Course-Id / X-Batch-Id headers take precedence over query params so the UI
  // never mixes courses, and narrows to the active batch when one is selected.
  const course_id = req.courseId || req.query.course_id || undefined;
  const batch_id = req.batchId || req.query.batch_id || undefined;
  const { data, total } = await svc.listApplicants({ ...req.query, course_id, batch_id, limit, offset });
  res.json({ success: true, data, pagination: buildPaginationMeta(total, page, limit) });
});

export const getOne = asyncHandler(async (req, res) => {
  const applicant = await svc.getApplicantById(req.params.id);
  if (!applicant) return notFound(res, 'Applicant not found');
  ok(res, applicant);
});

export const create = asyncHandler(async (req, res) => {
  const applicant = await svc.createApplicant(req.body);

  // Automated "Application Received" — receivers configured per course in the wizard
  setImmediate(() => notifyApplicationSubmitted(applicant)
    .catch((e) => console.error('[notify] application_submitted:', e.message)));

  created(res, applicant, 'Application submitted');
});

export const updateDetails = asyncHandler(async (req, res) => {
  const applicant = await svc.updateApplicantDetails(req.params.id, req.body);
  if (!applicant) return notFound(res, 'Applicant not found');
  ok(res, applicant, 'Applicant updated');
});

export const updateStatus = asyncHandler(async (req, res) => {
  const applicant = await svc.updateApplicantStatus(req.params.id, req.body, req.user.id);
  if (!applicant) return notFound(res, 'Applicant not found');
  ok(res, applicant, 'Status updated');
});

export const convertToStudent = asyncHandler(async (req, res) => {
  const sendCreds = req.body.send_credentials !== false; // default ON
  const result = await svc.convertToStudent(
    req.params.id,
    { ...req.body, rotate_password: sendCreds },
    req.user.id
  );

  // Email the fresh login credentials immediately (default behaviour)
  let credentials_emailed = false;
  if (sendCreds && result.password && result.applicant) {
    const { sendLoginCredentials } = await import('../email/email.service.js');
    const r = await sendLoginCredentials({
      user: result.applicant,
      password: result.password,
      courseId: result.applicant.course_id || null,
      portalLabel: 'Scholar Portal',
    });
    credentials_emailed = !!r.success;
  }

  ok(res, {
    user_id: result.user_id,
    enrollment_number: result.enrollment_number,
    credentials_emailed,
  }, credentials_emailed
    ? 'Converted — login credentials emailed'
    : 'Applicant converted to student');
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
