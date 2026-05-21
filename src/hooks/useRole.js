import { useAuthStore } from '../store/authStore.js'
export const useRole = () => useAuthStore((s) => s.role)
