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

// ─── Media folders ────────────────────────────────────────────────────────────

export const getFolders = async (filters = {}) => {
  if (USE_MOCK) return ok([])
  const { data: res } = await http.get('/videos/folders', { params: filters })
  return ok(res.data)
}

export const getFolderPath = async (folderId) => {
  if (USE_MOCK) return ok([])
  const { data: res } = await http.get(`/videos/folders/${folderId}/path`)
  return ok(res.data)
}

export const createFolder = async (payload) => {
  if (USE_MOCK) return ok({ id: `f_${Date.now()}`, ...payload })
  const { data: res } = await http.post('/videos/folders', payload)
  return ok(res.data)
}

export const updateFolder = async (id, payload) => {
  if (USE_MOCK) return ok({ id, ...payload })
  const { data: res } = await http.put(`/videos/folders/${id}`, payload)
  return ok(res.data)
}

export const deleteFolder = async (id) => {
  if (USE_MOCK) return ok(null)
  await http.delete(`/videos/folders/${id}`)
  return ok(null)
}

/** Returns the download URL for any media file (requires a session token) */
export const buildDownloadUrl = (mediaId, sessionToken) =>
  `${import.meta.env.VITE_API_URL || 'https://dypatilerp.celiyo.com/api'}/videos/${mediaId}/download?sessionToken=${sessionToken}`

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
  `${import.meta.env.VITE_API_URL || 'https://app.dyperf.com/api'}/videos/${videoId}/stream?sessionToken=${sessionToken}`

/** Returns the thumbnail URL for a video (no auth required) */
export const buildThumbnailUrl = (videoId) =>
  `${import.meta.env.VITE_API_URL || 'https://app.dyperf.com/api'}/videos/${videoId}/thumbnail`

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

// ─── Student submission upload ────────────────────────────────────────────────

/**
 * Request a presigned Zata PUT URL for a student file submission.
 * The file is stored in the course's "Assignments" media folder, linked to the assignment.
 * Returns { upload_url, object_key, media_id }.
 */
export const requestSubmissionUploadUrl = async (payload) => {
  if (USE_MOCK) return ok({ upload_url: '#', object_key: `mock/${Date.now()}/file`, media_id: `mid_${Date.now()}` })
  const { data: res } = await http.post('/videos/upload/submission-url', payload)
  return ok(res.data)
}
