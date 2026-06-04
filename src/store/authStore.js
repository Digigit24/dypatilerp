import { create } from 'zustand'

const loadUser = () => {
  try { return JSON.parse(localStorage.getItem('auth_user') || 'null') }
  catch { return null }
}

export const useAuthStore = create((set) => ({
  currentUser: loadUser(),
  role: loadUser()?.roles?.[0] || null,

  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
    localStorage.setItem('auth_user', JSON.stringify(user))
    set({ currentUser: user, role: user?.roles?.[0] || null })
  },

  clearAuth: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('auth_user')
    set({ currentUser: null, role: null })
  },

  // kept for DevRoleSwitcher compatibility during transition
  setRole: (role) => set({ role }),
}))
