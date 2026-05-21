import { RESEARCH_PROFILES } from '../mock/researchProfiles.js'
import { USE_MOCK } from '../config.js'
import { delay, notFound, ok } from './_mock.js'

export const getProfile = async (student_id) => { if (USE_MOCK) { await delay(); const item = RESEARCH_PROFILES.find((p) => p.student_id === student_id); return item ? ok(item) : notFound() } }
export const getProfileBySlug = async (slug) => { if (USE_MOCK) { await delay(); const item = RESEARCH_PROFILES.find((p) => p.public_slug === slug); return item ? ok(item) : notFound() } }
export const updateProfile = async (student_id, payload) => { if (USE_MOCK) { await delay(); const item = RESEARCH_PROFILES.find((p) => p.student_id === student_id); return item ? ok({ ...item, ...payload, last_updated: new Date().toISOString() }) : notFound() } }
export const addResearchItem = async (student_id, category, item) => { if (USE_MOCK) { await delay(); return ok({ id: `rpi_${Date.now()}`, ...item, is_verified: true, verified_at: new Date().toISOString(), category, student_id }) } }
export const updateResearchItem = async (student_id, category, itemId, payload) => { if (USE_MOCK) { await delay(); return ok({ id: itemId, ...payload, category, student_id }) } }
export const deleteResearchItem = async (student_id, category, itemId) => { if (USE_MOCK) { await delay(); return ok({ student_id, category, itemId, deleted: true }) } }
export const togglePublic = async (student_id, is_public) => updateProfile(student_id, { is_public })
