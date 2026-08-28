import fs from 'fs';
import os from 'os';
import path from 'path';
import archiver from 'archiver';
import { query } from '../../config/database.js';
import * as s3 from '../../services/s3.js';
import { ALL_SLOTS } from './student-profile.service.js';
import { sendScholarExportReadyEmail, sendScholarExportFailedEmail } from '../email/email.service.js';

// ─── Column registry ───────────────────────────────────────────────────────
// Profile fields only — no submission/fee counts, those live in the Scholars
// list itself, not this export. Order here is the default column order.
export const EXPORT_COLUMNS = [
  { key: 'first_name',           label: 'First Name' },
  { key: 'middle_name',          label: 'Middle Name' },
  { key: 'last_name',            label: 'Last Name' },
  { key: 'email',                label: 'Email' },
  { key: 'phone',                label: 'Phone' },
  { key: 'enrollment_number',    label: 'Enrollment Number' },
  { key: 'batch_name',           label: 'Batch Name' },
  { key: 'batch_code',           label: 'Batch Code' },
  { key: 'course_name',          label: 'Course' },
  { key: 'status',               label: 'Status' },
  { key: 'current_semester',     label: 'Semester' },
  { key: 'enrolled_at',          label: 'Enrolled Date' },
  { key: 'father_name',          label: "Father's Name" },
  { key: 'mother_name',          label: "Mother's Name" },
  { key: 'date_of_birth',        label: 'Date of Birth' },
  { key: 'postal_address',       label: 'Postal Address' },
  { key: 'blood_group',          label: 'Blood Group' },
  { key: 'title',                label: 'Research Title' },
  { key: 'onboarding_completed', label: 'Onboarding Completed' },
];
const EXPORT_COLUMN_KEYS = new Set(EXPORT_COLUMNS.map((c) => c.key));

const FORMATTERS = {
  enrolled_at:   (v) => (v ? new Date(v).toISOString().split('T')[0] : ''),
  date_of_birth: (v) => (v ? new Date(v).toISOString().split('T')[0] : ''),
  onboarding_completed: (v) => (v ? 'Yes' : 'No'),
};

/** Full profile row set (every EXPORT_COLUMNS field) for the given WHERE fragment. */
export const fetchExportRows = async (where, params) => {
  const { rows } = await query(
    `SELECT u.first_name, u.middle_name, u.last_name, u.email, u.phone,
            be.user_id, be.enrollment_number, be.status, be.current_semester, be.enrolled_at,
            b.name AS batch_name, b.code AS batch_code,
            c.name AS course_name,
            spd.father_name, spd.mother_name, spd.date_of_birth, spd.postal_address,
            spd.blood_group, spd.title,
            (spd.onboarding_completed_at IS NOT NULL) AS onboarding_completed
     FROM batch_enrollments be
     JOIN users u ON u.id = be.user_id
     JOIN batches b ON b.id = be.batch_id
     JOIN courses c ON c.id = b.course_id
     LEFT JOIN student_profile_details spd ON spd.user_id = be.user_id
     ${where}
     ORDER BY be.enrolled_at DESC`,
    params
  );
  return rows;
};

/** Narrow EXPORT_COLUMNS down to a valid, ordered subset from a `?columns=` query value. */
export const resolveColumns = (columnsParam) => {
  if (!columnsParam) return EXPORT_COLUMNS;
  const requested = String(columnsParam).split(',').map((c) => c.trim()).filter(Boolean);
  const picked = requested.filter((k) => EXPORT_COLUMN_KEYS.has(k));
  if (!picked.length) return EXPORT_COLUMNS;
  const byKey = new Map(EXPORT_COLUMNS.map((c) => [c.key, c]));
  return picked.map((k) => byKey.get(k));
};

export const rowsToCSVArrays = (rows, columns) => {
  const headers = columns.map((c) => c.label);
  const dataRows = rows.map((r) => columns.map((c) => {
    const raw = r[c.key];
    const fmt = FORMATTERS[c.key];
    return fmt ? fmt(raw) : (raw ?? '');
  }));
  return [headers, ...dataRows];
};

// ─── Documents ZIP background job ──────────────────────────────────────────

const displayName = (r) => [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || r.user_id;

const safeFolderName = (r) =>
  `${r.enrollment_number || r.user_id}_${displayName(r)}`.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 120);

export const createExportJob = async ({ requestedBy, email, scope, scholarCount }) => {
  const { rows: [job] } = await query(
    `INSERT INTO export_jobs (requested_by, email, scope, scholar_count)
     VALUES ($1,$2,$3,$4) RETURNING id`,
    [requestedBy, email, JSON.stringify(scope), scholarCount]
  );
  return job.id;
};

/**
 * Build a ZIP of every onboarding document for the scholars captured in the
 * job's scope and email the requester a download link when done.
 *
 * Fire-and-forget by design: the route inserts the job row and responds
 * immediately (202-style body on a 200), then schedules this via
 * setImmediate so it only starts after the response has flushed. No queue —
 * confirmed production data volume (~360MB across all scholars' documents)
 * finishes this in seconds, so a single in-process async run is enough. If a
 * scholar's documents ever grow far larger, this is the first thing to
 * replace with a real worker.
 */
export const runDocumentsZipJob = async (jobId) => {
  const { rows: [job] } = await query('SELECT * FROM export_jobs WHERE id=$1', [jobId]);
  if (!job) return;

  const tmpPath = path.join(os.tmpdir(), `export-${jobId}.zip`);
  try {
    await query(`UPDATE export_jobs SET status='processing' WHERE id=$1`, [jobId]);

    const userIds = job.scope?.user_ids || [];
    const { rows: scholars } = userIds.length
      ? await query(
          `SELECT be.user_id, be.enrollment_number, u.first_name, u.last_name
           FROM batch_enrollments be JOIN users u ON u.id = be.user_id
           WHERE be.user_id = ANY($1::uuid[])`,
          [userIds]
        )
      : { rows: [] };

    // One batched lookup for every scholar's documents rather than a
    // per-scholar round trip — matters once an export covers a whole batch.
    const scholarIds = scholars.map((s) => s.user_id);
    const { rows: allDocs } = scholarIds.length
      ? await query(
          `SELECT owner_user_id, slot, title, object_key FROM videos
           WHERE owner_user_id = ANY($1::uuid[]) AND slot = ANY($2::text[]) AND object_key IS NOT NULL`,
          [scholarIds, ALL_SLOTS]
        )
      : { rows: [] };
    const docsByScholar = new Map();
    for (const doc of allDocs) {
      if (!docsByScholar.has(doc.owner_user_id)) docsByScholar.set(doc.owner_user_id, []);
      docsByScholar.get(doc.owner_user_id).push(doc);
    }

    const output = fs.createWriteStream(tmpPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    const finished = new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
    });
    archive.pipe(output);

    for (const scholar of scholars) {
      const docs = docsByScholar.get(scholar.user_id) || [];
      const folder = safeFolderName(scholar);
      for (const doc of docs) {
        try {
          const stream = await s3.getObjectStream(doc.object_key);
          const ext = doc.object_key.split('.').pop();
          // Prefixed with slot (unique per scholar via uq_videos_owner_slot) so
          // two documents sharing an original filename — e.g. two ID scans
          // both saved as "scan.pdf" — never collide inside the scholar's folder.
          const filename = doc.title ? `${doc.slot}_${doc.title}` : `${doc.slot}.${ext}`;
          archive.append(stream, { name: `${folder}/${filename}` });
        } catch (err) {
          console.error(`[export-zip] Skipping ${scholar.user_id}/${doc.slot}:`, err.message);
        }
      }
    }

    await archive.finalize();
    await finished;

    const stat = fs.statSync(tmpPath);
    const fileKey = `exports/${jobId}.zip`;
    await s3.uploadFile(fileKey, tmpPath, 'application/zip', stat.size);
    const downloadUrl = await s3.getPresignedDownloadUrl(fileKey);

    await query(
      `UPDATE export_jobs SET status='completed', file_key=$1, completed_at=NOW() WHERE id=$2`,
      [fileKey, jobId]
    );
    await sendScholarExportReadyEmail({ to: job.email, scholarCount: scholars.length, downloadUrl });
  } catch (err) {
    console.error('[export-zip] Job failed:', jobId, err);
    await query(`UPDATE export_jobs SET status='failed', error=$1 WHERE id=$2`, [String(err.message || err), jobId]).catch(() => {});
    await sendScholarExportFailedEmail({ to: job.email, error: err.message }).catch(() => {});
  } finally {
    fs.promises.unlink(tmpPath).catch(() => {});
  }
};
