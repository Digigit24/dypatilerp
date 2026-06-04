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

export const updateRolePermissions = async (roleId, permissionIds) => {
  if (USE_MOCK) return ok(null)
  const { data: res } = await http.put(`/roles/${roleId}/permissions`, { permission_ids: permissionIds })
  return ok(res.data)
}

export const assignUserRole = async (userId, roleName, courseId = null, batchId = null) => {
  if (USE_MOCK) return ok(null)
  const { data: res } = await http.post(`/users/${userId}/roles`, { role_name: roleName, course_id: courseId, batch_id: batchId })
  return ok(res.data)
}
