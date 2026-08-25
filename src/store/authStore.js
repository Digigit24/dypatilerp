import { create } from 'zustand'
import { useOnboardingStore } from './onboardingStore.js'

const loadUser = () => {
  try { return JSON.parse(localStorage.getItem('auth_user') || 'null') }
  catch { return null }
}

const loadImpersonation = () => {
  try { return JSON.parse(localStorage.getItem('impersonation') || 'null') }
  catch { return null }
}

// Keys used to park the admin's own session while an impersonation is active.
// Kept in one place so authStore and http.js's 401 handler never drift apart.
const ADMIN_ACCESS_KEY = 'admin_access_token'
const ADMIN_REFRESH_KEY = 'admin_refresh_token'
const ADMIN_USER_KEY = 'admin_user'

export const useAuthStore = create((set) => ({
  currentUser: loadUser(),
  role: loadUser()?.roles?.[0] || null,
  // { startedAt } while an admin is viewing as another user, else null.
  impersonation: loadImpersonation(),

  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
    localStorage.setItem('auth_user', JSON.stringify(user))
    // A fresh login always starts a clean, non-impersonated session — clear
    // any stale parked-admin state left over from an interrupted flow.
    localStorage.removeItem('impersonation')
    localStorage.removeItem(ADMIN_ACCESS_KEY)
    localStorage.removeItem(ADMIN_REFRESH_KEY)
    localStorage.removeItem(ADMIN_USER_KEY)
    set({ currentUser: user, role: user?.roles?.[0] || null, impersonation: null })
    // A same-tab login as a different student must not reuse the previous
    // student's cached onboarding-completeness check.
    useOnboardingStore.getState().reset()
  },

  clearAuth: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('impersonation')
    localStorage.removeItem(ADMIN_ACCESS_KEY)
    localStorage.removeItem(ADMIN_REFRESH_KEY)
    localStorage.removeItem(ADMIN_USER_KEY)
    set({ currentUser: null, role: null, impersonation: null })
    useOnboardingStore.getState().reset()
  },

  /**
   * Admin → target. Parks the admin's own tokens under separate keys and
   * switches the active session to the short-lived impersonation token. No
   * refresh token is issued for an impersonated session — it simply expires
   * after 15 minutes rather than being silently renewed.
   */
  startImpersonation: ({ targetUser, accessToken }) => {
    localStorage.setItem(ADMIN_ACCESS_KEY, localStorage.getItem('access_token') || '')
    localStorage.setItem(ADMIN_REFRESH_KEY, localStorage.getItem('refresh_token') || '')
    localStorage.setItem(ADMIN_USER_KEY, localStorage.getItem('auth_user') || '')

    localStorage.setItem('access_token', accessToken)
    localStorage.removeItem('refresh_token')
    localStorage.setItem('auth_user', JSON.stringify(targetUser))

    const impersonation = { startedAt: Date.now() }
    localStorage.setItem('impersonation', JSON.stringify(impersonation))
    set({ currentUser: targetUser, role: targetUser?.roles?.[0] || null, impersonation })
    useOnboardingStore.getState().reset()
  },

  /**
   * Target → admin. Restores the parked admin session. Falls back to a full
   * logout (returns false) if no parked session is found — defensive only;
   * should not happen since impersonation is always entered via setAuth first.
   * Returns true when the admin session was restored.
   *
   * Idempotent: if there's no impersonation in progress at all, this is a
   * pure no-op that returns true. Without this guard, two call sites racing
   * (e.g. http.js's 401 handler restoring the admin session, followed a tick
   * later by the banner's own "Return to Admin" handler also calling this)
   * would have the SECOND call find the parked keys already cleared by the
   * first and misread that as "no admin session to restore" — wiping the
   * just-restored admin session into a full logout instead of doing nothing.
   */
  endImpersonation: () => {
    if (!localStorage.getItem('impersonation')) return true

    const adminAccess = localStorage.getItem(ADMIN_ACCESS_KEY)
    const adminRefresh = localStorage.getItem(ADMIN_REFRESH_KEY)
    const adminUserRaw = localStorage.getItem(ADMIN_USER_KEY)
    localStorage.removeItem('impersonation')
    localStorage.removeItem(ADMIN_ACCESS_KEY)
    localStorage.removeItem(ADMIN_REFRESH_KEY)
    localStorage.removeItem(ADMIN_USER_KEY)

    let restored = false
    if (adminAccess && adminUserRaw) {
      let adminUser = null
      try { adminUser = JSON.parse(adminUserRaw) } catch { /* corrupt — fall through to logout */ }
      if (adminUser) {
        localStorage.setItem('access_token', adminAccess)
        if (adminRefresh) localStorage.setItem('refresh_token', adminRefresh)
        else localStorage.removeItem('refresh_token')
        localStorage.setItem('auth_user', adminUserRaw)
        set({ currentUser: adminUser, role: adminUser?.roles?.[0] || null, impersonation: null })
        restored = true
      }
    }
    if (!restored) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('auth_user')
      set({ currentUser: null, role: null, impersonation: null })
    }
    useOnboardingStore.getState().reset()
    return restored
  },

  // kept for DevRoleSwitcher compatibility during transition
  setRole: (role) => set({ role }),
}))
