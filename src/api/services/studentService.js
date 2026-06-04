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
