import { create } from 'zustand'

const DEFAULT_MODULES = {
  applicants: true, students: true, batches: true, progress: true,
  approvals: true, fees: true, 'test-builder': true, notifications: true,
  lectures: true, users: true, settings: true, courses: true, roles: true, 'audit-logs': true,
}

const load = () => {
  try { return JSON.parse(localStorage.getItem('dyp_course_ctx') || 'null') }
  catch { return null }
}

const save = (ctx) => {
  try { localStorage.setItem('dyp_course_ctx', JSON.stringify(ctx)) }
  catch { /* ignore */ }
}

export const getModulePrefs = (course) => ({
  ...DEFAULT_MODULES,
  ...(course?.preferences?.modules || {}),
})

export const useCourseStore = create((set, get) => {
  const saved = load()
  return {
    courses: [],
    currentCourse: saved?.currentCourse || null,
    currentBatch: saved?.currentBatch || null,

    setCourses: (courses) => {
      const { currentCourse, currentBatch } = get()
      const found = currentCourse ? courses.find((c) => c.id === currentCourse.id) : null
      const next = found || courses[0] || null
      // Preserve the active batch when the course hasn't changed (so navigating
      // routes / reloading keeps the header's batch selection). Only reset the
      // batch when we actually switch to a different course.
      const keptBatch = found && next?.id === currentCourse?.id ? currentBatch : null
      save({ currentCourse: next, currentBatch: keptBatch })
      set({ courses, currentCourse: next, currentBatch: keptBatch })
    },

    setCurrentCourse: (course) => {
      save({ currentCourse: course, currentBatch: null })
      set({ currentCourse: course, currentBatch: null })
    },

    setCurrentBatch: (batch) => {
      const { currentCourse } = get()
      save({ currentCourse, currentBatch: batch })
      set({ currentBatch: batch })
    },

    // Update the in-memory copy of currentCourse after editing preferences
    patchCurrentCourse: (updates) => {
      const { currentCourse, courses } = get()
      if (!currentCourse) return
      const patched = { ...currentCourse, ...updates }
      const updatedCourses = courses.map((c) => (c.id === patched.id ? patched : c))
      save({ currentCourse: patched, currentBatch: get().currentBatch })
      set({ currentCourse: patched, courses: updatedCourses })
    },
  }
})
