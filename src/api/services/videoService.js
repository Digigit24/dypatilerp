import { USE_MOCK } from '../config.js'
import { ok } from './_mock.js'
import http from '../http.js'

// ─── Video CRUD ──────────────────────────────────────────────────────────────

export const getVideos = async (filters = {}) => {
  if (USE_MOCK) return ok([], { total: 0 })
  const { data: res } = await http.get('/videos', { params: filters })
  return ok(res.data, { total: res.pagination?.total || 0 })
}

export const getVideoById = async (id) => {
  if (USE_MOCK) return ok(null)
  const { data: res } = await http.get(`/videos/${id}`)
  return ok(res.data)
}

export const createVideo = async (payload) => {
  if (USE_MOCK) return ok({ id: `v_${Date.now()}`, ...payload })
  const { data: res } = await http.post('/videos', payload)
  return ok(res.data)
}

export const updateVideo = async (id, payload) => {
  if (USE_MOCK) return ok({ id, ...payload })
  const { data: res } = await http.put(`/videos/${id}`, payload)
  return ok(res.data)
}

export const deleteVideo = async (id) => {
  if (USE_MOCK) return ok(null)
  await http.delete(`/videos/${id}`)
  return ok(null)
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export const requestUploadUrl = async (payload) => {
  if (USE_MOCK) return ok({ upload_url: '#', object_key: `mock/${payload.video_id}/video.mp4` })
  const { data: res } = await http.post('/videos/upload/request-url', payload)
  return ok(res.data)
}

export const initCourseFolder = async (courseId) => {
  if (USE_MOCK) return ok({})
  const { data: res } = await http.post(`/videos/courses/${courseId}/init-folder`)
  return ok(res.data)
}

// ─── Streaming session ────────────────────────────────────────────────────────

export const createSession = async (videoId) => {
  if (USE_MOCK) return ok({ token: 'mock_token', video: { id: videoId, duration_sec: 300 } })
  const { data: res } = await http.post(`/videos/${videoId}/session`)
  return ok(res.data)
}

/** Returns the proxy stream URL to pass to the <video> src */
export const buildStreamUrl = (videoId, sessionToken) =>
  `${import.meta.env.VITE_API_URL || 'https://dypatilerp.celiyo.com/api'}/videos/${videoId}/stream?sessionToken=${sessionToken}`

/** Returns the thumbnail URL for a video (no auth required) */
export const buildThumbnailUrl = (videoId) =>
  `${import.meta.env.VITE_API_URL || 'https://dypatilerp.celiyo.com/api'}/videos/${videoId}/thumbnail`

// ─── Progress heartbeat ───────────────────────────────────────────────────────

export const reportProgress = async (videoId, lastPosition, range, durationSec) => {
  if (USE_MOCK) return ok({})
  try {
    const { data: res } = await http.post(`/videos/${videoId}/progress`, {
      last_position: lastPosition,
      range,
      duration_sec: durationSec,
    })
    return ok(res.data)
  } catch { return ok({}) } // non-blocking
}

export const getProgress = async (videoId) => {
  if (USE_MOCK) return ok({ last_position: 0, total_watch_sec: 0, completed: false, watched_ranges: [] })
  const { data: res } = await http.get(`/videos/${videoId}/progress`)
  return ok(res.data)
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export const getVideoAnalytics = async (videoId) => {
  if (USE_MOCK) return ok({ total_viewers: 0, completions: 0, avg_position: 0, watch_logs: [] })
  const { data: res } = await http.get(`/videos/${videoId}/analytics`)
  return ok(res.data)
}
