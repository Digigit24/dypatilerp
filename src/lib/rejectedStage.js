/**
 * Shared human labels for the stage an applicant was rejected FROM
 * (applicants.rejected_from_status). Used by the Kanban Rejected cards, the
 * Rejected list/tab, the from-stage filter, and the detail drawer.
 */
export const REJECTED_FROM_LABELS = {
  submitted:        'Rejected at Applied',
  shortlisted_test: 'Rejected (Shortlisted for Test)',
  test_pending:     'Rejected (Test Sent)',
  test_completed:   'Rejected after Test',
  shortlisted:      'Shortlisted → Rejected',
  payment_received: 'Rejected (Fee Paid)',
  enrolled:         'Rejected (was Enrolled)',
}

/** Label for a from-stage value; falls back to a plain "Rejected" when unknown/null. */
export const rejectedFromLabel = (fromStatus) =>
  REJECTED_FROM_LABELS[fromStatus] || 'Rejected'

/** Distinct from-stages present in a set of rejected applicants (for the filter). */
export const REJECTED_FROM_ORDER = [
  'submitted', 'shortlisted_test', 'test_pending', 'test_completed', 'shortlisted', 'payment_received', 'enrolled',
]
