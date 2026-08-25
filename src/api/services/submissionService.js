import { SUBMISSIONS } from '../mock/submissions.js'
import { USE_MOCK } from '../config.js'
import { applyFilters, byId, delay, notFound, ok } from './_mock.js'
import http from '../http.js'

export const getSubmissions = async (filters = {}) => {
  if (USE_MOCK) { await delay(); const data = applyFilters(SUBMISSIONS, filters); return ok(data, { total: data.length }) }
  const { data: res } = await http.get('/submissions', { params: filters })
  return ok(res.data, { total: res.pagination?.total || 0 })
}

export const getSubmissionById = async (id) => {
  if (USE_MOCK) { await delay(); const item = byId(SUBMISSIONS, id); return item ? ok(item) : notFound() }
  const { data: res } = await http.get(`/submissions/${id}`)
  return ok(res.data)
}

export const createSubmission = async (payload) => {
  if (USE_MOCK) {
    await delay()
    return ok({ id: `sub_${Date.now()}`, status: 'pending', title_version: 1, submitted_at: new Date().toISOString(), last_updated_at: new Date().toISOString(), ...payload })
  }
  const { data: res } = await http.post('/submissions', payload)
  return ok(res.data)
}

export const updateSubmission = async (id, payload) => {
  if (USE_MOCK) { await delay(); const item = byId(SUBMISSIONS, id); return item ? ok({ ...item, ...payload, last_updated_at: new Date().toISOString() }) : notFound() }
  const { data: res } = await http.put(`/submissions/${id}`, payload)
  return ok(res.data)
}

export const submitForReview = async (id) => {
  if (USE_MOCK) { return ok({}) }
  const { data: res } = await http.post(`/submissions/${id}/submit`)
  return ok(res.data)
}

// Admin uploads a progress report on behalf of a scholar (owner = scholar).
export const createSubmissionOnBehalf = async (payload) => {
  if (USE_MOCK) return ok({ id: `sub_${Date.now()}`, status: 'draft', ...payload })
  const { data: res } = await http.post('/submissions/on-behalf', payload)
  return ok(res.data)
}

export const submitForReviewOnBehalf = async (id) => {
  if (USE_MOCK) return ok({})
  const { data: res } = await http.post(`/submissions/${id}/submit-on-behalf`)
  return ok(res.data)
}

// Server-proxied progress-report upload: POST the file (multipart) to our own API,
// which streams it to storage server-side. Returns the updated submission.
// `slot` ('report' | 'presentation') is required by the backend for
// progress_report-kind submissions — each cycle needs exactly those two
// named files, not two arbitrary ones.
export const uploadSubmissionAttachment = async (submissionId, file, slot = null) => {
  if (USE_MOCK) return ok({ submission: { id: submissionId }, media_id: `mid_${Date.now()}` })
  const form = new FormData()
  form.append('file', file)
  const { data: res } = await http.post(`/submissions/${submissionId}/attachment${slot ? `?slot=${slot}` : ''}`, form)
  return ok(res.data)
}

// Removes one file from a submission — allowed any time before a final
// approval decision (draft/needs_revision/submitted/under_review), by the
// owning scholar or staff. Mirrors uploadSubmissionAttachment's status gate
// on the backend; see videos.controller.js.
export const removeSubmissionAttachment = async (submissionId, mediaId) => {
  if (USE_MOCK) return ok({})
  const { data: res } = await http.delete(`/submissions/${submissionId}/attachment/${mediaId}`)
  return ok(res.data)
}

export const getSubmissionsByStudent = async (student_user_id) => getSubmissions({ student_user_id })

// ─── Progress reports (uploaded documents) ───────────────────────────────────
// A progress report IS a submission of type 'progress_report' — the document
// lives in object storage and is reached through its media_id descriptor. This
// is the single source of truth the admin Progress Reports page reads.

export const getProgressReportSubmissions = async (filters = {}) =>
  getSubmissions({ ...filters, submission_type: 'progress_report' })

export const getProgressReportsByStudent = async (student_user_id) =>
  getProgressReportSubmissions({ student_user_id })

// ─── Remarks / feedback thread ───────────────────────────────────────────────
// Independent of the approval chain: coordinators, guides and mentors can leave
// notes on a report at any time without approving or rejecting it.

export const getSubmissionRemarks = async (submissionId) => {
  if (USE_MOCK) return ok([])
  const { data: res } = await http.get(`/submissions/${submissionId}/remarks`)
  return ok(res.data || [])
}

// authorRole is only honoured server-side when the caller is an admin — it
// lets an admin tag a remark as posted "on behalf of" a coordinator/guide/
// mentor. Everyone else is always tagged with their own real role.
export const addSubmissionRemark = async (submissionId, remark, authorRole = null) => {
  if (USE_MOCK) return ok({ id: `rem_${Date.now()}`, remark, author_role: authorRole, created_at: new Date().toISOString() })
  const { data: res } = await http.post(`/submissions/${submissionId}/remarks`, { remark, ...(authorRole ? { author_role: authorRole } : {}) })
  return ok(res.data)
}

export const deleteSubmissionRemark = async (submissionId, remarkId) => {
  if (USE_MOCK) return ok({})
  await http.delete(`/submissions/${submissionId}/remarks/${remarkId}`)
  return ok({})
}
