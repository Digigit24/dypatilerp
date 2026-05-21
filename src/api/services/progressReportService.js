import { PROGRESS_REPORTS } from '../mock/progressReports.js'
import { USE_MOCK } from '../config.js'
import { byId, delay, notFound, ok } from './_mock.js'

export const getProgressReports = async (filters = {}) => { if (USE_MOCK) { await delay(); let data = [...PROGRESS_REPORTS]; if (filters.student_id) data = data.filter((r) => r.student_id === filters.student_id); return ok(data, { total: data.length }) } }
export const getProgressReportByStudent = async (student_id) => getProgressReports({ student_id })
export const getProgressReportById = async (id) => { if (USE_MOCK) { await delay(); const item = byId(PROGRESS_REPORTS, id); return item ? ok(item) : notFound() } }
export const generateProgressReportPDF = async (reportId) => { if (USE_MOCK) { await delay(300, 600); return ok({ url: `mock-progress-report-${reportId}.pdf`, generated_at: new Date().toISOString() }) } }
