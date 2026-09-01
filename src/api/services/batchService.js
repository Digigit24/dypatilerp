import { BATCHES } from '../mock/batches.js'
import { USE_MOCK } from '../config.js'
import { applyFilters, byId, delay, notFound, ok } from './_mock.js'
import http from '../http.js'

export const getBatches = async (filters = {}) => {
  if (USE_MOCK) { await delay(); const data = applyFilters(BATCHES, filters); return ok(data, { total: data.length }) }
  const { data: res } = await http.get('/batches', { params: filters })
  return ok(res.data, { total: res.pagination?.total || 0 })
}

export const getBatchById = async (id) => {
  if (USE_MOCK) { await delay(); const batch = byId(BATCHES, id); return batch ? ok(batch) : notFound() }
  const { data: res } = await http.get(`/batches/${id}`)
  return ok(res.data)
}

export const createBatch = async (payload) => {
  if (USE_MOCK) { await delay(); return ok({ id: `batch_${Date.now()}`, enrolled_count: 0, ...payload }) }
  const { data: res } = await http.post('/batches', payload)
  return ok(res.data)
}

export const updateBatch = async (id, payload) => {
  if (USE_MOCK) { await delay(); const batch = byId(BATCHES, id); return batch ? ok({ ...batch, ...payload }) : notFound() }
  const { data: res } = await http.put(`/batches/${id}`, payload)
  return ok(res.data)
}

export const deleteBatch = async (id) => {
  if (USE_MOCK) { await delay(); return ok(null) }
  await http.delete(`/batches/${id}`)
  return ok(null)
}

export const getBatchStudents = async (batchId, filters = {}) => {
  if (USE_MOCK) { return ok([]) }
  const { data: res } = await http.get(`/batches/${batchId}/students`, { params: filters })
  return ok(res.data, { total: res.pagination?.total || 0 })
}

export const getBatchStats = async (batchId) => {
  if (USE_MOCK) { return ok({}) }
  const { data: res } = await http.get(`/batches/${batchId}/stats`)
  return ok(res.data)
}

/** Saves the progress-report chain. Never touches the batch's target_approver. */
export const updateApprovalConfig = async (batchId, stages) => {
  if (USE_MOCK) { return ok({ stages }) }
  const { data: res } = await http.put(`/batches/${batchId}/approval-config`, { stages })
  return ok(res.data)
}

/** Saves the milestone's single approver. Never touches the progress-report chain. */
export const updateTargetApprover = async (batchId, approver) => {
  if (USE_MOCK) { return ok({ approver }) }
  const { data: res } = await http.put(`/batches/${batchId}/approval-config`, { target_approver: approver })
  return ok(res.data)
}

/**
 * Advance a batch's active scholars to the next semester (or a given
 * to_semester). Omit student_user_ids to advance the whole batch. Opens the
 * progress-report cycle for whatever semester scholars land on, and returns
 * non-blocking warnings for scholars with open targets / unpaid fees in the
 * semester they're leaving.
 */
export const advanceSemester = async (batchId, payload = {}) => {
  if (USE_MOCK) { return ok({ advanced: 0, semesters: [], cycles_opened: 0, warnings: [] }) }
  const { data: res } = await http.post(`/batches/${batchId}/advance-semester`, payload)
  return ok(res.data, { message: res.message })
}

// ─── Admission Letters ────────────────────────────────────────────────────────
// Generated letters are saved into the scholar's existing Official Letters
// admission_confirmation slot — preview/download reuse
// previewOfficialLetter/downloadOfficialLetter from studentService.js.

export const getAdmissionLettersRoster = async (batchId) => {
  if (USE_MOCK) { return ok([]) }
  const { data: res } = await http.get(`/batches/${batchId}/admission-letters`)
  return ok(res.data)
}

/** Kicks off background generation for every active scholar in the batch and returns immediately — poll getGenerateAllAdmissionLettersStatus for progress. Pass letterRefPrefix the first time (or to change it) — omit on later runs to keep the batch's saved prefix. */
export const generateAllAdmissionLetters = async (batchId, letterRefPrefix) => {
  if (USE_MOCK) { return ok({ status: 'done', total: 0, processed: 0, generated: [], skipped: [] }) }
  const { data: res } = await http.post(`/batches/${batchId}/admission-letters/generate-all`, { letterRefPrefix })
  return ok(res.data, { message: res.message })
}

/** Poll target for the background generate-all job — { status: 'idle'|'running'|'done', total, processed, generated, skipped }. */
export const getGenerateAllAdmissionLettersStatus = async (batchId) => {
  if (USE_MOCK) { return ok({ status: 'done', total: 0, processed: 0, generated: [], skipped: [] }) }
  const { data: res } = await http.get(`/batches/${batchId}/admission-letters/generate-all/status`)
  return ok(res.data)
}

export const generateOneAdmissionLetter = async (batchId, userId) => {
  if (USE_MOCK) { return ok({ status: 'generated' }) }
  const { data: res } = await http.post(`/batches/${batchId}/admission-letters/scholars/${userId}/generate`)
  return ok(res.data, { message: res.message })
}

/** Kicks off background emailing for every published-but-unsent letter in the batch and returns immediately — poll getEmailAllAdmissionLettersStatus for progress. */
export const emailAllAdmissionLetters = async (batchId) => {
  if (USE_MOCK) { return ok({ status: 'done', total: 0, processed: 0, sent: [], skipped: [] }) }
  const { data: res } = await http.post(`/batches/${batchId}/admission-letters/email-all`)
  return ok(res.data, { message: res.message })
}

/** Poll target for the background email-all job — { status: 'idle'|'running'|'done', total, processed, sent, skipped }. */
export const getEmailAllAdmissionLettersStatus = async (batchId) => {
  if (USE_MOCK) { return ok({ status: 'done', total: 0, processed: 0, sent: [], skipped: [] }) }
  const { data: res } = await http.get(`/batches/${batchId}/admission-letters/email-all/status`)
  return ok(res.data)
}

export const emailOneAdmissionLetter = async (batchId, userId) => {
  if (USE_MOCK) { return ok({ status: 'sent' }) }
  const { data: res } = await http.post(`/batches/${batchId}/admission-letters/scholars/${userId}/send-email`)
  return ok(res.data, { message: res.message })
}

/** Publishes every generated-but-draft letter in the batch — makes them visible to those scholars on their own login. */
export const publishAllAdmissionLetters = async (batchId) => {
  if (USE_MOCK) { return ok({ published: [] }) }
  const { data: res } = await http.post(`/batches/${batchId}/admission-letters/publish-all`)
  return ok(res.data, { message: res.message })
}

/** Publishes just the given scholars — also backs the per-row "Publish" button (single-element array). */
export const publishSelectedAdmissionLetters = async (batchId, userIds) => {
  if (USE_MOCK) { return ok({ published: [] }) }
  const { data: res } = await http.post(`/batches/${batchId}/admission-letters/publish`, { user_ids: userIds })
  return ok(res.data, { message: res.message })
}

/** Deletes every unpublished draft version across the batch. Published letters are kept as permanent version history and are never touched. */
export const deleteAllDraftAdmissionLetters = async (batchId) => {
  if (USE_MOCK) { return ok({ deleted: 0 }) }
  const { data: res } = await http.post(`/batches/${batchId}/admission-letters/delete-drafts`)
  return ok(res.data, { message: res.message })
}
