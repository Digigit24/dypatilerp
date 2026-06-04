import { USERS } from '../mock/users.js'
import { USE_MOCK } from '../config.js'
import { applyFilters, byId, delay, notFound, ok } from './_mock.js'
import http from '../http.js'

// PostgreSQL returns text[] as "{admin,coordinator}" — parse to ["admin","coordinator"]
const parseRoles = (raw) => {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') return raw.replace(/^\{|\}$/g, '').split(',').filter(Boolean)
  return []
}

const normalizeUser = (u) => ({
  ...u,
  roles: parseRoles(u.roles ?? u.role_names),
})

export const login = async (email, password) => {
  if (USE_MOCK) {
    await delay()
    const user = USERS.find((u) => u.email === email) || USERS[0]
    return ok({ user, access_token: 'mock_token', refresh_token: 'mock_refresh' })
  }
  const { data: res } = await http.post('/auth/login', { email, password })
  return ok({ ...res.data, user: normalizeUser(res.data.user) })
}

export const logout = async () => {
  if (USE_MOCK) { await delay(); return ok(null) }
  try { await http.post('/auth/logout') } catch { /* ignore */ }
  return ok(null)
}

export const getMe = async () => {
  if (USE_MOCK) {
    await delay()
    return ok(USERS.find((u) => u.role === 'admin') || USERS[0])
  }
  const { data: res } = await http.get('/auth/me')
  return ok(normalizeUser(res.data))
}

export const getUsers = async (filters = {}) => {
  if (USE_MOCK) { await delay(); const data = applyFilters(USERS, filters); return ok(data, { total: data.length }) }
  const { data: res } = await http.get('/users', { params: filters })
  return ok(res.data, { total: res.pagination?.total || 0 })
}

export const getUserById = async (id) => {
  if (USE_MOCK) { await delay(); const user = byId(USERS, id); return user ? ok(user) : notFound() }
  const { data: res } = await http.get(`/users/${id}`)
  return ok(res.data)
}

export const updateUser = async (id, payload) => {
  if (USE_MOCK) { await delay(); const user = byId(USERS, id); return user ? ok({ ...user, ...payload }) : notFound() }
  const { data: res } = await http.put(`/users/${id}`, payload)
  return ok(res.data)
}

export const createUser = async (payload) => {
  if (USE_MOCK) { await delay(); return ok({ id: `user_${Date.now()}`, ...payload }) }
  const { data: res } = await http.post('/users', payload)
  return ok(res.data)
}

export const deleteUser = async (id) => {
  if (USE_MOCK) { await delay(); return ok({ id, deleted: true }) }
  await http.delete(`/users/${id}`)
  return ok({ id, deleted: true })
}
