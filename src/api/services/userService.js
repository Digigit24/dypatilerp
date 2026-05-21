import { USERS } from '../mock/users.js'
import { USE_MOCK } from '../config.js'
import { applyFilters, byId, delay, notFound, ok } from './_mock.js'

export const getMe = async (role = 'admin') => { if (USE_MOCK) { await delay(); return ok(USERS.find((u) => u.role === role) || USERS[0]) } }
export const getUsers = async (filters = {}) => { if (USE_MOCK) { await delay(); const data = applyFilters(USERS, filters); return ok(data, { total: data.length }) } }
export const getUserById = async (id) => { if (USE_MOCK) { await delay(); const user = byId(USERS, id); return user ? ok(user) : notFound() } }
export const updateUser = async (id, payload) => { if (USE_MOCK) { await delay(); const user = byId(USERS, id); return user ? ok({ ...user, ...payload }) : notFound() } }
