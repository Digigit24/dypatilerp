import * as svc from './videos.service.js';
import * as subSvc from '../submissions/submissions.service.js';
import * as s3 from '../../services/s3.js';
import * as local from '../../services/localVideo.js';
import { ok, created, notFound, noContent, forbidden, badRequest } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';
import { query } from '../../config/database.js';
import { IncomingForm } from 'formidable';
import { unlink, open } from 'fs/promises';
import { existsSync, createReadStream } from 'fs';
import crypto from 'crypto';
import { env } from '../../config/env.js';

// ─── Public-ish video listing ─────────────────────────────────────────────────

export const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const roles = req.user?.roles || [];
  const isAdmin = roles.some((r) => ['admin', 'coordinator'].includes(r));

  const is_published = req.query.is_published !== undefined
    ? req.query.is_published === 'true'
    : (isAdmin ? undefined : true);

  // X-Course-Id header takes precedence over query param
  const course_id = req.courseId || req.query.course_id;

  const { data, total } = await svc.listVideos({
    course_id,
    batch_id: req.query.batch_id,
    is_published,
    media_type: req.query.media_type,
    folder_id: req.query.folder_id,
    // Pass visibility filter: admin overrides via query, others filtered by role
    visibility: isAdmin ? req.query.visibility : undefined,
    user_roles: isAdmin ? undefined : roles,
    limit,
    offset,
  });
  res.json({ success: true, data, pagination: buildPaginationMeta(total, page, limit) });
});

// ─── Media folders ────────────────────────────────────────────────────────────

export const listFolders = asyncHandler(async (req, res) => {
  const course_id = req.courseId || req.query.course_id;
  const folders = await svc.listFolders({ course_id, parent_id: req.query.parent_id });
  ok(res, folders);
});

export const getFolderPath = asyncHandler(async (req, res) => {
  const path = await svc.getFolderPath(req.params.id);
  ok(res, path);
});

export const createFolder = asyncHandler(async (req, res) => {
  if (!req.body.name?.trim()) return res.status(400).json({ success: false, message: 'Folder name is required' });
  const folder = await svc.createFolder({
    course_id: req.body.course_id || req.courseId || null,
    parent_id: req.body.parent_id || null,
    name: req.body.name.trim(),
  }, req.user.id);
  created(res, folder, 'Folder created');
});

export const updateFolder = asyncHandler(async (req, res) => {
  const folder = await svc.updateFolder(req.params.id, req.body);
  if (!folder) return notFound(res, 'Folder not found');
  ok(res, folder, 'Folder updated');
});

export const removeFolder = asyncHandler(async (req, res) => {
  const folder = await svc.deleteFolder(req.params.id);
  if (!folder) return notFound(res, 'Folder not found');
  noContent(res);
});

export const getOne = asyncHandler(async (req, res) => {
  const video = await svc.getVideoById(req.params.id);
  if (!video) return notFound(res, 'Video not found');
  ok(res, video);
});

export const create = asyncHandler(async (req, res) => {
  // Video feature is disabled — documents only. See CLAUDE.md.
  const mediaType = req.body?.media_type || 'video';
  if (mediaType === 'video' && !env.VIDEO_UPLOADS_ENABLED) {
    return res.status(422).json({
      success: false,
      code: 'VIDEO_DISABLED',
      message: 'Video is currently disabled. Upload documents (PDF, PPT, DOCX, images) instead.',
    });
  }
  const video = await svc.createVideo(req.body, req.user.id);
  created(res, video, 'Media registered');
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
  if (!video) return notFound(res, 'Video not found or not published');
  const roles = req.user?.roles || [];
  const isAdmin = roles.some((r) => ['admin', 'coordinator', 'academic_guide', 'industry_mentor'].includes(r));

  if (video.submission_id) {
    // Private submission file: only the owning scholar, an admin, or an assigned
    // reviewer for that submission. is_published is never used for these.
    const { rows: [sub] } = await query('SELECT student_user_id FROM submissions WHERE id=$1', [video.submission_id]);
    const isOwner = sub && sub.student_user_id === req.user.id;
    // Coordinators administer progress-report uploads alongside admins, so they
    // can open a submission-bound file even when they aren't the resolved
    // reviewer on one of its stages.
    const isSiteAdmin = roles.includes('admin') || roles.includes('coordinator');
    let isReviewer = false;
    if (sub && !isOwner && !isSiteAdmin) {
      const { rows: [a] } = await query(
        `SELECT 1 FROM approvals WHERE submission_id=$1
           AND (reviewer_user_id=$2 OR (reviewer_user_id IS NULL AND reviewer_role = ANY($3::text[]))) LIMIT 1`,
        [video.submission_id, req.user.id, roles]
      );
      isReviewer = !!a;
    }
    if (!(isOwner || isSiteAdmin || isReviewer)) return forbidden(res);
  } else if (video.approval_id) {
    // Feedback document attached to one approval stage — same visibility as
    // that stage's submission: the owning scholar, an admin/coordinator, or
    // an assigned reviewer on that submission.
    const { rows: [ap] } = await query(
      `SELECT a.reviewer_user_id, a.reviewer_role, s.student_user_id
       FROM approvals a JOIN submissions s ON s.id=a.submission_id WHERE a.id=$1`,
      [video.approval_id]
    );
    const isOwner = ap && ap.student_user_id === req.user.id;
    const isSiteAdmin = roles.includes('admin') || roles.includes('coordinator');
    const isReviewer = ap && (ap.reviewer_user_id === req.user.id || (ap.reviewer_user_id === null && ap.reviewer_role && roles.includes(ap.reviewer_role)));
    if (!(isOwner || isSiteAdmin || isReviewer)) return forbidden(res);
  } else if (!video.is_published && !isAdmin) {
    return notFound(res, 'Video not found or not published');
  }

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
  const contentType = session.mime_type || 'video/mp4';

  // ── 1. Zata is the source of truth — always read it first ────────────────
  if (s3.isConfigured() && session.object_key) {
    try {
      return await s3.streamVideoRange(session.object_key, range, res);
    } catch (err) {
      // Fall through to the local cache below before surfacing an error.
      if (env.STORAGE_LOCAL_CACHE && session.object_key && local.videoExists(session.object_key)) {
        return local.streamRange(session.object_key, range, res, contentType);
      }
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

/**
 * Download any media file (admin preview / file download).
 * Validated via sessionToken (same flow as streaming).
 */
export const downloadMedia = asyncHandler(async (req, res) => {
  const session = await svc.validateSession(req.query.sessionToken);
  if (!session) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session token' });
  }
  if (session.video_id !== req.params.id) {
    return res.status(403).json({ success: false, message: 'Token does not match this file' });
  }

  const contentType = session.mime_type || 'application/octet-stream';
  const safeName = (session.title || 'download').replace(/[^a-zA-Z0-9 ._-]/g, '_');
  const ext = session.object_key?.split('.').pop() || '';
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}${ext ? `.${ext}` : ''}"`);

  if (s3.isConfigured() && session.object_key) {
    try {
      return await s3.streamVideoRange(session.object_key, null, res);
    } catch (err) {
      if (env.STORAGE_LOCAL_CACHE && session.object_key && local.videoExists(session.object_key)) {
        return local.streamRange(session.object_key, null, res, contentType);
      }
      if (!res.headersSent) {
        return res.status(502).json({ success: false, message: 'Storage temporarily unavailable', detail: err.message });
      }
    }
  }
  if (!res.headersSent) {
    res.status(503).json({ success: false, message: 'File not found in storage' });
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
  // Zata is the SINGLE SOURCE OF TRUTH. The old implementation wrote to local
  // disk first and pushed to Zata as unawaited background work whose failure was
  // only a console.warn — on a host with an ephemeral filesystem that silently
  // lost files while the DB row still claimed they existed. Now: upload to Zata,
  // verify it landed, and only then report success. Local disk is an optional
  // read cache, never the record.
  if (!s3.isConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'File storage is not configured. Set ZATA_ACCESS_KEY, ZATA_SECRET_KEY, ZATA_ENDPOINT and ZATA_VIDEOS_BUCKET.',
    });
  }

  const form = new IncomingForm({ maxFileSize: 4 * 1024 * 1024 * 1024 }); // 4 GB
  const { fields, files } = await new Promise((resolve, reject) =>
    form.parse(req, (err, f, fi) => err ? reject(err) : resolve({ fields: f, files: fi }))
  );

  const file = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  const one = (v) => (Array.isArray(v) ? v[0] : v);
  const filename     = one(fields.filename)     || file.originalFilename;
  const course_code  = one(fields.course_code);
  const video_id     = one(fields.video_id);
  const content_type = one(fields.content_type) || file.mimetype || 'application/octet-stream';
  const isVideo = content_type.startsWith('video/');

  const cleanup = async () => { await unlink(file.filepath).catch(() => {}); };

  // ── Video feature is disabled — reject video uploads at the door ─────────
  if (isVideo && !env.VIDEO_UPLOADS_ENABLED) {
    await cleanup();
    return res.status(422).json({
      success: false,
      code: 'VIDEO_DISABLED',
      message: 'Video uploads are currently disabled. Documents (PDF, PPT, DOCX, images) are supported.',
    });
  }

  if (!filename || !course_code || !video_id) {
    await cleanup();
    return res.status(400).json({ success: false, message: 'filename, course_code and video_id are required' });
  }

  const objectKey = s3.buildVideoKey(course_code, video_id, filename);

  try {
    // ── 1. Upload to Zata and BLOCK on it ─────────────────────────────────
    await s3.uploadFile(objectKey, file.filepath, content_type, file.size);

    // ── 2. Verify it actually landed before we tell anyone it succeeded ────
    let verifiedSize = file.size;
    try {
      const head = await s3.headObject(objectKey);
      if (head?.ContentLength != null) verifiedSize = Number(head.ContentLength);
    } catch (headErr) {
      return res.status(502).json({
        success: false,
        message: 'Upload could not be verified in storage — please retry.',
        detail: headErr.message,
      });
    }

    // ── 3. Optional local read cache. Failure here is genuinely harmless. ──
    if (env.STORAGE_LOCAL_CACHE) {
      try { local.saveVideo(file.filepath, objectKey); } catch { /* cache only */ }
    }

    return ok(res, { object_key: objectKey, file_size: verifiedSize, mime_type: content_type });
  } catch (err) {
    // Nothing is written to the database when the object is not in storage.
    return res.status(502).json({
      success: false,
      message: 'Storage upload failed — nothing was saved. Please retry.',
      detail: err.message,
    });
  } finally {
    await cleanup();
  }
});

export const requestUploadUrl = asyncHandler(async (req, res) => {
  if (!s3.isConfigured()) {
    return res.status(503).json({ success: false, message: 'Storage not configured' });
  }
  const { filename, course_code, video_id, content_type } = req.body;
  if ((content_type || '').startsWith('video/') && !env.VIDEO_UPLOADS_ENABLED) {
    return res.status(422).json({ success: false, code: 'VIDEO_DISABLED', message: 'Video uploads are currently disabled.' });
  }
  if (!filename || !course_code || !video_id) {
    return res.status(400).json({ success: false, message: 'filename, course_code and video_id are required' });
  }
  const objectKey = s3.buildVideoKey(course_code, video_id, filename);
  const uploadUrl = await s3.presignedUploadUrl(objectKey, 3600, content_type || 'video/mp4');
  ok(res, { upload_url: uploadUrl, object_key: objectKey });
});

// ─── Submission attachments ───────────────────────────────────────────────────
//
// File rules differ by submission kind (SOP-V2 §M2/M3):
//   progress_report -> exactly two NAMED slots: report (PDF) + presentation (PPT/PPTX)
//   assignment      -> many files, mixed types
//   target          -> one or more files, mixed types
//
// Every type is checked three ways: extension, declared MIME, and real content
// signature (magic bytes), so a renamed file is always caught.

const MIME_BY_EXT = {
  pdf:  ['application/pdf'],
  ppt:  ['application/vnd.ms-powerpoint'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  doc:  ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls:  ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  png:  ['image/png'],
  jpg:  ['image/jpeg'],
  jpeg: ['image/jpeg'],
  webp: ['image/webp'],
  zip:  ['application/zip', 'application/x-zip-compressed'],
};

// Which extensions each kind accepts.
const EXTS_BY_KIND = {
  progress_report: ['pdf', 'ppt', 'pptx'],
  assignment: ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'webp', 'zip'],
  target:     ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'webp', 'zip'],
};

// Named slots for a progress report — either slot takes either file type
// (a scholar's report or presentation can each be a PDF or a PPT/PPTX).
const PROGRESS_REPORT_EXTS = ['pdf', 'ppt', 'pptx'];
const SLOT_EXTS = { report: PROGRESS_REPORT_EXTS, presentation: PROGRESS_REPORT_EXTS };

const MAX_FILE_BYTES = 50 * 1024 * 1024;    // per file
const MAX_TOTAL_BYTES = 200 * 1024 * 1024;  // per submission

// Content-signature families. zip covers every OOXML format (pptx/docx/xlsx).
const EXT_FAMILY = {
  pdf: 'pdf', pptx: 'zip', docx: 'zip', xlsx: 'zip', zip: 'zip',
  ppt: 'ole', doc: 'ole', xls: 'ole',
  png: 'png', jpg: 'jpg', jpeg: 'jpg', webp: 'webp',
};
const sniffFamily = (buf) => {
  if (buf.length >= 5 && buf.slice(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b) return 'zip';                       // PK.. (OOXML/zip)
  if (buf.length >= 4 && buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) return 'ole';
  if (buf.length >= 8 && buf[0] === 0x89 && buf.slice(1, 4).toString('latin1') === 'PNG') return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length >= 12 && buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
};

/** Canonical storage key mirroring the Media UI folder tree (SOP-V2 §2.7). */
const buildSubmissionKey = ({ courseCode, batchCode, semester, kind, submissionId, filename, slot }) => {
  const safe = (v) => String(v || '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const folder = kind === 'progress_report' ? 'progress-reports' : kind === 'target' ? 'targets' : 'assignments';
  const name = slot ? `${slot}-${safe(filename)}` : safe(filename);
  return [safe(courseCode), safe(batchCode) || 'no-batch', `sem-${Number(semester) || 1}`,
          folder, submissionId, name].join('/');
};

/**
 * POST /submissions/:submissionId/attachment[?slot=report|presentation]
 *
 * Streams the file to Zata server-side (no browser->Zata hop, so no extra CORS),
 * verifies it landed, records a private submission-bound media row, and appends
 * a server-generated descriptor to file_urls. If anything fails the object is
 * removed again — a media row never exists without its object.
 */
export const uploadSubmissionAttachment = asyncHandler(async (req, res) => {
  if (!s3.isConfigured()) {
    return res.status(503).json({ success: false, message: 'File storage is not configured.' });
  }

  const submissionId = req.params.submissionId;
  const { rows: [sub] } = await query(
    `SELECT s.id, s.student_user_id, s.status, s.submission_type, s.semester,
            s.file_urls, s.target_id, s.cycle_id,
            b.course_id, b.code AS batch_code, c.code AS course_code
     FROM submissions s
     JOIN batches b ON b.id = s.batch_id
     JOIN courses c ON c.id = b.course_id
     WHERE s.id = $1`,
    [submissionId]
  );
  if (!sub) return notFound(res, 'Submission not found');

  const actorRoles = req.user.roles || [];
  const isStaff = actorRoles.includes('admin') || actorRoles.includes('coordinator');
  if (sub.student_user_id !== req.user.id && !isStaff) return forbidden(res);

  const kind = sub.target_id ? 'target'
             : sub.submission_type === 'assignment' ? 'assignment'
             : 'progress_report';
  const allowedExts = EXTS_BY_KIND[kind] || EXTS_BY_KIND.progress_report;

  // Files may be attached while the submission is still open for editing.
  if (!['draft', 'needs_revision'].includes(sub.status)) {
    return badRequest(res, 'Files can only be attached before the submission is sent for review.');
  }

  // A progress report requires a named slot; other kinds never use one.
  let slot = (req.query.slot || '').trim() || null;
  if (kind === 'progress_report') {
    if (!slot || !SLOT_EXTS[slot]) {
      return badRequest(res, 'A progress report needs slot=report or slot=presentation.');
    }
  } else {
    slot = null;
  }

  const existing = Array.isArray(sub.file_urls) ? sub.file_urls : [];
  const usedBytes = existing.reduce((a, f) => a + (Number(f.size) || 0), 0);

  const form = new IncomingForm({ maxFileSize: MAX_FILE_BYTES, maxFiles: 1, keepExtensions: true });
  let files;
  try {
    ({ files } = await new Promise((resolve, reject) =>
      form.parse(req, (err, f, fi) => (err ? reject(err) : resolve({ fields: f, files: fi })))
    ));
  } catch (err) {
    const tooBig = /maxFileSize|maxTotalFileSize|biggerThan/i.test(err?.message || '') || err?.code === 1009;
    return badRequest(res, tooBig ? 'File exceeds the 50MB limit' : 'Upload failed — please try again');
  }

  const file = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!file) return badRequest(res, 'No file uploaded (field name must be "file")');
  const cleanup = async () => { if (file?.filepath) await unlink(file.filepath).catch(() => {}); };

  try {
    const origName = file.originalFilename || 'upload';
    const ext = (origName.split('.').pop() || '').toLowerCase();
    const declaredMime = file.mimetype || '';
    const size = file.size || 0;

    if (size <= 0 || size > MAX_FILE_BYTES) { await cleanup(); return badRequest(res, 'File exceeds the 50MB limit'); }
    if (usedBytes + size > MAX_TOTAL_BYTES) {
      await cleanup();
      return badRequest(res, 'This submission has reached its 200MB total limit. Remove a file first.');
    }
    const slotExts = slot ? SLOT_EXTS[slot] : allowedExts;
    if (!slotExts.includes(ext)) {
      await cleanup();
      return badRequest(res, slot
        ? `The ${slot} slot accepts ${slotExts.join(' or ').toUpperCase()} only.`
        : `Allowed file types: ${allowedExts.join(', ').toUpperCase()}.`);
    }
    if (!(MIME_BY_EXT[ext] || []).includes(declaredMime)) {
      await cleanup(); return badRequest(res, 'File type does not match its contents.');
    }
    const fh = await open(file.filepath, 'r');
    const head = Buffer.alloc(12);
    try { await fh.read(head, 0, 12, 0); } finally { await fh.close(); }
    if (sniffFamily(head) !== EXT_FAMILY[ext]) {
      await cleanup(); return badRequest(res, 'File content does not match its type');
    }

    const objectKey = buildSubmissionKey({
      courseCode: sub.course_code, batchCode: sub.batch_code, semester: sub.semester,
      kind, submissionId: sub.id, filename: origName, slot,
    });

    // Upload, then VERIFY before writing anything to the database.
    await s3.uploadFile(objectKey, file.filepath, declaredMime, size);
    try { await s3.headObject(objectKey); }
    catch (e) {
      return res.status(502).json({ success: false, message: 'Upload could not be verified in storage — please retry.', detail: e.message });
    }

    let media;
    try {
      const folderId = await svc.getOrCreateSubmissionFolder(
        sub.course_id, sub.batch_code, sub.semester, kind, req.user.id
      );
      media = await svc.createVideo({
        course_id: sub.course_id, folder_id: folderId, submission_id: sub.id,
        upload_status: 'ready', slot, semester: sub.semester,
        title: origName.replace(/\.[^.]+$/, ''),
        description: `${kind.replace('_', ' ')} file for submission ${sub.id}`,
        object_key: objectKey, file_size: size, media_type: 'document',
        mime_type: declaredMime, is_published: false, visibility: 'private', sort_order: 0,
      }, req.user.id);
      await query('UPDATE videos SET verified_at=NOW() WHERE id=$1', [media.id]);
    } catch (dbErr) {
      try { await s3.deleteObject(objectKey); } catch { /* ignore */ }
      throw dbErr;
    }

    // Re-uploading a slot REPLACES it. The superseded media row is retained and
    // marked, never deleted — the audit trail of what was submitted matters.
    let submission;
    try {
      const descriptor = { name: media.title || 'attachment', media_id: media.id, slot,
                           type: ext, size, uploaded_at: new Date().toISOString() };
      submission = slot
        ? await subSvc.replaceFileDescriptorForSlot(sub.id, slot, descriptor)
        : await subSvc.appendFileDescriptor(sub.id, descriptor);
    } catch (attErr) {
      try { await s3.deleteObject(objectKey); } catch { /* ignore */ }
      await svc.deleteVideo(media.id).catch(() => {});
      throw attErr;
    }

    ok(res, { submission, media_id: media.id, slot }, slot ? `${slot} uploaded` : 'Attachment uploaded');
  } finally {
    await cleanup();
  }
});

/**
 * DELETE /submissions/:submissionId/attachment/:mediaId
 * Removes a file before the submission is sent for review: the descriptor, the
 * media row and the stored object all go together.
 */
export const removeSubmissionAttachment = asyncHandler(async (req, res) => {
  const { submissionId, mediaId } = req.params;
  const { rows: [sub] } = await query(
    'SELECT id, student_user_id, status FROM submissions WHERE id=$1', [submissionId]
  );
  if (!sub) return notFound(res, 'Submission not found');
  const roles = req.user.roles || [];
  const isStaff = roles.includes('admin') || roles.includes('coordinator');
  if (sub.student_user_id !== req.user.id && !isStaff) return forbidden(res);
  if (!['draft', 'needs_revision'].includes(sub.status)) {
    return badRequest(res, 'Files can only be removed before the submission is sent for review.');
  }

  const { rows: [media] } = await query(
    'SELECT id, object_key FROM videos WHERE id=$1 AND submission_id=$2', [mediaId, submissionId]
  );
  if (!media) return notFound(res, 'File not found on this submission');

  const submission = await subSvc.removeFileDescriptor(submissionId, mediaId);
  await svc.deleteVideo(mediaId).catch(() => {});
  if (media.object_key) { try { await s3.deleteObject(media.object_key); } catch { /* ignore */ } }
  ok(res, { submission }, 'File removed');
});

/**
 * GET /videos/:id/preview?sessionToken=...
 * The same bytes as /stream but served INLINE, so a reviewer reads the document
 * in the browser instead of downloading it (SOP-V2 §M8).
 */
export const previewMedia = asyncHandler(async (req, res) => {
  const session = await svc.validateSession(req.query.sessionToken);
  if (!session) return res.status(401).json({ success: false, message: 'Invalid or expired session token' });
  if (session.video_id !== req.params.id) {
    return res.status(403).json({ success: false, message: 'Token does not match this file' });
  }
  const contentType = session.mime_type || 'application/octet-stream';
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Content-Type', contentType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  if (s3.isConfigured() && session.object_key) {
    try { return await s3.streamVideoRange(session.object_key, req.headers.range, res); }
    catch (err) {
      if (env.STORAGE_LOCAL_CACHE && local.videoExists(session.object_key)) {
        return local.streamRange(session.object_key, req.headers.range, res, contentType);
      }
      if (!res.headersSent) return res.status(502).json({ success: false, message: 'Storage temporarily unavailable', detail: err.message });
    }
  }
  if (!res.headersSent) res.status(503).json({ success: false, message: 'File not found in storage' });
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
