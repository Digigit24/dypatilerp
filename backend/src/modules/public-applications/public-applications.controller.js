import * as svc from './public-applications.service.js';
import { notifyApplicationSubmitted } from '../notifications/notify.service.js';
import { created, conflict, serverError } from '../../utils/response.js';

// Public-facing messages — deliberately generic. A failure must never reveal
// which of {missing, disabled, bad course, bad batch, mismatch} occurred, nor
// any internal detail (err.message, stack, SQL, IDs, paths, env values).
const DUPLICATE_MESSAGE  = 'An application with this email has already been submitted for this program.';
const UNAVAILABLE_MESSAGE = 'Applications for this program are not currently being accepted.';
const GENERIC_ERROR_MESSAGE = 'An unexpected error occurred. Please try again later.';

export const submit = async (req, res) => {
  try {
    const { program, applicant } = req.body;
    const result = await svc.submitPublicApplication(program, applicant);

    if (!result.success) {
      if (result.reason === 'duplicate') {
        return conflict(res, DUPLICATE_MESSAGE);
      }
      // Missing / disabled / invalid program, course, or batch all resolve to
      // the same 503 — an unconfigured program must not be probeable.
      return res.status(503).json({ success: false, message: UNAVAILABLE_MESSAGE });
    }

    // Fire-and-forget confirmation email, ONLY after the applicant is persisted.
    // Fully decoupled (setImmediate + own .catch): it runs after the 201 is
    // sent, so a notification failure can never roll back the created applicant
    // and never reaches the catch below.
    setImmediate(() => notifyApplicationSubmitted(result.applicant)
      .catch((e) => console.error('[notify] application_submitted (public):', e.message)));

    return created(res, result.applicant, 'Application submitted');
  } catch (err) {
    // Unexpected internal error (e.g. a DB failure thrown by the service).
    // Log full technical detail server-side via the existing logger; return a
    // generic message only. No applicant-creation side effect happened here
    // (the service throws before returning success), so no notification fires.
    console.error('[public-applications] submit failed:', err);
    return serverError(res, GENERIC_ERROR_MESSAGE);
  }
};
