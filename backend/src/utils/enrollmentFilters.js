/**
 * Shared read-side rule for what counts as an "Enrolled" applicant.
 *
 * The system has two notions of "enrolled":
 *   - applicants.status = 'enrolled'          (pipeline state)
 *   - batch_enrollments.status = 'active'     (actual enrollment state)
 *
 * An applicant should only count as Enrolled when BOTH hold: their pipeline
 * status is 'enrolled' AND they have a matching active batch_enrollment
 * (linked via the backfilled batch_enrollments.applicant_id FK). This excludes
 * scholars whose enrollment was later withdrawn / suspended / completed, or who
 * never had an enrollment row at all.
 *
 * Returns a SQL boolean clause to AND into a WHERE. Non-enrolled applicants are
 * left completely untouched, so every other pipeline stage keeps its exact count.
 *
 * NOTE: `alias` is developer-supplied (never user input) and is interpolated
 * directly; do not pass request data here.
 *
 * This is a semi-join (EXISTS) rather than a JOIN so an applicant with more than
 * one active enrollment is still counted exactly once (no row fan-out).
 */
export const activeEnrolledClause = (alias = 'a') => `(
    ${alias}.status <> 'enrolled'
    OR EXISTS (
      SELECT 1 FROM batch_enrollments be
      WHERE be.applicant_id = ${alias}.id AND be.status = 'active'
    )
  )`;
