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

  // Auto-send the client-approved "Qualified for Interview / Registration Fee"
  // email ONLY when a candidate enters the Final Shortlist from the normal
  // pre-shortlist flow (e.g. test_completed → shortlisted). Post-shortlist
  // previous statuses must NOT re-trigger it: moving payment_received → shortlisted
  // (a correction) or enrolled → shortlisted must send NO email, and a repeated
  // shortlisted → shortlisted update must not re-send either.
  const becameShortlisted =
    applicant.status === 'shortlisted' &&
    !['shortlisted', 'payment_received', 'enrolled'].includes(applicant.previous_status);

  if (becameShortlisted) {
    const { sendApplicantShortlisted } = await import('../email/email.service.js');
    const result = await sendApplicantShortlisted({
      applicant,
      courseId: applicant.course_id || null,
    });

    applicant.shortlist_email = {
      attempted: true,
      sent: !!result.success,
      message_id: result.messageId || null,
      cc: result.cc || [],
      via: result.via || (result.mock ? 'mock' : (result.success ? 'api' : null)),
      error: result.success ? null : (result.error || 'Email could not be sent'),
    };

    if (result.success) {
      console.log(
        `[applicants] Shortlist email sent → ${applicant.email}`,
        `msgId=${result.messageId || '(mock)'}`,
        applicant.shortlist_email.cc.length ? `cc=${applicant.shortlist_email.cc.join(',')}` : 'cc=(none)',
      );
    } else {
      // Do NOT swallow the failure — the applicant is still shortlisted, but the
      // admin must be able to see that the payment email did not go out.
      console.error(`[applicants] Shortlist email FAILED → ${applicant.email}: ${applicant.shortlist_email.error}`);
    }
  }

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
