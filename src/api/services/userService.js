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

/** Always resolves — the backend never reveals whether the email is registered. */
export const forgotPassword = async (email) => {
  const { data: res } = await http.post('/auth/forgot-password', { email })
  return { data: res.data, message: res.message }
}

export const resetPassword = async (token, new_password) => {
  const { data: res } = await http.post('/auth/reset-password', { token, new_password })
  return { data: res.data, message: res.message }
}

/** Always resolves — the backend never reveals whether the email is registered. */
export const requestLoginOtp = async (email) => {
  const { data: res } = await http.post('/auth/otp/request', { email })
  return { data: res.data, message: res.message }
}

export const verifyLoginOtp = async (email, code) => {
  const { data: res } = await http.post('/auth/otp/verify', { email, code })
  return ok({ ...res.data, user: normalizeUser(res.data.user) })
}

/** Admin: start a "view as" session for a target user. */
export const impersonateUser = async (id) => {
  const { data: res } = await http.post(`/users/${id}/impersonate`)
  return { data: { ...res.data, target_user: normalizeUser(res.data.target_user) }, message: res.message }
}

/** Best-effort server-side close of the current impersonation session. */
export const endImpersonation = async () => {
  try {
    const { data: res } = await http.post('/auth/end-impersonation')
    return { data: res.data }
  } catch {
    return { data: null }
  }
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

/** One-click: rotate the user's password and email fresh credentials */
export const sendCredentials = async (id) => {
  const { data: res } = await http.post(`/users/${id}/send-credentials`)
  return { data: res.data, message: res.message }
}

/** Admin: set/generate a password; returns the plain password once */
export const resetUserPassword = async (id, payload = {}) => {
  const { data: res } = await http.post(`/users/${id}/reset-password`, payload)
  return { data: res.data }
}

/** Self-service password change */
export const changeMyPassword = async (current_password, new_password) => {
  const { data: res } = await http.post('/users/me/password', { current_password, new_password })
  return { data: res.data }
}

/** Self-service profile photo upload/replace — multipart, field "file". */
export const uploadMyAvatar = async (file) => {
  if (USE_MOCK) return ok({ avatar_url: null })
  const form = new FormData()
  form.append('file', file)
  const { data: res } = await http.post('/users/me/avatar', form)
  return { data: res.data, message: res.message }
}

/** Admin: bulk rotate + email credentials */
export const bulkSendCredentials = async (user_ids) => {
  const { data: res } = await http.post('/users/bulk-send-credentials', { user_ids })
  return { data: res.data, message: res.message }
}

export const deleteUser = async (id) => {
  if (USE_MOCK) { await delay(); return ok({ id, deleted: true }) }
  await http.delete(`/users/${id}`)
  return ok({ id, deleted: true })
}
