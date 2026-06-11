import { TESTS, TEST_QUESTIONS, TEST_ATTEMPTS } from '../mock/tests.js'
import { USE_MOCK } from '../config.js'
import { byId, delay, notFound, ok } from './_mock.js'
import http from '../http.js'
// Separate axios instance for test-taking — uses sessionStorage test token, never admin token
import testHttp from '../testHttp.js'

// ── Tests ──────────────────────────────────────────────────────────────────────
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

export const createTest = async (payload) => {
  if (USE_MOCK) { await delay(); return ok({ id: `test_${Date.now()}`, status: 'draft', created_at: new Date().toISOString(), ...payload }) }
  const { data: res } = await http.post('/tests', payload)
  return ok(res.data)
}

export const updateTest = async (id, payload) => {
  if (USE_MOCK) { await delay(); const test = byId(TESTS, id); return test ? ok({ ...test, ...payload }) : notFound() }
  const { data: res } = await http.patch(`/tests/${id}`, payload)
  return ok(res.data)
}

export const publishTest = async (id) => {
  if (USE_MOCK) { return ok({ id, status: 'published', published_at: new Date().toISOString() }) }
  const { data: res } = await http.post(`/tests/${id}/publish`)
  return ok(res.data)
}

export const closeTest = async (id) => {
  const { data: res } = await http.post(`/tests/${id}/close`)
  return ok(res.data)
}

// ── Sections ───────────────────────────────────────────────────────────────────
export const getSections = async (testId) => {
  if (USE_MOCK) { return ok([]) }
  const { data: res } = await http.get(`/tests/${testId}/sections`)
  return ok(res.data)
}

export const createSection = async (testId, payload) => {
  const { data: res } = await http.post(`/tests/${testId}/sections`, payload)
  return ok(res.data)
}

export const updateSection = async (testId, sectionId, payload) => {
  const { data: res } = await http.patch(`/tests/${testId}/sections/${sectionId}`, payload)
  return ok(res.data)
}

export const deleteSection = async (testId, sectionId) => {
  await http.delete(`/tests/${testId}/sections/${sectionId}`)
  return ok(null)
}

// ── Questions ──────────────────────────────────────────────────────────────────
export const getTestQuestions = async (testId) => {
  if (USE_MOCK) { await delay(); return ok(TEST_QUESTIONS[testId] || []) }
  const { data: res } = await http.get(`/tests/${testId}/questions`)
  return ok(res.data)
}

export const saveAllQuestions = async (testId, questions) => {
  const { data: res } = await http.put(`/tests/${testId}/questions`, { questions })
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

// ── Assign to applicants ───────────────────────────────────────────────────────
export const assignTest = async (testId, payload) => {
  const { data: res } = await http.post(`/tests/${testId}/assign`, payload)
  return ok(res.data)
}

export const getAccessTokens = async (testId) => {
  const { data: res } = await http.get(`/tests/${testId}/assign/access-tokens`)
  return ok(res.data)
}

export const resetTestAttempt = async (testId, payload) => {
  const { data: res } = await http.post(`/tests/${testId}/assign/reset`, payload)
  return ok(res.data)
}

// ── Test-taking (applicant) ────────────────────────────────────────────────────
// These use testHttp (sessionStorage token) so the admin's localStorage token
// never interferes when testing in the same browser.
export const startTest = async (testId) => {
  if (USE_MOCK) { return ok({}) }
  const { data: res } = await testHttp.post(`/tests/${testId}/start`)
  return ok(res.data)
}

export const getMyAttempt = async (testId) => {
  const { data: res } = await testHttp.get(`/tests/${testId}/my-attempt`)
  return ok(res.data)
}

export const autosaveResponses = async (testId, responses) => {
  const { data: res } = await testHttp.patch(`/tests/${testId}/autosave`, { responses })
  return ok(res.data)
}

export const submitTest = async (testId, responses) => {
  if (USE_MOCK) { return ok({}) }
  const { data: res } = await testHttp.post(`/tests/${testId}/submit`, { responses })
  return ok(res.data)
}

// legacy aliases
export const submitTestAttempt = submitTest
export const getTestAttempt = async (id) => {
  if (USE_MOCK) { await delay(); const item = TEST_ATTEMPTS.find((a) => a.id === id || a.applicant_id === id); return item ? ok(item) : notFound() }
  const { data: res } = await http.get(`/tests/attempts/${id}`)
  return ok(res.data)
}

export const getAttemptsByTest = async (testId) => {
  if (USE_MOCK) { await delay(); const data = TEST_ATTEMPTS.filter((a) => a.test_id === testId); return ok(data, { total: data.length }) }
  const { data: res } = await http.get(`/tests/${testId}/attempts`)
  return ok(res.data, { total: res.pagination?.total || 0 })
}

// ── Test auth (applicant login) ────────────────────────────────────────────────
export const testLogin = async ({ token, username, password }) => {
  const { data: res } = await testHttp.post('/test-auth/login', { token, username, password })
  return ok(res.data)
}

// ── Admin results ──────────────────────────────────────────────────────────────
export const getApplicantTestResults = async (testId, applicantId) => {
  const { data: res } = await http.get(`/tests/${testId}/results/${applicantId}`)
  return ok(res.data)
}
