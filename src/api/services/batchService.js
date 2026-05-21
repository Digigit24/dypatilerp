import { BATCHES } from '../mock/batches.js'
import { USE_MOCK } from '../config.js'
import { applyFilters, byId, delay, notFound, ok } from './_mock.js'

export const getBatches = async (filters = {}) => { if (USE_MOCK) { await delay(); const data = applyFilters(BATCHES, filters); return ok(data, { total: data.length }) } }
export const getBatchById = async (id) => { if (USE_MOCK) { await delay(); const batch = byId(BATCHES, id); return batch ? ok(batch) : notFound() } }
export const createBatch = async (payload) => { if (USE_MOCK) { await delay(); return ok({ id: `batch_${Date.now()}`, enrolled_count: 0, ...payload }) } }
export const updateBatch = async (id, payload) => { if (USE_MOCK) { await delay(); const batch = byId(BATCHES, id); return batch ? ok({ ...batch, ...payload }) : notFound() } }
