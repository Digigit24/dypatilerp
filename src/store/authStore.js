import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  currentUser: null,
  role: 'admin',
  setRole: (role) => set({ role }),
  login: (userData) => set({ currentUser: userData, role: userData?.role || 'admin' }),
  logout: () => set({ currentUser: null }),
}))
