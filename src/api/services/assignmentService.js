import { USE_MOCK } from '../config.js'
import { ok } from './_mock.js'
import http from '../http.js'

/** Admin: list assignments for course/batch with submission stats */
export const getAssignments = async (filters = {}) => {
  if (USE_MOCK) return ok([])
  const { data: res } = await http.get('/assignments', { params: filters })
  return ok(res.data)
}

/** Student: my batch's published assignments + my submission status */
export const getMyAssignments = async () => {
  if (USE_MOCK) return ok([])
  const { data: res } = await http.get('/assignments', { params: { mine: 1 } })
  return ok(res.data)
}

export const createAssignment = async (payload) => {
  if (USE_MOCK) return ok({ id: `a_${Date.now()}`, ...payload })
  const { data: res } = await http.post('/assignments', payload)
  return ok(res.data)
}

export const updateAssignment = async (id, payload) => {
  if (USE_MOCK) return ok({ id, ...payload })
  const { data: res } = await http.patch(`/assignments/${id}`, payload)
  return ok(res.data)
}

export const deleteAssignment = async (id) => {
  if (USE_MOCK) return ok(null)
  await http.delete(`/assignments/${id}`)
  return ok(null)
}

export const getAssignmentSubmissions = async (id) => {
  if (USE_MOCK) return ok([])
  const { data: res } = await http.get(`/assignments/${id}/submissions`)
  return ok(res.data)
}

/**
 * Admin: bulk-create + submit assignment submissions from the mapped JSON
 * rows produced by the import wizard. Each row is { email, file_url,
 * file_name?, notes? } — see assignmentSubmissionImportConfig.js.
 */
export const bulkImportAssignmentSubmissions = async (assignmentId, rows) => {
  if (USE_MOCK) return ok({ imported: rows.length, skipped: 0, errors: [], total: rows.length })
  const { data: res } = await http.post(`/assignments/${assignmentId}/submissions/bulk-import`, { rows })
  return ok(res.data)
}
