import { FEES } from '../mock/fees.js'
import { USE_MOCK } from '../config.js'
import { applyFilters, byId, delay, notFound, ok } from './_mock.js'

export const getFees = async (filters = {}) => {
  if (USE_MOCK) {
    await delay()
    const data = applyFilters(FEES, filters)
    return ok(data, { total: data.length })
  }
}

export const getFeeById = async (id) => {
  if (USE_MOCK) {
    await delay()
    const fee = byId(FEES, id)
    return fee ? ok(fee) : notFound()
  }
}

export const getFeesByStudent = async (student_id) => getFees({ student_id })

export const markFeePaid = async (id, payload = {}) => {
  if (USE_MOCK) {
    await delay(250, 500)
    const fee = byId(FEES, id)
    if (!fee) return notFound()
    return ok({
      ...fee,
      ...payload,
      status: 'paid',
      paid_at: new Date().toISOString(),
      transaction_id: payload.transaction_id || `TXN-DYP-${Date.now()}`,
      payment_mode: payload.payment_mode || 'mock_payment',
      remarks: 'Payment marked as received.',
    })
  }
}
