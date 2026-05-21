import { APPROVALS } from '../mock/approvals.js'
import { USE_MOCK } from '../config.js'
import { delay, ok } from './_mock.js'

const STORAGE_KEY = 'dyp_approval_reviews'

const storedReviews = () => {
  try {
    if (typeof localStorage === 'undefined') return []
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

const saveReview = (review) => {
  if (typeof localStorage === 'undefined') return
  const reviews = storedReviews()
  localStorage.setItem(STORAGE_KEY, JSON.stringify([review, ...reviews].slice(0, 100)))
}

const allApprovals = () => [...storedReviews(), ...APPROVALS]

export const getApprovals = async (filters = {}) => { if (USE_MOCK) { await delay(); let data = allApprovals(); if (filters.stage) data = data.filter((a) => a.stage === filters.stage); if (filters.status) data = data.filter((a) => a.status === filters.status); return ok(data, { total: data.length }) } }
export const getApprovalsBySubmission = async (submission_id) => { if (USE_MOCK) { await delay(); return ok(allApprovals().filter((a) => a.submission_id === submission_id)) } }
export const reviewSubmission = async (submission_id, payload) => { if (USE_MOCK) { await delay(); const review = { id: `appr_${Date.now()}`, submission_id, reviewed_at: new Date().toISOString(), ...payload }; saveReview(review); return ok(review) } }
export const suggestTitleReframe = async (submission_id, suggested_title) => reviewSubmission(submission_id, { status: 'needs_revision', suggested_title })
