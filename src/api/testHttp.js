/**
 * Axios instance exclusively for test-taking endpoints.
 * Uses the test-scoped JWT from sessionStorage — never the admin token from localStorage.
 * This prevents session mixing when an admin and applicant share the same browser.
 */
import axios from 'axios'

const BASE = import.meta.env.PROD
  ? 'https://app.dyperf.com/api'
  : 'https://app.dyperf.com/api'

const testHttp = axios.create({ baseURL: BASE, timeout: 15000 })

testHttp.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('test_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

testHttp.interceptors.response.use(
  (res) => res,
  (error) => {
    // On 401, clear test session and redirect to test login
    if (error.response?.status === 401) {
      sessionStorage.removeItem('test_token')
      window.location.href = '/test-login'
    }
    return Promise.reject(error)
  }
)

export default testHttp
