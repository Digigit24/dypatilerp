import { create } from 'zustand'
import { DEFAULT_THEME_CONFIG, getThemeConfig, saveThemeConfig, applyThemeConfig } from '../api/services/themeService.js'
import { saveUserPreferences } from '../api/services/settingsService.js'

// ─── Dark mode DOM helper ────────────────────────────────────────────────────

const THEME_STORAGE_KEY = 'dyp_color_scheme'

const getStoredColorScheme = () => {
  try { return localStorage.getItem(THEME_STORAGE_KEY) || 'light' } catch { return 'light' }
}

const applyColorScheme = (scheme) => {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', scheme)
  try { localStorage.setItem(THEME_STORAGE_KEY, scheme) } catch {}
}

// Apply on boot
applyColorScheme(getStoredColorScheme())

// ─── Store ────────────────────────────────────────────────────────────────────

let toastId = 0

export const useUiStore = create((set, get) => ({
  theme: getStoredColorScheme(),
  themeConfig: getThemeConfig(),
  toasts: [],

  // ── Color scheme (light / dark) ──────────────────────────────────────────

  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light'
    applyColorScheme(next)
    set({ theme: next })
    // Persist to backend (fire-and-forget)
    saveUserPreferences({ colorScheme: next }).catch(() => {})
  },

  setTheme: (scheme) => {
    applyColorScheme(scheme)
    set({ theme: scheme })
  },

  // ── Accent color ─────────────────────────────────────────────────────────

  setThemeConfig: (config) => {
    const merged = saveThemeConfig({ ...get().themeConfig, ...config })
    set({ themeConfig: merged })
    // Persist to backend (fire-and-forget)
    saveUserPreferences({ primaryColor: merged.primaryColor }).catch(() => {})
  },

  resetThemeConfig: () => {
    const next = saveThemeConfig(DEFAULT_THEME_CONFIG)
    set({ themeConfig: next })
    saveUserPreferences({ primaryColor: DEFAULT_THEME_CONFIG.primaryColor }).catch(() => {})
  },

  /**
   * Load preferences from backend and apply them (call once after login).
   * @param {{ colorScheme?: string, primaryColor?: string }} prefs
   */
  applyUserPreferences: (prefs = {}) => {
    if (!prefs || typeof prefs !== 'object') return
    // Color scheme
    if (prefs.colorScheme && prefs.colorScheme !== get().theme) {
      applyColorScheme(prefs.colorScheme)
      set({ theme: prefs.colorScheme })
    }
    // Primary color
    if (prefs.primaryColor) {
      const merged = saveThemeConfig({ ...get().themeConfig, primaryColor: prefs.primaryColor })
      set({ themeConfig: merged })
    }
  },

  // ── Toasts ────────────────────────────────────────────────────────────────

  addToast: (toast) => {
    const id = `toast_${++toastId}`
    set((s) => ({ toasts: [{ id, type: 'info', ...toast }, ...s.toasts].slice(0, 3) }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3000)
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
