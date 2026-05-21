import { STUDENTS } from '../mock/students.js'
import { USE_MOCK } from '../config.js'
import { applyFilters, byId, delay, notFound, ok } from './_mock.js'

export const getStudents = async (filters = {}) => { if (USE_MOCK) { await delay(); const data = applyFilters(STUDENTS, filters); return ok(data, { total: data.length }) } }
export const getStudentById = async (id) => { if (USE_MOCK) { await delay(); const student = byId(STUDENTS, id); return student ? ok(student) : notFound() } }
export const updateStudent = async (id, payload) => { if (USE_MOCK) { await delay(); const student = byId(STUDENTS, id); return student ? ok({ ...student, ...payload }) : notFound() } }
export const getStudentProgress = async (id) => { if (USE_MOCK) { await delay(); const student = byId(STUDENTS, id); return student ? ok(student.progress_summary) : notFound() } }
