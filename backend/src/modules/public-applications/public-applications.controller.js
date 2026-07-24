import * as svc from './public-applications.service.js';
import { notifyApplicationSubmitted } from '../notifications/notify.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { created } from '../../utils/response.js';

export const submit = asyncHandler(async (req, res) => {
  const { program, applicant } = req.body;
  const result = await svc.submitPublicApplication(program, applicant);

  if (!result.success) {
    if (result.reason === 'duplicate') {
      return res.status(409).json({
        success: false,
        message: 'An application with this email has already been submitted for this program.',
      });
    }
    // Missing / disabled / invalid program, course, or batch all look the
    // same to the caller — an unconfigured program must not be probeable.
    return res.status(503).json({
      success: false,
      message: 'Applications for this program are not currently being accepted.',
    });
  }

  // Same fire-and-forget confirmation email as the shared applicants endpoint.
  setImmediate(() => notifyApplicationSubmitted(result.applicant)
    .catch((e) => console.error('[notify] application_submitted (public):', e.message)));

  created(res, result.applicant, 'Application submitted');
});
