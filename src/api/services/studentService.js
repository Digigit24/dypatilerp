import { STUDENTS } from '../mock/students.js'
import { USE_MOCK } from '../config.js'
import { applyFilters, byId, delay, notFound, ok } from './_mock.js'
import http from '../http.js'

// Maps real API shape → shape the pages expect (safe to run on both mock and real data)
const normalize = (s) => ({
  ...s,
  permanent_id: s.enrollment_number ?? s.permanent_id ?? s.id,
  enrolled_at: s.enrollment_date ?? s.enrolled_at,
  batch_id: s.batch_id ?? s.batch_name,
  progress_summary: s.progress_summary ?? { completion_percentage: 0, total_submissions: 0, approved_count: 0 },
  profile: s.profile ?? { bio: s.bio ?? '' },
})

export const getStudents = async (filters = {}) => {
  if (USE_MOCK) { await delay(); const data = applyFilters(STUDENTS, filters); return ok(data, { total: data.length }) }
  const { data: res } = await http.get('/students', { params: filters })
  return ok(res.data.map(normalize), { total: res.pagination?.total || 0 })
}

export const getStudentById = async (id) => {
  if (USE_MOCK) { await delay(); const student = byId(STUDENTS, id); return student ? ok(student) : notFound() }
  const { data: res } = await http.get(`/students/${id}`)
  return ok(normalize(res.data))
}

export const updateStudent = async (id, payload) => {
  if (USE_MOCK) { await delay(); const student = byId(STUDENTS, id); return student ? ok({ ...student, ...payload }) : notFound() }
  const { data: res } = await http.put(`/users/${id}`, payload)
  return ok(res.data)
}

export const getStudentProgress = async (id) => {
  if (USE_MOCK) { await delay(); const student = byId(STUDENTS, id); return student ? ok(student.progress_summary) : notFound() }
  const { data: res } = await http.get(`/students/${id}`)
  return ok(res.data.progress_summary ?? {})
}

export const assignGuide = async (studentId, guideData) => {
  if (USE_MOCK) { return ok({}) }
  const { data: res } = await http.post(`/students/${studentId}/guides`, guideData)
  return ok(res.data)
}

/**
 * Export all students (with optional filters) as a CSV file download.
 * Triggers a browser file-save dialogue.
 */
export const exportStudents = async (filters = {}) => {
  if (USE_MOCK) {
    // Build a minimal CSV from mock data in mock mode
    const students = (await getStudents(filters)).data
    const rows = [
      ['First Name', 'Last Name', 'Email', 'Phone', 'Enrollment Number', 'Batch', 'Status', 'Semester', 'Enrolled Date'],
      ...students.map((s) => [s.first_name || '', s.last_name || '', s.email || '', s.phone || '', s.enrollment_number || '', s.batch_id || '', s.status || '', s.current_semester || 1, s.enrolled_at || '']),
    ]
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `students-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    return ok({ downloaded: true })
  }

  // Real: GET /students/export — backend streams CSV
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })

  const response = await http.get(`/students/export?${params}`, { responseType: 'blob' })
  const url      = URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }))
  const a        = document.createElement('a')
  a.href         = url
  a.download     = `students-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  return ok({ downloaded: true })
}

/**
 * Bulk-import students from the mapped JSON array produced by ImportDrawer.
 * students: [{ first_name, last_name, email, phone?, batch_code, enrollment_number?, status?, current_semester? }]
 */
export const importStudents = async (students) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 800))
    return ok({ imported: students.length, skipped: 0, errors: [], total: students.length })
  }
  const { data: res } = await http.post('/students/import', { students })
  return ok(res.data)
}

/**
 * Perform a bulk action on a set of students identified by user_id.
 * action: 'activate' | 'deactivate' | 'suspend'
 */
export const bulkStudentAction = async (ids, action) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400))
    return ok({ updated: ids.length, status: action })
  }
  const { data: res } = await http.post('/students/bulk-action', { ids, action })
  return ok(res.data)
}

/** Soft-delete (archive) a single scholar — sets enrollment to 'withdrawn'. */
export const archiveStudent = async (userId) => {
  if (USE_MOCK) { await delay(); return ok({ archived: 1 }) }
  const { data: res } = await http.delete(`/students/${userId}`)
  return ok(res.data)
}

/** Restore an archived scholar back to active. */
export const restoreStudent = async (userId) => bulkStudentAction([userId], 'restore')
