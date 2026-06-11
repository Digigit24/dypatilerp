import * as svc from './videos.service.js';
import * as s3 from '../../services/s3.js';
import * as local from '../../services/localVideo.js';
import { ok, created, notFound, noContent } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';
import { query } from '../../config/database.js';
import { IncomingForm } from 'formidable';
import { unlink } from 'fs/promises';
import { existsSync, createReadStream } from 'fs';

// ─── Public-ish video listing ─────────────────────────────────────────────────

export const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const is_published = req.query.is_published !== undefined
    ? req.query.is_published === 'true'
    : (req.user.roles?.includes('admin') || req.user.roles?.includes('coordinator') ? undefined : true);
  // X-Course-Id header takes precedence over query param
  const course_id = req.courseId || req.query.course_id;
  const { data, total } = await svc.listVideos({ course_id, batch_id: req.query.batch_id, is_published, limit, offset });
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
  if (s3.isConfigured() && video.object_key) {
    try { await s3.deleteObject(video.object_key); } catch { /* ignore */ }
  }
  noContent(res);
});

// ─── Session + Streaming ──────────────────────────────────────────────────────

export const createSession = asyncHandler(async (req, res) => {
  const video = await svc.getVideoById(req.params.id);
  const isAdmin = req.user?.roles?.some((r) => ['admin', 'coordinator', 'academic_guide', 'industry_mentor'].includes(r));
  if (!video || (!video.is_published && !isAdmin)) return notFound(res, 'Video not found or not published');
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  const session = await svc.createSession(req.user.id, video.id, ip, req.headers['user-agent']);

  // Tell frontend whether a poster/thumbnail is available
  const hasThumbnail = local.thumbExists(video.id) || !!video.thumbnail_key;
  const posterUrl = hasThumbnail
    ? `${req.protocol}://${req.get('host')}/api/videos/${video.id}/thumbnail`
    : null;

  ok(res, {
    token:      session.token,
    expires_at: session.expires_at,
    poster_url: posterUrl,
    video: {
      id:           video.id,
      title:        video.title,
      duration_sec: video.duration_sec,
    },
  });
});

export const streamVideo = asyncHandler(async (req, res) => {
  const session = await svc.validateSession(req.query.sessionToken);
  if (!session) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session token' });
  }
  if (session.video_id !== req.params.id) {
    return res.status(403).json({ success: false, message: 'Token does not match this video' });
  }

  const range = req.headers.range;

  // ── 1. Local storage (primary — works even when Zata is down) ─────────────
  if (session.object_key && local.videoExists(session.object_key)) {
    return local.streamRange(session.object_key, range, res);
  }

  // ── 2. Zata fallback ──────────────────────────────────────────────────────
  if (s3.isConfigured() && session.object_key) {
    try {
      return await s3.streamVideoRange(session.object_key, range, res);
    } catch (err) {
      if (!res.headersSent) {
        return res.status(502).json({
          success: false,
          message: 'Video storage temporarily unavailable',
          detail: err.message,
        });
      }
    }
  }

  if (!res.headersSent) {
    res.status(503).json({
      success: false,
      message: 'Video file not found — it may still be processing or the storage service is unavailable',
    });
  }
});

// ─── Thumbnail ────────────────────────────────────────────────────────────────

export const getThumbnail = asyncHandler(async (req, res) => {
  const video = await svc.getVideoById(req.params.id);
  if (!video) return notFound(res, 'Video not found');

  // Required for cross-origin media/image loads (Vite dev server ≠ API port)
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  // 1. Locally generated thumbnail
  if (local.thumbExists(video.id)) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return createReadStream(local.thumbPath(video.id)).pipe(res);
  }

  // 2. Try auto-generating from local video
  if (video.object_key && local.videoExists(video.object_key)) {
    const generated = await local.generateThumbnail(video.object_key, video.id);
    if (generated && local.thumbExists(video.id)) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return createReadStream(local.thumbPath(video.id)).pipe(res);
    }
  }

  // 3. SVG placeholder so the player always has a poster
  const initials = (video.title || 'V').slice(0, 2).toUpperCase();
  const title    = (video.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 60);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#g)"/>
  <circle cx="640" cy="330" r="90" fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.25)" stroke-width="2"/>
  <text x="640" y="348" font-family="system-ui,sans-serif" font-size="52" font-weight="700"
        fill="rgba(99,102,241,0.9)" text-anchor="middle">${initials}</text>
  <text x="640" y="460" font-family="system-ui,sans-serif" font-size="24" fill="rgba(255,255,255,0.35)"
        text-anchor="middle">${title}</text>
</svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.send(svg);
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

/**
 * Proxy upload — browser posts multipart here, we:
 *  1. Save file to local storage immediately (works with no Zata)
 *  2. Push to Zata in background (best-effort)
 *  3. Auto-generate thumbnail + probe duration via ffmpeg (best-effort)
 */
export const proxyUpload = asyncHandler(async (req, res) => {
  if (!s3.isConfigured() && process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, message: 'Storage not configured' });
  }

  const form = new IncomingForm({ maxFileSize: 4 * 1024 * 1024 * 1024 }); // 4 GB
  const { fields, files } = await new Promise((resolve, reject) =>
    form.parse(req, (err, f, fi) => err ? reject(err) : resolve({ fields: f, files: fi }))
  );

  const file = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  const filename     = (Array.isArray(fields.filename)    ? fields.filename[0]    : fields.filename)    || file.originalFilename;
  const course_code  = (Array.isArray(fields.course_code) ? fields.course_code[0] : fields.course_code);
  const video_id     = (Array.isArray(fields.video_id)    ? fields.video_id[0]    : fields.video_id);
  const content_type = (Array.isArray(fields.content_type)? fields.content_type[0]: fields.content_type) || file.mimetype || 'video/mp4';

  if (!filename || !course_code || !video_id) {
    await unlink(file.filepath).catch(() => {});
    return res.status(400).json({ success: false, message: 'filename, course_code and video_id are required' });
  }

  const objectKey = s3.buildVideoKey(course_code, video_id, filename);

  try {
    // ── 1. Save locally ───────────────────────────────────────────────────
    local.saveVideo(file.filepath, objectKey);
    console.log(`[upload] Saved locally: ${objectKey}`);

    // ── 2. Push to Zata in background ────────────────────────────────────
    if (s3.isConfigured()) {
      s3.uploadFile(objectKey, local.videoPath(objectKey), content_type, file.size)
        .then(() => console.log(`[upload] Synced to Zata: ${objectKey}`))
        .catch((e) => console.warn(`[upload] Zata sync failed (non-fatal): ${e.message}`));
    }

    // ── 3. Thumbnail + duration (best-effort, non-blocking) ───────────────
    local.generateThumbnail(objectKey, video_id).catch(() => {});
    local.probeDuration(objectKey).then((dur) => {
      if (dur > 0) svc.updateVideo(video_id, { duration_sec: dur }).catch(() => {});
    }).catch(() => {});

    ok(res, { object_key: objectKey, file_size: file.size });
  } finally {
    // Temp file from formidable — safe to delete since we copied it
    await unlink(file.filepath).catch(() => {});
  }
});

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
