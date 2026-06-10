/**
 * Settings API service
 *
 * Covers:
 *   - Global app settings (Brevo config, etc.)  → GET/PUT /settings/:key
 *   - User preferences (theme, dark mode, etc.) → GET/PATCH /users/me/preferences
 */

import http from '../http.js'
import { USE_MOCK } from '../config.js'

// ─── App-level settings (admin only) ─────────────────────────────────────────

/** Get a single settings key value object */
export const getSettings = async (key) => {
  if (USE_MOCK) return { data: {} }
  const { data: res } = await http.get(`/settings/${key}`)
  return { data: res.data }
}

/** Upsert a settings key */
export const saveSettings = async (key, value) => {
  if (USE_MOCK) return { data: value }
  const { data: res } = await http.put(`/settings/${key}`, value)
  return { data: res.data }
}

/** Send a test email to verify Brevo configuration */
export const sendTestEmail = async ({ to, apiKey, senderName, senderEmail }) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 800))
    return { data: { delivered: true, mock: true } }
  }
  const { data: res } = await http.post('/settings/test-email', { to, apiKey, senderName, senderEmail })
  return { data: res.data }
}

// ─── User preferences (current user) ─────────────────────────────────────────

/** Load the current user's preferences from the backend */
export const getUserPreferences = async () => {
  if (USE_MOCK) {
    try {
      const stored = JSON.parse(localStorage.getItem('dyp_user_prefs') || '{}')
      return { data: stored }
    } catch { return { data: {} } }
  }
  const { data: res } = await http.get('/users/me/preferences')
  return { data: res.data }
}

/** Merge-patch the current user's preferences */
export const saveUserPreferences = async (patch) => {
  if (USE_MOCK) {
    const existing = JSON.parse(localStorage.getItem('dyp_user_prefs') || '{}')
    const merged = { ...existing, ...patch }
    localStorage.setItem('dyp_user_prefs', JSON.stringify(merged))
    return { data: merged }
  }
  const { data: res } = await http.patch('/users/me/preferences', patch)
  return { data: res.data }
}
