import { USE_MOCK } from '../config.js'
import { ok } from './_mock.js'
import http from '../http.js'

export const getRoles = async () => {
  if (USE_MOCK) return ok([])
  const { data: res } = await http.get('/roles')
  return ok(res.data)
}

export const getAllPermissions = async () => {
  if (USE_MOCK) return ok({})
  const { data: res } = await http.get('/roles/permissions/all')
  return ok(res.data)
}

export const getRolePermissions = async (roleId) => {
  if (USE_MOCK) return ok([])
  const { data: res } = await http.get(`/roles/${roleId}/permissions`)
  return ok(res.data)
}

export const updateRolePermissions = async (roleId, grants) => {
  if (USE_MOCK) return ok(null)
  const { data: res } = await http.put(`/roles/${roleId}/permissions`, { grants })
  return ok(res.data)
}

export const getMyPermissions = async () => {
  if (USE_MOCK) return ok({ roles: [], permissions: [] })
  const { data: res } = await http.get('/roles/my-permissions')
  return ok(res.data)
}

// ── Team assignments ──────────────────────────────────────────────────────────
export const getAssignments = async (courseId) => {
  if (USE_MOCK) return ok([])
  const { data: res } = await http.get('/roles/assignments', { params: courseId ? { course_id: courseId } : {} })
  return ok(res.data)
}

export const createAssignment = async (payload) => {
  if (USE_MOCK) return ok({})
  const { data: res } = await http.post('/roles/assignments', payload)
  return ok(res.data)
}

export const removeAssignment = async (id) => {
  if (USE_MOCK) return ok(null)
  await http.delete(`/roles/assignments/${id}`)
  return ok(null)
}

export const assignUserRole = async (userId, roleName, courseId = null, batchId = null) => {
  if (USE_MOCK) return ok(null)
  const { data: res } = await http.post(`/users/${userId}/roles`, { role_name: roleName, course_id: courseId, batch_id: batchId })
  return ok(res.data)
}
