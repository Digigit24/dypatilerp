import { query } from '../../config/database.js';
import { getCourseById } from '../courses/courses.service.js';
import { getBatchById } from '../batches/batches.service.js';
import { createApplicant } from '../applicants/applicants.service.js';

const SETTINGS_KEY = 'public_application_targets';

/**
 * Reads the trusted program → {enabled, course_id, batch_id} map from
 * app_settings. An absent key, or an absent program inside it, resolves to
 * `null` — this must never fall back to guessing a course/batch.
 */
const getConfiguredTarget = async (program) => {
  const { rows: [row] } = await query(`SELECT value FROM app_settings WHERE key = $1`, [SETTINGS_KEY]);
  const targets = row?.value || {};
  // hasOwnProperty guard so a program key can never resolve via the prototype
  // chain (e.g. "__proto__"/"constructor") instead of real configured data.
  if (!Object.prototype.hasOwnProperty.call(targets, program)) return null;
  return targets[program];
};

/**
 * Resolves `program` to a trusted, DB-verified {course_id, batch_id} pair.
 * The browser only ever sends `program` — course_id/batch_id are read from
 * server-side config here and cross-checked against real courses/batches
 * rows. Returns null for ANY failure (disabled, missing, bad course, bad
 * batch, or batch not belonging to course) so callers can't distinguish
 * *why* a program is unavailable.
 */
export const resolveTrustedTarget = async (program) => {
  const target = await getConfiguredTarget(program);
  if (!target || target.enabled !== true || !target.course_id || !target.batch_id) {
    return null;
  }

  const course = await getCourseById(target.course_id);
  if (!course) return null;

  const batch = await getBatchById(target.batch_id);
  if (!batch || batch.course_id !== course.id) return null;

  return { course_id: course.id, batch_id: batch.id };
};

const normalizeEmail = (email) => (email || '').trim().toLowerCase();

// The strict schema always nests the email under `personal`; keep a defensive
// fallback so a bad caller can never produce an undefined email lookup.
const extractEmail = (applicant) => applicant?.personal?.email || applicant?.email || '';

/** Public-submission duplicate rule: normalized email + course_id + batch_id. */
export const findDuplicateApplication = async (email, course_id, batch_id) => {
  const { rows: [dup] } = await query(
    `SELECT id FROM applicants WHERE LOWER(email) = $1 AND course_id = $2 AND batch_id = $3`,
    [normalizeEmail(email), course_id, batch_id]
  );
  return dup || null;
};

/**
 * Submits a public application for `program`. Never trusts any course_id/
 * batch_id the caller may have sent (the schema doesn't even accept them) —
 * both are resolved here from server-side configuration, then handed to the
 * existing, unmodified applicants.service.createApplicant().
 */
export const submitPublicApplication = async (program, applicantPayload) => {
  const target = await resolveTrustedTarget(program);
  if (!target) return { success: false, reason: 'unavailable' };

  const email = extractEmail(applicantPayload);
  const duplicate = await findDuplicateApplication(email, target.course_id, target.batch_id);
  if (duplicate) return { success: false, reason: 'duplicate' };

  // Hand ONLY the validated, generic envelope to the existing applicant
  // service. course_id/batch_id come from trusted config — never the client.
  // professional/consent are carried in application_data (the applicant
  // service persists that JSONB blob as-is), so no schema migration is needed.
  const applicant = await createApplicant({
    personal:           applicantPayload.personal,
    academic:           applicantPayload.academic || {},
    research_statement: applicantPayload.research_statement || null,
    application_data: {
      ...(applicantPayload.professional ? { professional: applicantPayload.professional } : {}),
      ...(applicantPayload.consent !== undefined ? { consent: applicantPayload.consent } : {}),
    },
    course_id: target.course_id,
    batch_id: target.batch_id,
  });

  return { success: true, applicant };
};
