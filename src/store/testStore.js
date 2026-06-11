import { create } from 'zustand'

/**
 * Stores the test-scoped JWT and answer state for applicant test sessions.
 * Separate from authStore so it doesn't pollute the main auth flow.
 */
export const useTestStore = create((set, get) => ({
  // Auth
  testToken: null,       // JWT for this test session
  testUser: null,        // { id, first_name, last_name, email }
  testId: null,

  // Test data
  test: null,            // full test object (sections + questions)
  attempt: null,         // existing attempt if resuming

  // Answers: { questionId: 'A' | 'B' | 'C' | 'D' }
  answers: {},

  // Timer
  startedAt: null,       // ISO string from server
  durationMinutes: null,

  // ── actions ────────────────────────────────────────────────────────────────
  login: ({ access_token, test_id, user, attempt_status }) => {
    set({ testToken: access_token, testId: test_id, testUser: user, attempt: attempt_status ? { status: attempt_status } : null })
    try { sessionStorage.setItem('test_token', access_token) } catch {}
  },

  setTest: (test) => set({ test }),

  setAttempt: (attempt) => {
    const answers = {}
    if (attempt?.responses) {
      attempt.responses.forEach((r) => { answers[r.question_id] = r.selected_option })
    }
    set({ attempt, answers, startedAt: attempt?.started_at || null, durationMinutes: attempt?.test?.duration_minutes || null })
  },

  setAnswer: (questionId, value) => set((s) => ({ answers: { ...s.answers, [questionId]: value } })),

  loadToken: () => {
    try {
      const t = sessionStorage.getItem('test_token')
      if (t) set({ testToken: t })
      return t
    } catch { return null }
  },

  clear: () => {
    try { sessionStorage.removeItem('test_token') } catch {}
    set({ testToken: null, testUser: null, testId: null, test: null, attempt: null, answers: {}, startedAt: null, durationMinutes: null })
  },
}))
