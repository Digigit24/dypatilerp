import { USE_MOCK } from '../config.js'
import { ok } from './_mock.js'
import http from '../http.js'

export const getEmailLogs = async (filters = {}) => {
  if (USE_MOCK) return ok([], { total: 0 })
  const { data: res } = await http.get('/email-logs', { params: filters })
  return ok(res.data, { total: res.pagination?.total || 0 })
}

export const getEmailLogKinds = async () => {
  if (USE_MOCK) return ok([])
  const { data: res } = await http.get('/email-logs/kinds')
  return ok(res.data)
}
