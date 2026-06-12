import { APPLICANTS } from '../mock/applicants.js'
import { USE_MOCK } from '../config.js'
import { byId, delay, notFound, ok } from './_mock.js'
import http from '../http.js'

// Maps real API flat shape → nested shape the pages expect
const normalize = (a) => {
  if (a.personal) return a // already mock-shaped
  return {
    ...a,
    personal: {
      full_name: `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim(),
      first_name: a.first_name,
      last_name: a.last_name,
      email: a.email,
      phone: a.phone,
      mobile: a.phone,
      state_country: a.state ?? a.country ?? '',
    },
    academic: {
      phd_completion_year: a.phd_details?.completion_year ?? a.phd_details?.phd_completion_year,
      phd_discipline: a.phd_details?.discipline ?? a.phd_details?.phd_discipline,
      phd_research_title: a.phd_details?.research_title ?? a.phd_details?.phd_research_title,
      scopus_publications: a.phd_details?.scopus_publications,
      university: a.phd_details?.university ?? '—',
      graduation_year: a.phd_details?.completion_year,
      specialization: a.phd_details?.discipline,
    },
    research_statement: a.research_statement ?? a.phd_details?.research_title ?? '',
  }
}

export const getApplicants = async (filters = {}) => {
  if (USE_MOCK) {
    await delay()
    let data = [...APPLICANTS]
    if (filters.status) data = data.filter((a) => a.status === filters.status)
    if (filters.batch_id) data = data.filter((a) => a.batch_id === filters.batch_id)
    if (filters.search) data = data.filter((a) => `${a.personal?.full_name ?? ''} ${a.personal?.email ?? ''}`.toLowerCase().includes(filters.search.toLowerCase()))
    return ok(data, { total: data.length })
  }
  const { data: res } = await http.get('/applicants', { params: filters })
  return ok(res.data.map(normalize), { total: res.pagination?.total || 0 })
}

export const getApplicantById = async (id) => {
  if (USE_MOCK) { await delay(); const item = byId(APPLICANTS, id); return item ? ok(item) : notFound() }
  const { data: res } = await http.get(`/applicants/${id}`)
  return ok(normalize(res.data))
}

/** Bulk-import applicants (mapped rows from the import wizard) into a course */
export const importApplicants = async (applicants, courseId, defaultBatchId = null) => {
  if (USE_MOCK) {
    await delay(400, 800)
    return { data: { imported: applicants.length, skipped: 0, errors: [], total: applicants.length } }
  }
  const { data: res } = await http.post('/applicants/import', { applicants, course_id: courseId, default_batch_id: defaultBatchId || undefined })
  return { data: res.data }
}

/** Fetch ALL applicants for export (course-scoped via header, no pagination cap) */
export const exportApplicants = async (filters = {}) => {
  if (USE_MOCK) {
    await delay()
    return ok([...APPLICANTS])
  }
  const { data: res } = await http.get('/applicants/export', { params: filters })
  return ok(res.data.map(normalize))
}

export const createApplicant = async (payload) => {
  if (USE_MOCK) {
    await delay(300, 600)
    return ok({ id: `app_${Date.now()}`, temp_id: `APP-${new Date().getFullYear()}-0001`, status: 'submitted', applied_at: new Date().toISOString(), ...payload })
  }
  const { data: res } = await http.post('/applicants', payload)
  return ok(normalize(res.data))
}

export const updateApplicantDetails = async (id, payload) => {
  if (USE_MOCK) { await delay(); const item = byId(APPLICANTS, id); return item ? ok({ ...item, ...payload }) : notFound() }
  const { data: res } = await http.put(`/applicants/${id}`, payload)
  return ok(normalize(res.data))
}

export const updateApplicantStatus = async (id, status, batch_id) => {
  if (USE_MOCK) { await delay(); const item = byId(APPLICANTS, id); return item ? ok({ ...item, status }) : notFound() }
  const { data: res } = await http.put(`/applicants/${id}/status`, { status, batch_id })
  return ok(normalize(res.data))
}

export const shortlistApplicant = async (id) => updateApplicantStatus(id, 'shortlisted')

export const convertToStudent = async (id, batch_id, extra = {}) => {
  if (USE_MOCK) { return ok({}) }
  const { data: res } = await http.post(`/applicants/${id}/convert`, { batch_id, ...extra })
  return ok(res.data)
}

export const bulkConvert = async (applicant_ids, batch_id) => {
  if (USE_MOCK) { return ok([]) }
  const { data: res } = await http.post('/applicants/bulk-convert', { applicant_ids, batch_id })
  return ok(res.data)
}
