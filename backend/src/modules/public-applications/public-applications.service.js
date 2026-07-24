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

const extractEmail = (applicant) => applicant.email || applicant.personal?.email || '';

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

  // Defensive overwrite — even though the schema never lets a client-supplied
  // course_id/batch_id reach this far, the resolved trusted IDs always win.
  const applicant = await createApplicant({
    ...applicantPayload,
    course_id: target.course_id,
    batch_id: target.batch_id,
  });

  return { success: true, applicant };
};
