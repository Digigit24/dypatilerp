import { NOTIFICATIONS } from '../mock/notifications.js'
import { USE_MOCK } from '../config.js'
import { delay, ok } from './_mock.js'

export const getNotifications = async (filters = {}) => { if (USE_MOCK) { await delay(); let data = [...NOTIFICATIONS]; if (filters.recipient_id) data = data.filter((n) => n.recipient_id === filters.recipient_id || n.recipient_type === 'all' || n.recipient_batch_id); return ok(data, { total: data.length }) } }
export const markAsRead = async (id) => { if (USE_MOCK) { await delay(150, 220); return ok({ id, is_read: true }) } }
export const markAllAsRead = async (recipient_id) => { if (USE_MOCK) { await delay(); return ok({ recipient_id, updated: true }) } }
export const sendNotification = async (payload) => { if (USE_MOCK) { await delay(); console.log(`NOTIFICATION SENT to ${payload.recipient_type || payload.recipient_id || 'all'}`); return ok({ id: `notif_${Date.now()}`, created_at: new Date().toISOString(), is_read: false, ...payload }) } }
export const getUnreadCount = async (recipient_id) => { if (USE_MOCK) { await delay(120, 180); return ok(NOTIFICATIONS.filter((n) => !n.is_read && (!recipient_id || n.recipient_id === recipient_id || n.recipient_batch_id)).length) } }
