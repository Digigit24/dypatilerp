/**
 * Targets (formerly "milestones").
 *
 * A target is a compulsory item a scholar submits work against, approved by ONE
 * approver (the coordinator by default, configurable per batch). Completion is
 * DERIVED from approvals — never typed in — so `getProgressSummary` is the only
 * trustworthy source for a scholar's percentage.
 *
 * See documentation/SOP-V2.html §M4.
 */
import http from '../http.js'

/** List targets. Scholars are scoped to their own by the API, whatever is passed. */
export const getTargets = async (params = {}) => {
  const { data } = await http.get('/targets', { params })
  return { data: data.data || [], total: data.total ?? (data.data || []).length }
}

export const getTargetById = async (id) => {
  const { data } = await http.get(`/targets/${id}`)
  return { data: data.data }
}

/** Derived completion, per semester plus an overall roll-up. */
export const getProgressSummary = async (studentUserId) => {
  const { data } = await http.get('/targets/progress-summary', {
    params: studentUserId ? { student_user_id: studentUserId } : {},
  })
  return { data: data.data }
}

export const createTarget = async (payload) => {
  const { data } = await http.post('/targets', payload)
  return { data: data.data, message: data.message }
}

/**
 * Create a SET of target definitions for one batch+semester in one call —
 * one row per target NAME, not one per scholar. Scholars submit against the
 * shared definition (submissions.target_id), exactly like assignments.
 *
 *   bulkCreateTargets({
 *     batch_id, semester: 1,
 *     targets: [{ name: 'Literature Review', description }, ...],
 *   })
 *
 * Idempotent: re-running the same set skips names that already exist.
 */
export const bulkCreateTargets = async (payload) => {
  const { data } = await http.post('/targets/bulk', payload)
  return { data: data.data, message: data.message }
}

export const updateTarget = async (id, payload) => {
  const { data } = await http.patch(`/targets/${id}`, payload)
  return { data: data.data, message: data.message }
}

/** Refused by the API once a scholar has submitted against the target. */
export const deleteTarget = async (id) => {
  await http.delete(`/targets/${id}`)
  return { success: true }
}

/** Submit against a target — creates the submission, then sends it for review. */
export const submitForTarget = async ({ target_id, batch_id, semester, title, content, file_urls }) => {
  const { data: createRes } = await http.post('/submissions', {
    target_id, batch_id, semester, title,
    submission_type: 'target',
    content: content || undefined,
    file_urls: file_urls || [],
  })
  const submission = createRes.data
  const { data: submitRes } = await http.post(`/submissions/${submission.id}/submit`)
  return { data: submitRes.data }
}

/**
 * UI status for one target row, from a scholar's own point of view — reads
 * `my_submission_*` (the shape GET /targets?mine=1 or ?student_user_id=
 * returns), never `t.status` (vestigial on the target row itself now that
 * targets are shared batch definitions, not per-scholar rows).
 */
export const targetState = (t) => {
  if (t.my_submission_status === 'approved') return 'approved'
  if (t.my_submission_status === 'needs_revision') return 'needs_revision'
  if (t.my_submission_id && t.my_submission_status !== 'draft') return 'awaiting_review'
  if (t.my_submission_id) return 'draft'
  return 'not_started'
}
