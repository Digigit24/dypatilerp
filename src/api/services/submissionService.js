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

export const getSubmissionsByStudent = async (student_user_id) => getSubmissions({ student_user_id })
