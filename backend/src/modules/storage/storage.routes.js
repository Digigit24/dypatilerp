/**
 * Storage health and usage.
 *
 * Zata is the single source of truth for every file. This module answers the
 * two questions that follow from that:
 *   1. Does every media row actually have its object in the bucket?  (health)
 *   2. How much is each course storing?                              (billing)
 *
 * See documentation/SOP-V2.html §M7.
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { query } from '../../config/database.js';
import * as s3 from '../../services/s3.js';

const router = Router();
router.use(authenticate);

/** GET /storage/usage — per-course totals. This is the number you invoice on. */
router.get('/usage', requirePermission('storage', 'read'), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT c.id AS course_id, c.name AS course, c.code,
            COUNT(v.id)::int                                              AS files,
            COUNT(v.id) FILTER (WHERE v.media_type = 'video')::int         AS videos,
            COUNT(v.id) FILTER (WHERE v.media_type = 'document')::int      AS documents,
            COUNT(v.id) FILTER (WHERE v.submission_id IS NOT NULL)::int    AS submission_files,
            COALESCE(SUM(v.file_size), 0)::bigint                          AS total_bytes,
            (c.preferences->>'storage_quota_bytes')::bigint                AS quota_bytes
     FROM courses c
     LEFT JOIN videos v ON v.course_id = c.id
     GROUP BY c.id, c.name, c.code, c.preferences
     ORDER BY total_bytes DESC`
  );
  const data = rows.map((r) => {
    const used = Number(r.total_bytes || 0);
    const quota = r.quota_bytes ? Number(r.quota_bytes) : null;
    return {
      ...r,
      total_bytes: used,
      total_readable: humanBytes(used),
      quota_bytes: quota,
      percent_used: quota ? Math.round((used / quota) * 100) : null,
    };
  });
  const grand = data.reduce((a, r) => a + r.total_bytes, 0);
  ok(res, { courses: data, grand_total_bytes: grand, grand_total_readable: humanBytes(grand) });
}));

/**
 * GET /storage/health — integrity, from the database's point of view.
 * Cheap: no bucket calls. Use ?verify=true to HEAD each object in Zata.
 */
router.get('/health', requirePermission('storage', 'read'), asyncHandler(async (req, res) => {
  const { rows: [summary] } = await query(
    `SELECT COUNT(*)::int                                                    AS total,
            COUNT(*) FILTER (WHERE object_key IS NULL)::int                  AS no_object_key,
            COUNT(*) FILTER (WHERE upload_status = 'ready')::int             AS ready,
            COUNT(*) FILTER (WHERE upload_status = 'pending')::int           AS pending,
            COUNT(*) FILTER (WHERE upload_status = 'missing')::int           AS missing,
            COUNT(*) FILTER (WHERE upload_status = 'superseded')::int        AS superseded,
            COUNT(*) FILTER (WHERE verified_at IS NULL AND upload_status='ready')::int AS never_verified
     FROM videos`
  );

  let verification = null;
  if (req.query.verify === 'true' && s3.isConfigured()) {
    const { rows: sample } = await query(
      `SELECT id, object_key, title FROM videos
       WHERE object_key IS NOT NULL AND upload_status <> 'missing'
       ORDER BY created_at DESC LIMIT $1`,
      [Math.min(Number(req.query.limit) || 100, 500)]
    );
    const missing = [];
    for (const row of sample) {
      try { await s3.headObject(row.object_key); }
      catch { missing.push({ id: row.id, title: row.title, object_key: row.object_key }); }
    }
    // Record the finding. The row is NEVER deleted — what was uploaded, and
    // when, is itself part of the record.
    for (const m of missing) {
      await query(`UPDATE videos SET upload_status='missing' WHERE id=$1`, [m.id]).catch(() => {});
    }
    verification = { checked: sample.length, missing_in_bucket: missing.length, missing };
  }

  ok(res, {
    storage_configured: s3.isConfigured(),
    summary,
    verification,
    note: verification ? undefined
      : 'Add ?verify=true to HEAD each object against the bucket (slower).',
  });
}));

/**
 * GET /storage/orphans — objects in the bucket with no database row. These are
 * billed but unreferenced. Reported only; deletion is always a human decision.
 */
router.get('/orphans', requirePermission('storage', 'read'), asyncHandler(async (req, res) => {
  if (!s3.isConfigured()) return ok(res, { configured: false, orphans: [] });
  const listed = await s3.listObjects(req.query.prefix || '');
  const keys = (listed.Contents || []).map((o) => ({ key: o.Key, size: o.Size }));
  const { rows } = await query('SELECT object_key FROM videos WHERE object_key IS NOT NULL');
  const known = new Set(rows.map((r) => r.object_key));
  const orphans = keys.filter((k) => !known.has(k.key) && !k.key.endsWith('/'));
  ok(res, {
    configured: true,
    objects_in_bucket: keys.length,
    rows_in_database: known.size,
    orphan_count: orphans.length,
    orphan_bytes: orphans.reduce((a, o) => a + (o.size || 0), 0),
    orphans: orphans.slice(0, 200),
  });
}));

function humanBytes(n) {
  const b = Number(n) || 0;
  if (b >= 1e9) return `${(b / 1e9).toFixed(2)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  if (b >= 1e3) return `${(b / 1e3).toFixed(0)} KB`;
  return `${b} B`;
}

export default router;
