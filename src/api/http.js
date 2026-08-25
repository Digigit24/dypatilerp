import axios from 'axios'
import { useCourseStore } from '../store/courseStore.js'
import { useUiStore } from '../store/uiStore.js'
import { useAuthStore } from '../store/authStore.js'
import { BASE_URL } from './config.js'

const BASE = BASE_URL

const http = axios.create({ baseURL: BASE, timeout: 15000 })

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`

  // Attach active course so every backend list endpoint filters to the right course.
  // useCourseStore.getState() is safe to call outside React (Zustand stores are plain JS objects).
  const { currentCourse, currentBatch } = useCourseStore.getState()
  if (currentCourse?.id) {
    config.headers['X-Course-Id'] = currentCourse.id
  }
  // Active batch (when one is selected in the header) narrows every list/dashboard
  // endpoint to that batch. "All Batches" (null) leaves the course-wide view intact.
  if (currentBatch?.id) {
    config.headers['X-Batch-Id'] = currentBatch.id
  }

  return config
})

// A single in-flight refresh call shared by every request that 401s at the
// same moment. Without this, each concurrent request independently called
// /auth/refresh; the backend revokes ALL of a user's refresh tokens on every
// call, so the second call invalidated the token the first one just issued —
// whichever response landed second got an unrecoverable 401 and bounced the
// user to /login even though nothing was actually wrong with their session.
let refreshPromise = null

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    // Global permission-denied handling: clear toast, no silent failures.
    // Opt-out per request via `suppressErrorToast` for OPTIONAL/background calls
    // (e.g. the shell notification poll) so an unauthorized enrichment fetch can't
    // spam this toast. This is per-request only — real user-initiated actions do
    // not set the flag and still surface their 403s.
    if (error.response?.status === 403 && !error.config?.suppressErrorToast) {
      const msg = error.response?.data?.message || 'You do not have permission to perform this action.'
      try {
        useUiStore.getState().addToast({ type: 'error', title: 'Permission denied', message: msg })
      } catch { /* store not ready — ignore */ }
    }
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      // Impersonation tokens are short-lived and never refreshed — a 401 here
      // means the view-as session ended (explicitly, or its 15 minutes ran
      // out). Return to the admin's own parked session instead of bouncing to
      // /login, which would otherwise log the ADMIN out of their own account.
      if (useAuthStore.getState().impersonation) {
        const restored = useAuthStore.getState().endImpersonation()
        try {
          useUiStore.getState().addToast({
            type: restored ? 'info' : 'error',
            title: restored ? 'Impersonation ended' : 'Session expired',
            message: restored
              ? 'Your view-as session ended. You are back in your own account.'
              : 'Please log in again.',
          })
        } catch { /* store not ready — ignore */ }
        window.location.href = restored ? '/admin' : '/login'
        return Promise.reject(error)
      }

      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          if (!refreshPromise) {
            refreshPromise = axios
              .post(`${BASE}/auth/refresh`, { refresh_token: refresh })
              .then(({ data }) => data.data)
              .finally(() => { refreshPromise = null })
          }
          const { access_token, refresh_token } = await refreshPromise
          localStorage.setItem('access_token', access_token)
          localStorage.setItem('refresh_token', refresh_token)
          original.headers.Authorization = `Bearer ${access_token}`
          return http(original)
        } catch (refreshErr) {
          // Only log out when the refresh token was genuinely rejected.
          // Network errors / 5xx (e.g. DB timeout) must NOT destroy the session.
          const st = refreshErr.response?.status
          if (st === 400 || st === 401 || st === 403) {
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
            localStorage.removeItem('auth_user')
            window.location.href = '/login'
          }
        }
      } else {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default http
