import { create } from 'zustand'
import { DEFAULT_THEME_CONFIG, getThemeConfig, saveThemeConfig } from '../api/services/themeService.js'

let toastId = 0
export const useUiStore = create((set) => ({
  theme: 'light',
  themeConfig: getThemeConfig(),
  toasts: [],
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
  setThemeConfig: (config) => set((s) => ({ themeConfig: saveThemeConfig({ ...s.themeConfig, ...config }) })),
  resetThemeConfig: () => set({ themeConfig: saveThemeConfig(DEFAULT_THEME_CONFIG) }),
  addToast: (toast) => {
    const id = `toast_${++toastId}`
    set((s) => ({ toasts: [{ id, type: 'info', ...toast }, ...s.toasts].slice(0, 3) }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3000)
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
