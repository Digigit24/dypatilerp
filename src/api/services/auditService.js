import { USE_MOCK } from '../config.js'
import { ok } from './_mock.js'
import http from '../http.js'

export const getAuditLogs = async (filters = {}) => {
  if (USE_MOCK) return ok([], { total: 0 })
  const { data: res } = await http.get('/audit-logs', { params: filters })
  return ok(res.data, { total: res.pagination?.total || 0 })
}

export const getAuditActions = async () => {
  if (USE_MOCK) return ok([])
  const { data: res } = await http.get('/audit-logs/actions')
  return ok(res.data)
}

export const getAuditResourceTypes = async () => {
  if (USE_MOCK) return ok([])
  const { data: res } = await http.get('/audit-logs/resource-types')
  return ok(res.data)
}
