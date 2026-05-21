import { APPLICANTS } from '../mock/applicants.js'
import { USE_MOCK } from '../config.js'
import { byId, delay, notFound, ok } from './_mock.js'

export const getApplicants = async (filters = {}) => { if (USE_MOCK) { await delay(); let data = [...APPLICANTS]; if (filters.status) data = data.filter((a) => a.status === filters.status); if (filters.batch_id) data = data.filter((a) => a.batch_id === filters.batch_id); if (filters.search) data = data.filter((a) => `${a.personal.full_name} ${a.personal.email}`.toLowerCase().includes(filters.search.toLowerCase())); return ok(data, { total: data.length }) } }
export const getApplicantById = async (id) => { if (USE_MOCK) { await delay(); const item = byId(APPLICANTS, id); return item ? ok(item) : notFound() } }
export const createApplicant = async (payload) => { if (USE_MOCK) { await delay(300, 600); return ok({ id: `app_${Date.now()}`, temp_id: `APP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`, status: 'submitted', applied_at: new Date().toISOString(), ...payload }) } }
export const updateApplicantStatus = async (id, status) => { if (USE_MOCK) { await delay(); const item = byId(APPLICANTS, id); return item ? ok({ ...item, status }) : notFound() } }
export const shortlistApplicant = async (id) => { if (USE_MOCK) { await delay(); const item = byId(APPLICANTS, id); if (!item) return notFound(); console.log(`EMAIL SENT: login credentials to ${item.personal.email}`); return ok({ ...item, status: 'shortlisted' }) } }
