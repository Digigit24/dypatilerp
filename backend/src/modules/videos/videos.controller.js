import * as svc from './videos.service.js';
import * as s3 from '../../services/s3.js';
import { ok, created, notFound, noContent } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';
import { query } from '../../config/database.js';

// ─── Public-ish video listing ─────────────────────────────────────────────────

export const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const is_published = req.query.is_published !== undefined
    ? req.query.is_published === 'true'
    : (req.user.roles?.includes('admin') || req.user.roles?.includes('coordinator') ? undefined : true);
  const { data, total } = await svc.listVideos({ course_id: req.query.course_id, batch_id: req.query.batch_id, is_published, limit, offset });
  res.json({ success: true, data, pagination: buildPaginationMeta(total, page, limit) });
});

export const getOne = asyncHandler(async (req, res) => {
  const video = await svc.getVideoById(req.params.id);
  if (!video) return notFound(res, 'Video not found');
  ok(res, video);
});

export const create = asyncHandler(async (req, res) => {
  const video = await svc.createVideo(req.body, req.user.id);
  created(res, video, 'Video created');
});

export const update = asyncHandler(async (req, res) => {
  const video = await svc.updateVideo(req.params.id, req.body);
  if (!video) return notFound(res, 'Video not found');
  ok(res, video, 'Video updated');
});

export const remove = asyncHandler(async (req, res) => {
  const video = await svc.deleteVideo(req.params.id);
  if (!video) return notFound(res, 'Video not found');
  // Delete from Zata if configured
  if (s3.isConfigured() && video.object_key) {
    try { await s3.deleteObject(video.object_key); } catch { /* object might not exist */ }
  }
  noContent(res);
});

// ─── Session + Streaming ──────────────────────────────────────────────────────

export const createSession = asyncHandler(async (req, res) => {
  const video = await svc.getVideoById(req.params.id);
  if (!video || !video.is_published) return notFound(res, 'Video not found or not published');
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  const session = await svc.createSession(req.user.id, video.id, ip, req.headers['user-agent']);
  ok(res, {
    token: session.token,
    expires_at: session.expires_at,
    video: { id: video.id, title: video.title, duration_sec: video.duration_sec },
  });
});

export const streamVideo = asyncHandler(async (req, res) => {
  if (!s3.isConfigured()) {
    return res.status(503).json({ success: false, message: 'Video streaming is not configured — add Zata credentials to .env' });
  }

  const session = await svc.validateSession(req.query.sessionToken);
  if (!session) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session token' });
  }
  if (session.video_id !== req.params.id) {
    return res.status(403).json({ success: false, message: 'Token does not match this video' });
  }

  const range = req.headers.range;
  try {
    await s3.streamVideoRange(session.object_key, range, res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Stream error', detail: err.message });
    }
  }
});

// ─── Watch progress heartbeat ─────────────────────────────────────────────────

export const reportProgress = asyncHandler(async (req, res) => {
  const { last_position, range, duration_sec } = req.body;
  const log = await svc.upsertWatchLog(req.user.id, req.params.id, last_position, range, duration_sec);
  ok(res, log);
});

export const getProgress = asyncHandler(async (req, res) => {
  const log = await svc.getWatchLog(req.user.id, req.params.id);
  ok(res, log || { video_id: req.params.id, last_position: 0, total_watch_sec: 0, completed: false, watched_ranges: [] });
});

// ─── Upload helpers ───────────────────────────────────────────────────────────

export const requestUploadUrl = asyncHandler(async (req, res) => {
  if (!s3.isConfigured()) {
    return res.status(503).json({ success: false, message: 'Storage not configured' });
  }
  const { filename, course_code, video_id, content_type } = req.body;
  if (!filename || !course_code || !video_id) {
    return res.status(400).json({ success: false, message: 'filename, course_code and video_id are required' });
  }
  const objectKey = s3.buildVideoKey(course_code, video_id, filename);
  const uploadUrl = await s3.presignedUploadUrl(objectKey, 3600, content_type || 'video/mp4');
  ok(res, { upload_url: uploadUrl, object_key: objectKey });
});

export const initCourseFolder = asyncHandler(async (req, res) => {
  if (!s3.isConfigured()) {
    return res.status(503).json({ success: false, message: 'Storage not configured' });
  }
  const { rows: [course] } = await query('SELECT code, name FROM courses WHERE id=$1', [req.params.courseId]);
  if (!course) return notFound(res, 'Course not found');
  const folderKey = await s3.createCourseFolder(course.code);
  ok(res, { folder_key: folderKey, course_code: course.code, bucket: process.env.ZATA_VIDEOS_BUCKET });
});

// ─── Analytics ────────────────────────────────────────────────────────────────

export const getAnalytics = asyncHandler(async (req, res) => {
  const [analytics, logs] = await Promise.all([
    svc.getVideoAnalytics(req.params.id),
    svc.getBatchWatchLogs(req.params.id),
  ]);
  ok(res, { ...analytics, watch_logs: logs });
});
