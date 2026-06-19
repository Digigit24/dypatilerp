import axios from 'axios'
import { useCourseStore } from '../store/courseStore.js'
import { useUiStore } from '../store/uiStore.js'

const BASE =
    import.meta.env.VITE_API_URL ||
    'https://app.dyperf.com/api'

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

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    // Global permission-denied handling: clear toast, no silent failures
    if (error.response?.status === 403) {
      const msg = error.response?.data?.message || 'You do not have permission to perform this action.'
      try {
        useUiStore.getState().addToast({ type: 'error', title: 'Permission denied', message: msg })
      } catch { /* store not ready — ignore */ }
    }
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE}/auth/refresh`, { refresh_token: refresh })
          const { access_token, refresh_token } = data.data
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
