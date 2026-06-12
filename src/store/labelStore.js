/**
 * UI label store — DB-driven wording (app_settings.ui_labels).
 * Lets the institution rename "Student" to "Scholar" (etc.) without code changes.
 * Logic, backend and database identifiers are untouched — display text only.
 */
import { create } from 'zustand'
import http from '../api/http.js'

const DEFAULTS = { student: 'Student', studentPlural: 'Students' }

export const useLabelStore = create((set, get) => ({
  labels: DEFAULTS,
  loaded: false,
  loadLabels: async () => {
    if (get().loaded) return
    try {
      const { data: res } = await http.get('/settings/ui-labels')
      set({ labels: { ...DEFAULTS, ...(res.data || {}) }, loaded: true })
    } catch {
      set({ loaded: true }) // keep defaults silently
    }
  },
}))

/** Convenience hook: const { student, studentPlural } = useLabels() */
export const useLabels = () => useLabelStore((s) => s.labels)
