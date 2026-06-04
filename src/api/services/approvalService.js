import { APPROVALS } from '../mock/approvals.js'
import { USE_MOCK } from '../config.js'
import { delay, ok } from './_mock.js'
import http from '../http.js'

const STORAGE_KEY = 'dyp_approval_reviews'

const storedReviews = () => {
  try {
    if (typeof localStorage === 'undefined') return []
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch { return [] }
}

const saveReview = (review) => {
  if (typeof localStorage === 'undefined') return
  const reviews = storedReviews()
  localStorage.setItem(STORAGE_KEY, JSON.stringify([review, ...reviews].slice(0, 100)))
}

const allApprovals = () => [...storedReviews(), ...APPROVALS]

export const getApprovals = async (filters = {}) => {
  if (USE_MOCK) {
    await delay()
    let data = allApprovals()
    if (filters.stage) data = data.filter((a) => a.stage === filters.stage)
    if (filters.status) data = data.filter((a) => a.status === filters.status)
    return ok(data, { total: data.length })
  }
  const { data: res } = await http.get('/approvals', { params: filters })
  return ok(res.data, { total: res.pagination?.total || 0 })
}

export const getPendingApprovals = async () => {
  if (USE_MOCK) { await delay(); return ok(allApprovals().filter((a) => a.status === 'pending')) }
  const { data: res } = await http.get('/approvals/pending')
  return ok(res.data)
}

export const getApprovalsBySubmission = async (submission_id) => {
  if (USE_MOCK) { await delay(); return ok(allApprovals().filter((a) => a.submission_id === submission_id)) }
  const { data: res } = await http.get('/approvals', { params: { submission_id } })
  return ok(res.data)
}

export const reviewSubmission = async (approvalId, payload) => {
  if (USE_MOCK) {
    await delay()
    const review = { id: `appr_${Date.now()}`, submission_id: approvalId, reviewed_at: new Date().toISOString(), ...payload }
    saveReview(review)
    return ok(review)
  }
  // payload: { action: 'approve'|'reject'|'request_revision', comments? }
  const { data: res } = await http.post(`/approvals/${approvalId}/action`, payload)
  return ok(res.data)
}

export const suggestTitleReframe = async (approvalId, suggested_title) =>
  reviewSubmission(approvalId, { action: 'request_revision', comments: `Suggested title: ${suggested_title}`, suggested_title })
