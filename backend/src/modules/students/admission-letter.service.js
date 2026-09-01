import { query } from '../../config/database.js';
import * as s3 from '../../services/s3.js';
import * as videoSvc from '../videos/videos.service.js';
import { renderAdmissionLetterPdf } from './admission-letter.template.js';
import { sendEmail } from '../email/email.service.js';

const SLOT = 'admission_confirmation';
const LETTER_LABEL = 'Admission Confirmation Letter';

// ─── Letterhead assets (Settings → Admission Letterhead) ──────────────────────
// Same generic app_settings mechanism 'branding' already uses — values are
// data-URI strings (or undefined if that asset hasn't been uploaded yet).
export const getLetterheadAssets = async () => {
  const { rows: [row] } = await query(`SELECT value FROM app_settings WHERE key='admission_letterhead'`);
  const v = row?.value || {};
  return {
    logo1: v.logo1 || null,
    logo2: v.logo2 || null,
    logo3: v.logo3 || null,
    signature: v.signature || null,
    stamp: v.stamp || null,
    directorName: v.directorName || null,
  };
};

// ─── Formatting helpers ─────────────────────────────────────────────────────
const stripDrPrefix = (name) => String(name || '').replace(/^dr\.?\s*/i, '').trim();

/** Mirrors src/lib/formatters.js#scholarName exactly — same "Dr. " treatment, ported for server-side rendering. */
const scholarDisplayName = ({ first_name, middle_name, last_name }) => {
  const parts = [stripDrPrefix(first_name), String(middle_name || '').trim(), String(last_name || '').trim()].filter(Boolean);
  return parts.length ? `Dr. ${parts.join(' ')}` : '';
};

const pad2 = (n) => String(n).padStart(2, '0');
const formatDateLabel = (d) => { const dt = new Date(d); return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}`; };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const formatCommencingLabel = (startDate) => { const dt = new Date(startDate); return `${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`; };

/** Which required fields (beyond name, always present) are missing for this scholar's letter. */
const missingFields = (profile) => {
  const missing = [];
  if (!profile.current_designation?.trim()) missing.push('designation');
  if (!profile.current_organisation?.trim()) missing.push('organisation');
  if (!profile.current_organisation_address?.trim()) missing.push('organisation address');
  return missing;
};

/** First time this scholar's letter is generated, they get the next serial for the batch; once assigned it never changes. */
const resolveSerial = async (batchId, enrollmentUserId, existingSerial) => {
  if (existingSerial) return existingSerial;
  const { rows: [{ next }] } = await query(
    `SELECT COALESCE(MAX(admission_letter_serial), 0) + 1 AS next FROM batch_enrollments WHERE batch_id=$1`,
    [batchId]
  );
  await query(
    `UPDATE batch_enrollments SET admission_letter_serial=$1 WHERE batch_id=$2 AND user_id=$3`,
    [next, batchId, enrollmentUserId]
  );
  return next;
};

/**
 * Generate (or regenerate) the admission letter for one scholar in one batch.
 * Returns { status: 'generated', mediaId, refNo } or { status: 'skipped', reason }.
 */
export const generateForScholar = async ({ userId, batchId, assets, adminUserId, folderCache }) => {
  const { rows: [row] } = await query(
    `SELECT be.user_id, be.batch_id, be.admission_letter_serial, be.enrolled_at,
            u.first_name, u.middle_name, u.last_name,
            spd.current_designation, spd.current_organisation, spd.current_organisation_address,
            b.name AS batch_name, b.code AS batch_code, b.start_date, b.letter_ref_prefix,
            b.course_id
     FROM batch_enrollments be
     JOIN users u ON u.id = be.user_id
     JOIN batches b ON b.id = be.batch_id
     LEFT JOIN student_profile_details spd ON spd.user_id = be.user_id
     WHERE be.user_id=$1 AND be.batch_id=$2`,
    [userId, batchId]
  );
  if (!row) return { status: 'skipped', reason: 'Not enrolled in this batch', userId };

  const missing = missingFields(row);
  if (missing.length) return { status: 'skipped', reason: `Missing ${missing.join(', ')}`, userId };
  if (!row.letter_ref_prefix?.trim()) return { status: 'skipped', reason: 'Batch has no Ref No. prefix set', userId };

  const serial = await resolveSerial(batchId, userId, row.admission_letter_serial);
  const refNo = `${row.letter_ref_prefix.trim()}/${pad2(serial)}`;
  const scholarName = scholarDisplayName(row);

  const pdfBuffer = await renderAdmissionLetterPdf({
    scholarName,
    designation: row.current_designation.trim(),
    organisation: row.current_organisation.trim(),
    organisationAddress: row.current_organisation_address.trim(),
    refNo,
    dateLabel: formatDateLabel(new Date()),
    commencingLabel: formatCommencingLabel(row.start_date),
  }, assets);

  const filename = `${scholarName.replace(/[^a-zA-Z0-9._ -]/g, '_')} - Admission Confirmation Letter.pdf`;
  const objectKey = `students/${userId}/official-letters/${SLOT}-${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  await s3.uploadBuffer(objectKey, pdfBuffer, 'application/pdf');
  // Same integrity check uploadOfficialLetter always does — a media row must
  // never exist without a verified object behind it (CLAUDE.md storage rule).
  try {
    await s3.headObject(objectKey);
  } catch (e) {
    await s3.deleteObject(objectKey).catch(() => {});
    const err = new Error('Letter upload could not be verified in storage — please retry.');
    err.status = 502;
    throw err;
  }

  const studentLabel = `${row.first_name || ''} ${row.last_name || ''}`.trim() || userId;
  const folderId = row.course_id
    ? await videoSvc.getOrCreateStudentDocFolder(row.course_id, row.batch_code, studentLabel, adminUserId, folderCache)
    : null;

  // Version history, not upsert: admission_confirmation is deliberately
  // excluded from uq_videos_owner_slot (see alter.js block 41) so every
  // generate/regenerate INSERTs a new row rather than overwriting — a
  // published letter is never silently replaced, and old drafts can be
  // reviewed/deleted individually (see getLetterHistory/deleteDraftVersion).
  // Older rows keep their object in Zata (history) but lose their folder_id,
  // so only the newest version clutters the Media Manager folder view.
  let media;
  try {
    await query(`UPDATE videos SET folder_id=NULL WHERE owner_user_id=$1 AND slot=$2`, [userId, SLOT]);
    const { rows: [inserted] } = await query(
      `INSERT INTO videos (course_id, folder_id, batch_id, title, description, object_key, file_size, mime_type, media_type, uploaded_by, is_published, visibility, upload_status, owner_user_id, slot, verified_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'document',$9,false,'private','ready',$10,$11,NOW())
       RETURNING *`,
      [row.course_id || null, folderId, batchId, filename, `Official letter — ${LETTER_LABEL}`, objectKey, pdfBuffer.length, 'application/pdf', adminUserId, userId, SLOT]
    );
    media = inserted;
  } catch (dbErr) {
    await s3.deleteObject(objectKey).catch(() => {});
    throw dbErr;
  }

  return { status: 'generated', userId, scholarName, mediaId: media.id, refNo };
};

// ─── Generate-all: background job with live progress ───────────────────────
// A batch's full scholar list is generated one at a time (PDF render + 2 Zata
// round-trips + folder resolution + DB insert each) — synchronously that
// blows past any reasonable HTTP timeout past a few dozen scholars. Instead
// the HTTP handler kicks this off and returns immediately; the frontend polls
// getGenerateAllJobStatus for live counts. In-memory is enough here — one
// process, jobs are short-lived, and losing a job on a restart just means the
// admin re-clicks Generate All.
const generateAllJobs = new Map(); // batchId -> job state

export const getGenerateAllJobStatus = (batchId) => generateAllJobs.get(batchId) || null;

export const startGenerateAllJob = async ({ batchId, letterRefPrefix, adminUserId }) => {
  const existing = generateAllJobs.get(batchId);
  if (existing?.status === 'running') return existing;

  if (letterRefPrefix?.trim()) {
    await query(`UPDATE batches SET letter_ref_prefix=$1 WHERE id=$2`, [letterRefPrefix.trim(), batchId]);
  }

  const { rows: scholars } = await query(
    `SELECT user_id FROM batch_enrollments WHERE batch_id=$1 AND status <> 'withdrawn' ORDER BY enrolled_at ASC`,
    [batchId]
  );

  const job = {
    status: 'running',
    total: scholars.length,
    processed: 0,
    generated: [],
    skipped: [],
    startedAt: new Date().toISOString(),
    finishedAt: null,
  };
  generateAllJobs.set(batchId, job);

  setImmediate(async () => {
    try {
      const assets = await getLetterheadAssets();
      // Shared across every scholar in this run — the batch-code and
      // "Students" path segments are identical for all of them, so without
      // this cache getOrCreateStudentDocFolder re-queries them per scholar.
      const folderCache = new Map();
      for (const s of scholars) {
        try {
          const result = await generateForScholar({ userId: s.user_id, batchId, assets, adminUserId, folderCache });
          (result.status === 'generated' ? job.generated : job.skipped).push(result);
        } catch (err) {
          console.error(`[admission-letters] Generate failed for ${s.user_id}:`, err.message);
          job.skipped.push({ status: 'skipped', userId: s.user_id, reason: err.message });
        }
        job.processed += 1;
      }
    } finally {
      job.status = 'done';
      job.finishedAt = new Date().toISOString();
    }
  });

  return job;
};

/** Roster for the batch-level Admission Letters tab — generation + publish + send status per scholar. */
export const getBatchLetterStatus = async (batchId) => {
  const { rows } = await query(
    `SELECT be.user_id, be.admission_letter_serial,
            u.first_name, u.middle_name, u.last_name, u.email,
            spd.current_designation, spd.current_organisation, spd.current_organisation_address,
            v.id AS media_id, v.created_at AS generated_at, v.is_published, v.published_at,
            EXISTS (
              SELECT 1 FROM email_logs el
              WHERE el.kind='admission_letter_issued' AND el.to_email = u.email AND el.status='sent'
                AND el.created_at >= COALESCE(v.created_at, be.enrolled_at)
            ) AS sent
     FROM batch_enrollments be
     JOIN users u ON u.id = be.user_id
     LEFT JOIN student_profile_details spd ON spd.user_id = be.user_id
     -- Version history means more than one row can exist per scholar now —
     -- always show whichever one was generated most recently.
     LEFT JOIN LATERAL (
       SELECT id, created_at, is_published, published_at
       FROM videos WHERE owner_user_id = be.user_id AND slot=$2
       ORDER BY created_at DESC LIMIT 1
     ) v ON true
     WHERE be.batch_id=$1 AND be.status <> 'withdrawn'
     ORDER BY be.enrolled_at ASC`,
    [batchId, SLOT]
  );
  return rows.map((r) => ({
    user_id: r.user_id,
    scholar_name: scholarDisplayName(r),
    email: r.email,
    missing_fields: missingFields(r),
    serial: r.admission_letter_serial,
    generated: !!r.media_id,
    generated_at: r.generated_at,
    published: !!r.is_published,
    published_at: r.published_at,
    sent: !!r.sent,
  }));
};

// ─── Publish (draft → visible to the scholar) ───────────────────────────────
// Generating a letter never makes it visible on its own — see the
// admission_confirmation-only gate in student-profile.service.js#listOfficialLetters.
// Publishing is the explicit step that flips it on; regenerating (see
// upsertOwnerSlotVideo) always resets it back to draft.

// Only the LATEST row per scholar is ever a publish target — with version
// history, older rows are either already-published permanent versions or
// superseded drafts nobody should be able to newly publish.
export const publishOne = async (userId) => {
  const { rows: [row] } = await query(
    `UPDATE videos SET is_published=true, published_at=NOW()
     WHERE id = (SELECT id FROM videos WHERE owner_user_id=$1 AND slot=$2 ORDER BY created_at DESC LIMIT 1)
       AND is_published=false
     RETURNING id`,
    [userId, SLOT]
  );
  return !!row;
};

export const publishMany = async (userIds) => {
  const { rows } = await query(
    `UPDATE videos SET is_published=true, published_at=NOW()
     WHERE id IN (
       SELECT DISTINCT ON (owner_user_id) id FROM videos
       WHERE owner_user_id = ANY($1::uuid[]) AND slot=$2
       ORDER BY owner_user_id, created_at DESC
     ) AND is_published=false
     RETURNING owner_user_id`,
    [userIds, SLOT]
  );
  return rows.map((r) => r.owner_user_id);
};

export const publishAllInBatch = async (batchId) => {
  const roster = await getBatchLetterStatus(batchId);
  const targets = roster.filter((r) => r.generated && !r.published).map((r) => r.user_id);
  const published = targets.length ? await publishMany(targets) : [];
  return { published, alreadyPublished: roster.filter((r) => r.generated && r.published).length };
};

// ─── Email delivery ─────────────────────────────────────────────────────────

/** Send the scholar's current letter as a direct PDF attachment. */
export const sendLetterEmail = async (userId) => {
  // Deliberately the latest PUBLISHED row, not just the latest row overall —
  // a newer unpublished draft sitting on top must never change what gets
  // emailed; the scholar can only ever see the latest published version.
  const { rows: [row] } = await query(
    `SELECT v.object_key, v.title, u.first_name, u.last_name, u.email
     FROM videos v JOIN users u ON u.id = v.owner_user_id
     WHERE v.owner_user_id=$1 AND v.slot=$2 AND v.is_published=true
     ORDER BY v.created_at DESC LIMIT 1`,
    [userId, SLOT]
  );
  if (!row) return { status: 'skipped', reason: 'Letter is not published yet — publish it before emailing.', userId };
  if (!row.email) return { status: 'skipped', reason: 'Scholar has no email on file', userId };

  const stream = await s3.getObjectStream(row.object_key);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const pdfBuffer = Buffer.concat(chunks);

  const result = await sendEmail({
    to: { email: row.email, name: `${row.first_name || ''} ${row.last_name || ''}`.trim() },
    subject: 'Your Admission Confirmation Letter',
    html: `<p>Dear ${row.first_name || 'Scholar'},</p><p>Please find your Admission Confirmation Letter attached.</p><p>Best regards,<br/>DY Patil Academic Team</p>`,
    text: `Dear ${row.first_name || 'Scholar'},\n\nPlease find your Admission Confirmation Letter attached.\n\nBest regards,\nDY Patil Academic Team`,
    kind: 'admission_letter_issued',
    attachments: [{ filename: row.title || 'Admission Confirmation Letter.pdf', content: pdfBuffer, contentType: 'application/pdf' }],
  });
  if (!result.success) return { status: 'failed', reason: result.error, userId };
  return { status: 'sent', userId };
};

// ─── Email-all: background job with live progress ──────────────────────────
// Same shape as generate-all's job tracker (see above) — each scholar needs a
// Zata stream read plus an outbound send, which is exactly the kind of
// per-scholar network round-trip that timed out generate-all on larger
// batches. Same fix: kick off in the background, let the frontend poll.
const emailAllJobs = new Map(); // batchId -> job state

export const getEmailAllJobStatus = (batchId) => emailAllJobs.get(batchId) || null;

export const startEmailAllJob = async ({ batchId }) => {
  const existing = emailAllJobs.get(batchId);
  if (existing?.status === 'running') return existing;

  const roster = await getBatchLetterStatus(batchId);
  const targets = roster.filter((x) => x.published && !x.sent);

  const job = {
    status: 'running',
    total: targets.length,
    processed: 0,
    sent: [],
    skipped: [],
    startedAt: new Date().toISOString(),
    finishedAt: null,
  };
  emailAllJobs.set(batchId, job);

  setImmediate(async () => {
    try {
      for (const r of targets) {
        try {
          const result = await sendLetterEmail(r.user_id);
          (result.status === 'sent' ? job.sent : job.skipped).push(result);
        } catch (err) {
          console.error(`[admission-letters] Email failed for ${r.user_id}:`, err.message);
          job.skipped.push({ status: 'failed', userId: r.user_id, reason: err.message });
        }
        job.processed += 1;
      }
    } finally {
      job.status = 'done';
      job.finishedAt = new Date().toISOString();
    }
  });

  return job;
};

// ─── Version history & deletion ─────────────────────────────────────────────
// Published versions are permanent — this UI never deletes them, only drafts.

/** Every version ever generated for this scholar, newest first. */
export const getLetterHistory = async (userId) => {
  const { rows } = await query(
    `SELECT id, title, file_size, created_at, is_published, published_at
     FROM videos WHERE owner_user_id=$1 AND slot=$2
     ORDER BY created_at DESC`,
    [userId, SLOT]
  );
  return rows;
};

/** Deletes one draft version (Zata object + DB row). Refuses if it's published or belongs to someone else. */
export const deleteDraftVersion = async (userId, mediaId) => {
  const { rows: [row] } = await query(
    `SELECT object_key, is_published FROM videos WHERE id=$1 AND owner_user_id=$2 AND slot=$3`,
    [mediaId, userId, SLOT]
  );
  if (!row) return { status: 'skipped', reason: 'Version not found' };
  if (row.is_published) return { status: 'skipped', reason: 'Published versions are kept for history and cannot be deleted here.' };
  await query(`DELETE FROM videos WHERE id=$1`, [mediaId]);
  await s3.deleteObject(row.object_key).catch(() => {});
  return { status: 'deleted' };
};

/** Bulk "Delete All Drafts" — every unpublished admission-letter version for scholars in this batch. Published ones are never touched. */
export const deleteAllDraftsInBatch = async (batchId) => {
  const { rows } = await query(
    `SELECT v.id, v.object_key FROM videos v
     JOIN batch_enrollments be ON be.user_id = v.owner_user_id AND be.batch_id=$1
     WHERE v.slot=$2 AND v.is_published=false`,
    [batchId, SLOT]
  );
  if (!rows.length) return { deleted: 0 };
  await query(`DELETE FROM videos WHERE id = ANY($1::uuid[])`, [rows.map((r) => r.id)]);
  await Promise.all(rows.map((r) => s3.deleteObject(r.object_key).catch(() => {})));
  return { deleted: rows.length };
};
