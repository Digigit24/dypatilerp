import { BATCHES } from '../mock/batches.js'
import { USE_MOCK } from '../config.js'
import { applyFilters, byId, delay, notFound, ok } from './_mock.js'
import http from '../http.js'

export const getBatches = async (filters = {}) => {
  if (USE_MOCK) { await delay(); const data = applyFilters(BATCHES, filters); return ok(data, { total: data.length }) }
  const { data: res } = await http.get('/batches', { params: filters })
  return ok(res.data, { total: res.pagination?.total || 0 })
}

export const getBatchById = async (id) => {
  if (USE_MOCK) { await delay(); const batch = byId(BATCHES, id); return batch ? ok(batch) : notFound() }
  const { data: res } = await http.get(`/batches/${id}`)
  return ok(res.data)
}

export const createBatch = async (payload) => {
  if (USE_MOCK) { await delay(); return ok({ id: `batch_${Date.now()}`, enrolled_count: 0, ...payload }) }
  const { data: res } = await http.post('/batches', payload)
  return ok(res.data)
}

export const updateBatch = async (id, payload) => {
  if (USE_MOCK) { await delay(); const batch = byId(BATCHES, id); return batch ? ok({ ...batch, ...payload }) : notFound() }
  const { data: res } = await http.put(`/batches/${id}`, payload)
  return ok(res.data)
}

export const deleteBatch = async (id) => {
  if (USE_MOCK) { await delay(); return ok(null) }
  await http.delete(`/batches/${id}`)
  return ok(null)
}

export const getBatchStudents = async (batchId, filters = {}) => {
  if (USE_MOCK) { return ok([]) }
  const { data: res } = await http.get(`/batches/${batchId}/students`, { params: filters })
  return ok(res.data, { total: res.pagination?.total || 0 })
}

export const getBatchStats = async (batchId) => {
  if (USE_MOCK) { return ok({}) }
  const { data: res } = await http.get(`/batches/${batchId}/stats`)
  return ok(res.data)
}

export const updateApprovalConfig = async (batchId, stages) => {
  if (USE_MOCK) { return ok({ stages }) }
  const { data: res } = await http.put(`/batches/${batchId}/approval-config`, { stages })
  return ok(res.data)
}
