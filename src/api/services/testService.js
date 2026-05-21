import { TESTS, TEST_QUESTIONS, TEST_ATTEMPTS } from '../mock/tests.js'
import { USE_MOCK } from '../config.js'
import { byId, delay, notFound, ok } from './_mock.js'

export const getTests = async (filters = {}) => { if (USE_MOCK) { await delay(); let data = [...TESTS]; if (filters.status) data = data.filter((t) => t.status === filters.status); return ok(data, { total: data.length }) } }
export const getTestById = async (id) => { if (USE_MOCK) { await delay(); const test = byId(TESTS, id); return test ? ok(test) : notFound() } }
export const getTestQuestions = async (testId) => { if (USE_MOCK) { await delay(); return ok(TEST_QUESTIONS[testId] || []) } }
export const createTest = async (payload) => { if (USE_MOCK) { await delay(); return ok({ id: `test_${Date.now()}`, status: 'draft', created_at: new Date().toISOString(), ...payload }) } }
export const updateTest = async (id, payload) => { if (USE_MOCK) { await delay(); const test = byId(TESTS, id); return test ? ok({ ...test, ...payload }) : notFound() } }
export const publishTest = async (id) => updateTest(id, { status: 'published', published_at: new Date().toISOString() })
export const getTestAttempt = async (id) => { if (USE_MOCK) { await delay(); const item = TEST_ATTEMPTS.find((a) => a.id === id || a.applicant_id === id); return item ? ok(item) : notFound() } }
export const submitTestAttempt = async (payload) => { if (USE_MOCK) { await delay(300, 600); return ok({ id: `attempt_${Date.now()}`, status: 'submitted', submitted_at: new Date().toISOString(), ...payload }) } }
export const getAttemptsByTest = async (testId) => { if (USE_MOCK) { await delay(); const data = TEST_ATTEMPTS.filter((a) => a.test_id === testId); return ok(data, { total: data.length }) } }
