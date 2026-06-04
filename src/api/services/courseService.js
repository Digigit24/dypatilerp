import { USE_MOCK } from '../config.js'
import { ok } from './_mock.js'
import http from '../http.js'

export const getCourses = async (filters = {}) => {
  if (USE_MOCK) return ok([], { total: 0 })
  const { data: res } = await http.get('/courses', { params: filters })
  return ok(res.data, { total: res.pagination?.total || 0 })
}

export const getCourseById = async (id) => {
  if (USE_MOCK) return ok(null)
  const { data: res } = await http.get(`/courses/${id}`)
  return ok(res.data)
}

export const createCourse = async (payload) => {
  if (USE_MOCK) return ok({ id: `course_${Date.now()}`, ...payload })
  const { data: res } = await http.post('/courses', payload)
  return ok(res.data)
}

export const updateCourse = async (id, payload) => {
  if (USE_MOCK) return ok({ id, ...payload })
  const { data: res } = await http.put(`/courses/${id}`, payload)
  return ok(res.data)
}

export const deleteCourse = async (id) => {
  if (USE_MOCK) return ok(null)
  await http.delete(`/courses/${id}`)
  return ok(null)
}

export const getCourseDashboard = async (id) => {
  if (USE_MOCK) return ok({})
  const { data: res } = await http.get(`/courses/${id}/dashboard`)
  return ok(res.data)
}

export const updateCoursePreferences = async (id, preferences) => {
  return updateCourse(id, { preferences })
}
