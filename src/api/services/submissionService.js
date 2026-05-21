import { SUBMISSIONS } from '../mock/submissions.js'
import { USE_MOCK } from '../config.js'
import { applyFilters, byId, delay, notFound, ok } from './_mock.js'

export const getSubmissions = async (filters = {}) => { if (USE_MOCK) { await delay(); const data = applyFilters(SUBMISSIONS, filters); return ok(data, { total: data.length }) } }
export const getSubmissionById = async (id) => { if (USE_MOCK) { await delay(); const item = byId(SUBMISSIONS, id); return item ? ok(item) : notFound() } }
export const createSubmission = async (payload) => { if (USE_MOCK) { await delay(); return ok({ id: `sub_${Date.now()}`, status: 'pending', title_version: 1, submitted_at: new Date().toISOString(), last_updated_at: new Date().toISOString(), ...payload }) } }
export const updateSubmission = async (id, payload) => { if (USE_MOCK) { await delay(); const item = byId(SUBMISSIONS, id); return item ? ok({ ...item, ...payload, last_updated_at: new Date().toISOString() }) : notFound() } }
export const getSubmissionsByStudent = async (student_id) => getSubmissions({ student_id })
