import { TESTS, TEST_QUESTIONS, TEST_ATTEMPTS } from '../mock/tests.js'
import { USE_MOCK } from '../config.js'
import { byId, delay, notFound, ok } from './_mock.js'
import http from '../http.js'

export const getTests = async (filters = {}) => {
  if (USE_MOCK) { await delay(); let data = [...TESTS]; if (filters.status) data = data.filter((t) => t.status === filters.status); return ok(data, { total: data.length }) }
  const { data: res } = await http.get('/tests', { params: filters })
  return ok(res.data, { total: res.pagination?.total || 0 })
}

export const getTestById = async (id) => {
  if (USE_MOCK) { await delay(); const test = byId(TESTS, id); return test ? ok(test) : notFound() }
  const { data: res } = await http.get(`/tests/${id}`)
  return ok(res.data)
}

export const getTestQuestions = async (testId) => {
  if (USE_MOCK) { await delay(); return ok(TEST_QUESTIONS[testId] || []) }
  const { data: res } = await http.get(`/tests/${testId}/questions`)
  return ok(res.data)
}

export const createTest = async (payload) => {
  if (USE_MOCK) { await delay(); return ok({ id: `test_${Date.now()}`, status: 'draft', created_at: new Date().toISOString(), ...payload }) }
  const { data: res } = await http.post('/tests', payload)
  return ok(res.data)
}

export const updateTest = async (id, payload) => {
  if (USE_MOCK) { await delay(); const test = byId(TESTS, id); return test ? ok({ ...test, ...payload }) : notFound() }
  const { data: res } = await http.put(`/tests/${id}`, payload)
  return ok(res.data)
}

export const publishTest = async (id) => {
  if (USE_MOCK) { return ok({ id, status: 'published', published_at: new Date().toISOString() }) }
  const { data: res } = await http.post(`/tests/${id}/publish`)
  return ok(res.data)
}

export const addQuestion = async (testId, payload) => {
  if (USE_MOCK) { return ok({ id: `q_${Date.now()}`, ...payload }) }
  const { data: res } = await http.post(`/tests/${testId}/questions`, payload)
  return ok(res.data)
}

export const deleteQuestion = async (testId, questionId) => {
  if (USE_MOCK) { return ok(null) }
  await http.delete(`/tests/${testId}/questions/${questionId}`)
  return ok(null)
}

export const startTest = async (id) => {
  if (USE_MOCK) { return ok({}) }
  const { data: res } = await http.post(`/tests/${id}/start`)
  return ok(res.data)
}

export const submitTest = async (id, responses) => {
  if (USE_MOCK) { return ok({}) }
  const { data: res } = await http.post(`/tests/${id}/submit`, { responses })
  return ok(res.data)
}

export const getTestAttempt = async (id) => {
  if (USE_MOCK) { await delay(); const item = TEST_ATTEMPTS.find((a) => a.id === id || a.applicant_id === id); return item ? ok(item) : notFound() }
  const { data: res } = await http.get(`/tests/attempts/${id}`)
  return ok(res.data)
}

export const submitTestAttempt = async (payload) => {
  if (USE_MOCK) { await delay(300, 600); return ok({ id: `attempt_${Date.now()}`, status: 'submitted', submitted_at: new Date().toISOString(), ...payload }) }
  const { data: res } = await http.post(`/tests/${payload.test_id}/submit`, payload)
  return ok(res.data)
}

export const getAttemptsByTest = async (testId) => {
  if (USE_MOCK) { await delay(); const data = TEST_ATTEMPTS.filter((a) => a.test_id === testId); return ok(data, { total: data.length }) }
  const { data: res } = await http.get(`/tests/${testId}/attempts`)
  return ok(res.data, { total: res.pagination?.total || 0 })
}
