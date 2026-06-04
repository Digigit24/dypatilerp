import { PROGRESS_REPORTS } from '../mock/progressReports.js'
import { USE_MOCK } from '../config.js'
import { byId, delay, notFound, ok } from './_mock.js'
import http from '../http.js'

export const getProgressReports = async (filters = {}) => {
  if (USE_MOCK) {
    await delay()
    let data = [...PROGRESS_REPORTS]
    if (filters.student_id) data = data.filter((r) => r.student_id === filters.student_id)
    return ok(data, { total: data.length })
  }
  const { data: res } = await http.get('/progress-reports', { params: filters })
  return ok(res.data, { total: res.pagination?.total || 0 })
}

export const getProgressReportByStudent = async (student_user_id) => getProgressReports({ student_user_id })

export const getProgressReportById = async (id) => {
  if (USE_MOCK) { await delay(); const item = byId(PROGRESS_REPORTS, id); return item ? ok(item) : notFound() }
  const { data: res } = await http.get(`/progress-reports/${id}`)
  return ok(res.data)
}

export const updateProgressReport = async (id, payload) => {
  if (USE_MOCK) { await delay(); const item = byId(PROGRESS_REPORTS, id); return item ? ok({ ...item, ...payload }) : notFound() }
  const { data: res } = await http.put(`/progress-reports/${id}`, payload)
  return ok(res.data)
}

export const generateProgressReportPDF = async (reportId) => {
  if (USE_MOCK) { await delay(300, 600); return ok({ url: `mock-progress-report-${reportId}.pdf`, generated_at: new Date().toISOString() }) }
  const { data: res } = await http.get(`/progress-reports/${reportId}/pdf`)
  return ok(res.data)
}
