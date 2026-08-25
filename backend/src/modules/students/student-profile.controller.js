import * as svc from './student-profile.service.js';
import * as videoSvc from '../videos/videos.service.js';
import * as s3 from '../../services/s3.js';
import { ok, notFound, badRequest } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { isOwnScope } from '../../middleware/rbac.js';
import { query } from '../../config/database.js';
import { IncomingForm } from 'formidable';
import { unlink, open } from 'fs/promises';

/** Own-scope callers (students) may only touch their own profile; broader scopes (admin/coordinator) can act on behalf. */
const assertOwnerOrBroaderScope = (req, res) => {
  if (isOwnScope(req) && req.user.id !== req.params.userId) {
    res.status(403).json({ success: false, code: 'PERMISSION_DENIED', message: 'You can only manage your own profile.' });
    return false;
  }
  return true;
};

// ─── Personal info ─────────────────────────────────────────────────────────────

export const getProfileDetails = asyncHandler(async (req, res) => {
  if (!assertOwnerOrBroaderScope(req, res)) return;
  ok(res, await svc.getProfileDetails(req.params.userId));
});

export const putProfileDetails = asyncHandler(async (req, res) => {
  if (!assertOwnerOrBroaderScope(req, res)) return;
  const { first_name, middle_name, last_name, phone, ...rest } = req.body || {};
  await svc.updateBasicUserFields(req.params.userId, { first_name, middle_name, last_name, phone });
  const details = await svc.upsertProfileDetails(req.params.userId, rest);
  const onboarding = await svc.getOnboardingStatus(req.params.userId);
  ok(res, { ...details, onboarding }, 'Profile details saved');
});

// ─── Documents ───────────────────────────────────────────────────────────────

export const listDocuments = asyncHandler(async (req, res) => {
  if (!assertOwnerOrBroaderScope(req, res)) return;
  ok(res, await svc.listDocuments(req.params.userId));
});

export const getOnboardingStatus = asyncHandler(async (req, res) => {
  if (!assertOwnerOrBroaderScope(req, res)) return;
  ok(res, await svc.getOnboardingStatus(req.params.userId));
});

/** PATCH /students/:userId/onboarding-skip — admin-only, lets one scholar past onboarding without finishing it. */
export const setOnboardingSkip = asyncHandler(async (req, res) => {
  const details = await svc.setOnboardingSkip(req.params.userId, !!req.body?.skip);
  const onboarding = await svc.getOnboardingStatus(req.params.userId);
  ok(res, { ...details, onboarding }, req.body?.skip ? 'Onboarding skip enabled' : 'Onboarding skip disabled');
});

// File rules per slot — documents are identity scans/photos, uploads are
// research documents. Every type is checked three ways (extension, declared
// MIME, real content signature) so a renamed file is always caught — mirrors
// the checks in videos.controller.js#uploadSubmissionAttachment.
const MIME_BY_EXT = {
  pdf:  ['application/pdf'],
  doc:  ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  png:  ['image/png'],
  jpg:  ['image/jpeg'],
  jpeg: ['image/jpeg'],
  webp: ['image/webp'],
};
const EXT_FAMILY = { pdf: 'pdf', docx: 'zip', doc: 'ole', png: 'png', jpg: 'jpg', jpeg: 'jpg', webp: 'webp' };
const sniffFamily = (buf) => {
  if (buf.length >= 5 && buf.slice(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b) return 'zip';
  if (buf.length >= 4 && buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) return 'ole';
  if (buf.length >= 8 && buf[0] === 0x89 && buf.slice(1, 4).toString('latin1') === 'PNG') return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length >= 12 && buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
};

const IMAGE_ONLY = ['png', 'jpg', 'jpeg', 'webp'];
const DOC_EXTS = ['pdf', 'png', 'jpg', 'jpeg', 'webp'];
const UPLOAD_EXTS = ['pdf', 'doc', 'docx'];
const extsForSlot = (slot) => (slot === 'photo' ? IMAGE_ONLY
  : svc.UPLOAD_SLOTS.includes(slot) ? UPLOAD_EXTS
  : DOC_EXTS);

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB — profile documents are scans/PDFs, not submission bundles

/**
 * POST /students/:userId/documents/:slot
 * Streams the file to Zata, verifies it landed, and upserts the (owner,slot)
 * media row — a re-upload replaces the current file for that slot, it does
 * not version it (V4-FEATURE-PLAN.md §5).
 */
export const uploadDocument = asyncHandler(async (req, res) => {
  if (!assertOwnerOrBroaderScope(req, res)) return;
  if (!s3.isConfigured()) {
    return res.status(503).json({ success: false, message: 'File storage is not configured.' });
  }

  const { userId, slot } = req.params;
  if (!svc.ALL_SLOTS.includes(slot)) return badRequest(res, `Unknown document slot "${slot}"`);

  // Same course/batch lookup uploadOfficialLetter already uses — resolving it
  // here too means a CV and an Official Letter for the same scholar land in
  // the SAME Media Manager folder (Course > Batch > Students > Name) instead
  // of onboarding documents being invisible outside this one profile page.
  const { rows: [student] } = await query(
    `SELECT u.first_name, u.last_name, be.batch_id, b.code AS batch_code, b.course_id
     FROM users u
     LEFT JOIN batch_enrollments be ON be.user_id = u.id AND be.status = 'active'
     LEFT JOIN batches b ON b.id = be.batch_id
     WHERE u.id = $1
     ORDER BY be.enrolled_at DESC NULLS LAST
     LIMIT 1`,
    [userId]
  );
  if (!student) return notFound(res, 'Scholar not found');

  const { rows: [existing] } = await query(
    'SELECT id, object_key FROM videos WHERE owner_user_id=$1 AND slot=$2', [userId, slot]
  );

  const form = new IncomingForm({ maxFileSize: MAX_FILE_BYTES, maxFiles: 1, keepExtensions: true });
  let files;
  try {
    ({ files } = await new Promise((resolve, reject) =>
      form.parse(req, (err, f, fi) => (err ? reject(err) : resolve({ fields: f, files: fi })))
    ));
  } catch (err) {
    const tooBig = /maxFileSize|maxTotalFileSize|biggerThan/i.test(err?.message || '') || err?.code === 1009;
    return badRequest(res, tooBig ? 'File exceeds the 15MB limit' : 'Upload failed — please try again');
  }

  const file = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!file) return badRequest(res, 'No file uploaded (field name must be "file")');
  const cleanup = async () => { if (file?.filepath) await unlink(file.filepath).catch(() => {}); };

  try {
    const origName = file.originalFilename || 'upload';
    const ext = (origName.split('.').pop() || '').toLowerCase();
    const declaredMime = file.mimetype || '';
    const size = file.size || 0;
    const allowedExts = extsForSlot(slot);

    if (size <= 0 || size > MAX_FILE_BYTES) { await cleanup(); return badRequest(res, 'File exceeds the 15MB limit'); }
    if (!allowedExts.includes(ext)) {
      await cleanup();
      return badRequest(res, `The ${slot} slot accepts ${allowedExts.join(', ').toUpperCase()} only.`);
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

    const safe = origName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    // Structured per-student root: students/{userId}/documents/{slot}-...,
    // matching the students/{userId}/avatar/ path used for the profile photo
    // (backend/src/modules/users/users.routes.js) — every file a scholar owns
    // now lives under one predictable folder.
    const objectKey = `students/${userId}/documents/${slot}-${Date.now()}-${safe}`;

    // Upload, then VERIFY before writing anything to the database.
    await s3.uploadFile(objectKey, file.filepath, declaredMime, size);
    try { await s3.headObject(objectKey); }
    catch (e) {
      return res.status(502).json({ success: false, message: 'Upload could not be verified in storage — please retry.', detail: e.message });
    }

    const studentLabel = `${student.first_name || ''} ${student.last_name || ''}`.trim() || userId;
    let folderId = null;
    if (student.course_id) {
      folderId = await videoSvc.getOrCreateStudentDocFolder(student.course_id, student.batch_code, studentLabel, req.user.id);
    }

    let media;
    try {
      media = await videoSvc.upsertOwnerSlotVideo({
        title: origName.replace(/\.[^.]+$/, ''),
        description: `Profile ${slot.replace(/_/g, ' ')} document`,
        object_key: objectKey, file_size: size, mime_type: declaredMime,
        owner_user_id: userId, slot,
        course_id: student.course_id || null, folder_id: folderId, batch_id: student.batch_id || null,
      }, req.user.id);
    } catch (dbErr) {
      try { await s3.deleteObject(objectKey); } catch { /* ignore */ }
      throw dbErr;
    }

    // Slot held a different file before this upload — remove the superseded
    // object now that the new one is verified and recorded.
    if (existing?.object_key && existing.object_key !== objectKey) {
      try { await s3.deleteObject(existing.object_key); } catch { /* ignore */ }
    }

    const onboarding = await svc.getOnboardingStatus(userId);
    ok(res, { media_id: media.id, slot, filename: media.title, onboarding }, `${slot.replace(/_/g, ' ')} uploaded`);
  } finally {
    await cleanup();
  }
});

/**
 * GET /students/:userId/documents/:slot/file?mode=preview|download
 * Same shape as streamOfficialLetter below — own-scope student, or
 * broader-scope staff. `mode=download` sets Content-Disposition: attachment;
 * anything else (default) is inline, so the browser renders it instead of
 * saving it.
 */
export const streamDocument = asyncHandler(async (req, res) => {
  if (!assertOwnerOrBroaderScope(req, res)) return;
  const { userId, slot } = req.params;
  if (!svc.ALL_SLOTS.includes(slot)) return notFound(res, 'Not found');

  const { rows: [row] } = await query(
    'SELECT object_key, mime_type, title FROM videos WHERE owner_user_id=$1 AND slot=$2', [userId, slot]
  );
  if (!row) return notFound(res, 'Document not uploaded yet');

  const disposition = req.query.mode === 'download' ? 'attachment' : 'inline';
  const safeName = (row.title || slot).replace(/[^a-zA-Z0-9 ._-]/g, '_');
  const ext = row.object_key?.split('.').pop() || '';
  res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}${ext ? `.${ext}` : ''}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');

  try {
    await s3.streamObject(row.object_key, res, { contentType: row.mime_type });
  } catch {
    if (!res.headersSent) res.status(404).json({ success: false, message: 'File not found in storage' });
  }
});

// ─── Official letters (admin-issued, read-only for the scholar) ──────────────
// Same owner-slot mechanism and validation as onboarding documents above, but
// the upload route is staff-only (requireRole, not permission scope — a
// scholar's own students:update grant must never reach it). See
// student-profile.service.js#OFFICIAL_LETTER_SLOTS.

export const listOfficialLetters = asyncHandler(async (req, res) => {
  if (!assertOwnerOrBroaderScope(req, res)) return;
  ok(res, await svc.listOfficialLetters(req.params.userId));
});

const LETTER_MAX_BYTES = 15 * 1024 * 1024; // same ceiling as onboarding documents — scans/PDFs, not bundles
const LETTER_EXTS = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'webp'];

/**
 * POST /students/:userId/official-letters/:slot
 * Staff-only (enforced on the route). Streams to Zata, verifies, then upserts
 * the (owner,slot) media row — a re-upload replaces the current letter, same
 * as onboarding documents. Also resolves/creates the scholar's Media Manager
 * folder (Course > Batch > Students > Name) so the letter is browsable there,
 * not just reachable through this endpoint.
 */
export const uploadOfficialLetter = asyncHandler(async (req, res) => {
  if (!s3.isConfigured()) {
    return res.status(503).json({ success: false, message: 'File storage is not configured.' });
  }

  const { userId, slot } = req.params;
  if (!svc.OFFICIAL_LETTER_SLOTS.includes(slot)) return badRequest(res, `Unknown letter type "${slot}"`);

  const { rows: [student] } = await query(
    `SELECT u.first_name, u.last_name, be.batch_id, b.code AS batch_code, b.course_id
     FROM users u
     LEFT JOIN batch_enrollments be ON be.user_id = u.id AND be.status = 'active'
     LEFT JOIN batches b ON b.id = be.batch_id
     WHERE u.id = $1
     ORDER BY be.enrolled_at DESC NULLS LAST
     LIMIT 1`,
    [userId]
  );
  if (!student) return notFound(res, 'Scholar not found');

  const { rows: [existing] } = await query(
    'SELECT id, object_key FROM videos WHERE owner_user_id=$1 AND slot=$2', [userId, slot]
  );

  const form = new IncomingForm({ maxFileSize: LETTER_MAX_BYTES, maxFiles: 1, keepExtensions: true });
  let files;
  try {
    ({ files } = await new Promise((resolve, reject) =>
      form.parse(req, (err, f, fi) => (err ? reject(err) : resolve({ fields: f, files: fi })))
    ));
  } catch (err) {
    const tooBig = /maxFileSize|maxTotalFileSize|biggerThan/i.test(err?.message || '') || err?.code === 1009;
    return badRequest(res, tooBig ? 'File exceeds the 15MB limit' : 'Upload failed — please try again');
  }

  const file = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!file) return badRequest(res, 'No file uploaded (field name must be "file")');
  const cleanup = async () => { if (file?.filepath) await unlink(file.filepath).catch(() => {}); };

  try {
    const origName = file.originalFilename || 'letter';
    const ext = (origName.split('.').pop() || '').toLowerCase();
    const declaredMime = file.mimetype || '';
    const size = file.size || 0;

    if (size <= 0 || size > LETTER_MAX_BYTES) { await cleanup(); return badRequest(res, 'File exceeds the 15MB limit'); }
    if (!LETTER_EXTS.includes(ext)) {
      await cleanup();
      return badRequest(res, `Allowed file types: ${LETTER_EXTS.join(', ').toUpperCase()}.`);
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

    const safe = origName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    // Structured per-student root, same convention as onboarding documents
    // and the avatar (students/{userId}/...) — every file a scholar owns
    // lives under one predictable prefix.
    const objectKey = `students/${userId}/official-letters/${slot}-${Date.now()}-${safe}`;

    await s3.uploadFile(objectKey, file.filepath, declaredMime, size);
    try { await s3.headObject(objectKey); }
    catch (e) {
      return res.status(502).json({ success: false, message: 'Upload could not be verified in storage — please retry.', detail: e.message });
    }

    const studentLabel = `${student.first_name || ''} ${student.last_name || ''}`.trim() || userId;
    let folderId = null;
    if (student.course_id) {
      folderId = await videoSvc.getOrCreateStudentDocFolder(student.course_id, student.batch_code, studentLabel, req.user.id);
    }

    let media;
    try {
      media = await videoSvc.upsertOwnerSlotVideo({
        title: svc.OFFICIAL_LETTER_LABELS[slot] || origName.replace(/\.[^.]+$/, ''),
        description: `Official letter — ${svc.OFFICIAL_LETTER_LABELS[slot] || slot}`,
        object_key: objectKey, file_size: size, mime_type: declaredMime,
        owner_user_id: userId, slot,
        course_id: student.course_id || null, folder_id: folderId, batch_id: student.batch_id || null,
      }, req.user.id);
    } catch (dbErr) {
      try { await s3.deleteObject(objectKey); } catch { /* ignore */ }
      throw dbErr;
    }

    // Slot held a different file before this upload — remove the superseded
    // object now that the new one is verified and recorded.
    if (existing?.object_key && existing.object_key !== objectKey) {
      try { await s3.deleteObject(existing.object_key); } catch { /* ignore */ }
    }

    ok(res, { media_id: media.id, slot, filename: media.title }, `${svc.OFFICIAL_LETTER_LABELS[slot]} uploaded`);
  } finally {
    await cleanup();
  }
});

/**
 * GET /students/:userId/official-letters/:slot/file?mode=preview|download
 * Read access mirrors listOfficialLetters (own-scope student, or broader-scope
 * staff). `mode=download` sets Content-Disposition: attachment; anything else
 * (default) is inline, so the browser renders it instead of saving it.
 */
export const streamOfficialLetter = asyncHandler(async (req, res) => {
  if (!assertOwnerOrBroaderScope(req, res)) return;
  const { userId, slot } = req.params;
  if (!svc.OFFICIAL_LETTER_SLOTS.includes(slot)) return notFound(res, 'Not found');

  const { rows: [row] } = await query(
    'SELECT object_key, mime_type, title FROM videos WHERE owner_user_id=$1 AND slot=$2', [userId, slot]
  );
  if (!row) return notFound(res, 'Letter not uploaded yet');

  const disposition = req.query.mode === 'download' ? 'attachment' : 'inline';
  const safeName = (row.title || slot).replace(/[^a-zA-Z0-9 ._-]/g, '_');
  const ext = row.object_key?.split('.').pop() || '';
  res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}${ext ? `.${ext}` : ''}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');

  try {
    await s3.streamObject(row.object_key, res, { contentType: row.mime_type });
  } catch {
    if (!res.headersSent) res.status(404).json({ success: false, message: 'File not found in storage' });
  }
});
