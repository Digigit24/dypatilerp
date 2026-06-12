import { USE_MOCK } from '../config.js'
import { ok } from './_mock.js'
import http from '../http.js'

export const getFormats = async (filters = {}) => {
  if (USE_MOCK) return ok([])
  const { data: res } = await http.get('/formats', { params: filters })
  return ok(res.data)
}

export const createFormat = async (payload) => {
  if (USE_MOCK) return ok({ id: `f_${Date.now()}`, ...payload })
  const { data: res } = await http.post('/formats', payload)
  return ok(res.data)
}

export const updateFormat = async (id, payload) => {
  if (USE_MOCK) return ok({ id, ...payload })
  const { data: res } = await http.patch(`/formats/${id}`, payload)
  return ok(res.data)
}

export const deleteFormat = async (id) => {
  if (USE_MOCK) return ok(null)
  await http.delete(`/formats/${id}`)
  return ok(null)
}
