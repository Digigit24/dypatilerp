import { RESEARCH_PROFILES } from '../mock/researchProfiles.js'
import { USE_MOCK } from '../config.js'
import { delay, notFound, ok } from './_mock.js'
import http from '../http.js'

export const getProfile = async (userId) => {
  if (USE_MOCK) { await delay(); const item = RESEARCH_PROFILES.find((p) => p.student_id === userId); return item ? ok(item) : notFound() }
  const { data: res } = await http.get(`/research-profiles/${userId}`)
  return ok(res.data)
}

export const getProfileBySlug = async (slug) => {
  if (USE_MOCK) { await delay(); const item = RESEARCH_PROFILES.find((p) => p.public_slug === slug); return item ? ok(item) : notFound() }
  const { data: res } = await http.get(`/research-profiles/by-slug/${slug}`)
  return ok(res.data)
}

export const updateProfile = async (userId, payload) => {
  if (USE_MOCK) { await delay(); const item = RESEARCH_PROFILES.find((p) => p.student_id === userId); return item ? ok({ ...item, ...payload, last_updated: new Date().toISOString() }) : notFound() }
  const { data: res } = await http.put(`/research-profiles/${userId}`, payload)
  return ok(res.data)
}

export const addPublication = async (userId, payload) => {
  if (USE_MOCK) { await delay(); return ok({ id: `rpi_${Date.now()}`, ...payload, is_verified: true, verified_at: new Date().toISOString() }) }
  const { data: res } = await http.post(`/research-profiles/${userId}/publications`, payload)
  return ok(res.data)
}

export const deletePublication = async (userId, pubId) => {
  if (USE_MOCK) { await delay(); return ok(null) }
  await http.delete(`/research-profiles/${userId}/publications/${pubId}`)
  return ok(null)
}

export const addResearchItem = async (userId, category, item) => {
  if (USE_MOCK) { await delay(); return ok({ id: `rpi_${Date.now()}`, ...item, is_verified: true, verified_at: new Date().toISOString(), category, student_id: userId }) }
  const { data: res } = await http.post(`/research-profiles/${userId}/publications`, { ...item, category })
  return ok(res.data)
}

export const updateResearchItem = async (userId, category, itemId, payload) => {
  if (USE_MOCK) { await delay(); return ok({ id: itemId, ...payload, category, student_id: userId }) }
  const { data: res } = await http.put(`/research-profiles/${userId}/publications/${itemId}`, payload)
  return ok(res.data)
}

export const deleteResearchItem = async (userId, category, itemId) => {
  if (USE_MOCK) { await delay(); return ok({ student_id: userId, category, itemId, deleted: true }) }
  await http.delete(`/research-profiles/${userId}/publications/${itemId}`)
  return ok({ deleted: true })
}

export const togglePublic = async (userId, is_public) => updateProfile(userId, { is_public })
