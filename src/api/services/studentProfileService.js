import { USE_MOCK } from '../config.js'
import { ok } from './_mock.js'
import http from '../http.js'

// V4 onboarding — personal-info fields + profile-scoped document uploads
// (backend/src/modules/students/student-profile.*). No mock fixtures exist
// for this yet, so mock mode returns a synthetic "already complete" profile —
// good enough to keep the mock-mode app usable without a real backend.

const MOCK_DETAILS = {
  first_name: 'Demo', middle_name: null, last_name: 'Scholar', phone: '9999999999', email: 'demo@example.com',
  father_name: 'Demo Father', mother_name: 'Demo Mother', date_of_birth: '1995-01-01',
  postal_address: '123 Demo Street', blood_group: 'O+', onboarding_completed_at: new Date().toISOString(),
}
const MOCK_SLOTS = ['cv', 'research_proposal', 'publications_list', 'research_statement', 'passport', 'aadhar_card', 'pan_card', 'marksheet_graduation', 'marksheet_postgraduation', 'phd_result', 'photo']
const MOCK_STATUS = { complete: true, onboarding_completed_at: MOCK_DETAILS.onboarding_completed_at, info_complete: true, documents_complete: true, missing_info_fields: [], missing_documents: [] }

export const getProfileDetails = async (userId) => {
  if (USE_MOCK) return ok(MOCK_DETAILS)
  const { data: res } = await http.get(`/students/${userId}/profile-details`)
  return ok(res.data)
}

export const saveProfileDetails = async (userId, payload) => {
  if (USE_MOCK) return ok({ ...MOCK_DETAILS, ...payload, onboarding: MOCK_STATUS })
  const { data: res } = await http.put(`/students/${userId}/profile-details`, payload)
  return ok(res.data)
}

export const getDocuments = async (userId) => {
  if (USE_MOCK) return ok(MOCK_SLOTS.map((slot) => ({ slot, kind: 'document', present: true, filename: `${slot}.pdf` })))
  const { data: res } = await http.get(`/students/${userId}/documents`)
  return ok(res.data)
}

export const getOnboardingStatus = async (userId) => {
  if (USE_MOCK) return ok(MOCK_STATUS)
  const { data: res } = await http.get(`/students/${userId}/onboarding-status`)
  return ok(res.data)
}

/** Admin toggle — lets this one scholar into the app without finishing onboarding. */
export const setOnboardingSkip = async (userId, skip) => {
  if (USE_MOCK) return ok({ onboarding_skip: skip, onboarding: { ...MOCK_STATUS, onboarding_skip: skip } })
  const { data: res } = await http.patch(`/students/${userId}/onboarding-skip`, { skip })
  return ok(res.data)
}

/** Uploads (or replaces) the file for one onboarding document slot. Multipart, field "file". */
export const uploadDocument = async (userId, slot, file) => {
  if (USE_MOCK) return ok({ media_id: `mid_${Date.now()}`, slot, filename: file.name, onboarding: MOCK_STATUS })
  const form = new FormData()
  form.append('file', file)
  const { data: res } = await http.post(`/students/${userId}/documents/${slot}`, form)
  return ok(res.data)
}
