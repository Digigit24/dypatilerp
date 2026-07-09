import { NOTIFICATIONS } from '../mock/notifications.js'
import { USE_MOCK } from '../config.js'
import { delay, ok } from './_mock.js'
import http from '../http.js'

// `opts.suppressErrorToast` lets the shell notification poll opt out of the global
// 403 toast — it's an optional background call, permission-gated at the caller.
export const getNotifications = async (filters = {}, { suppressErrorToast } = {}) => {
  if (USE_MOCK) {
    await delay()
    let data = [...NOTIFICATIONS]
    if (filters.recipient_id) data = data.filter((n) => n.recipient_id === filters.recipient_id || n.recipient_type === 'all' || n.recipient_batch_id)
    return ok(data, { total: data.length })
  }
  const { data: res } = await http.get('/notifications', { params: filters, suppressErrorToast })
  return ok(res.data, { total: res.pagination?.total || 0 })
}

export const getUnreadCount = async () => {
  if (USE_MOCK) {
    await delay(120, 180)
    return ok(NOTIFICATIONS.filter((n) => !n.is_read).length)
  }
  const { data: res } = await http.get('/notifications', { params: { is_read: false, limit: 1 } })
  return ok(res.pagination?.total || 0)
}

export const markAsRead = async (id) => {
  if (USE_MOCK) { await delay(150, 220); return ok({ id, is_read: true }) }
  await http.put(`/notifications/${id}/read`)
  return ok({ id, is_read: true })
}

export const markAllAsRead = async () => {
  if (USE_MOCK) { await delay(); return ok({ updated: true }) }
  await http.put('/notifications/mark-all-read')
  return ok({ updated: true })
}

export const sendNotification = async (payload) => {
  if (USE_MOCK) {
    await delay()
    return ok({ id: `notif_${Date.now()}`, created_at: new Date().toISOString(), is_read: false, ...payload })
  }
  const { data: res } = await http.post('/notifications', payload)
  return ok(res.data)
}

// ─── Automation engine ─────────────────────────────────────────────────────────

/** Last 50 automated (event-driven) emails for a course. */
export const getNotificationQueue = async (courseId) => {
  const { data: res } = await http.get('/notifications/queue', { params: courseId ? { course_id: courseId } : {} })
  return ok(res.data)
}

/** Immediately run the fee-due / deadline-overdue scans for a course. */
export const runNotificationScans = async (courseId) => {
  const { data: res } = await http.post('/notifications/run-scans', courseId ? { course_id: courseId } : {})
  return ok(res.data)
}
