import { create } from 'zustand'
import { getOnboardingStatus } from '../api/services/studentProfileService.js'

// Caches the onboarding-completeness check for the lifetime of the session so
// the gate isn't a request-per-click bottleneck — see App.jsx's OnboardingGate,
// which sits in front of every /student/* route and re-checks only when the
// cache is empty (i.e. once per session) or explicitly refreshed after a save.
export const useOnboardingStore = create((set, get) => ({
  status: null,
  checked: false,
  loading: false,

  checkOnboarding: async (userId) => {
    if (!userId) return null
    if (get().checked) return get().status
    set({ loading: true })
    try {
      const res = await getOnboardingStatus(userId)
      set({ status: res.data, checked: true, loading: false })
      return res.data
    } catch {
      set({ loading: false })
      return null
    }
  },

  setStatus: (status) => set({ status, checked: true }),
  reset: () => set({ status: null, checked: false, loading: false }),
}))
