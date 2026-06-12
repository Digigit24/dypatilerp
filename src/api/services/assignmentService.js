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
