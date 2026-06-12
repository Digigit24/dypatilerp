/**
 * Branding store — DB-driven app logo (app_settings.branding).
 * Holds light + dark logo data-URLs; the sidebar picks one per theme.
 */
import { create } from 'zustand'
import http from '../api/http.js'

const DEFAULTS = { logoLight: '', logoDark: '' }

export const useBrandingStore = create((set, get) => ({
  branding: DEFAULTS,
  loaded: false,
  loadBranding: async () => {
    if (get().loaded) return
    try {
      const { data: res } = await http.get('/settings/branding')
      set({ branding: { ...DEFAULTS, ...(res.data || {}) }, loaded: true })
    } catch {
      set({ loaded: true }) // fall back to the bundled logo silently
    }
  },
  // Called after saving in Settings so the sidebar updates instantly
  setBranding: (branding) => set({ branding: { ...DEFAULTS, ...branding }, loaded: true }),
}))

export const useBranding = () => useBrandingStore((s) => s.branding)
