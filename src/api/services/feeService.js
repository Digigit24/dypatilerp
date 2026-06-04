import { FEES } from '../mock/fees.js'
import { USE_MOCK } from '../config.js'
import { applyFilters, byId, delay, notFound, ok } from './_mock.js'
import http from '../http.js'

export const getFees = async (filters = {}) => {
  if (USE_MOCK) { await delay(); const data = applyFilters(FEES, filters); return ok(data, { total: data.length }) }
  const { data: res } = await http.get('/fees', { params: filters })
  return ok(res.data, { total: res.pagination?.total || 0 })
}

export const getFeeById = async (id) => {
  if (USE_MOCK) { await delay(); const fee = byId(FEES, id); return fee ? ok(fee) : notFound() }
  const { data: res } = await http.get(`/fees/${id}`)
  return ok(res.data)
}

export const getFeesByStudent = async (student_user_id) => getFees({ student_user_id })

export const markFeePaid = async (id, payload = {}) => {
  if (USE_MOCK) {
    await delay(250, 500)
    const fee = byId(FEES, id)
    if (!fee) return notFound()
    return ok({
      ...fee, ...payload, status: 'paid',
      paid_at: new Date().toISOString(),
      transaction_id: payload.transaction_id || `TXN-DYP-${Date.now()}`,
      payment_mode: payload.payment_mode || 'mock_payment',
    })
  }
  const { data: res } = await http.post(`/fees/${id}/payments`, {
    amount: payload.amount,
    payment_method: payload.payment_mode || 'bank_transfer',
    transaction_id: payload.transaction_id,
  })
  return ok(res.data)
}
