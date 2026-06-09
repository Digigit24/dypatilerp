import { query } from '../../config/database.js';
import crypto from 'crypto';
import { env } from '../../config/env.js';

// ─── Video CRUD ──────────────────────────────────────────────────────────────

export const listVideos = async ({ course_id, batch_id, is_published, limit, offset }) => {
  const params = [];
  const conds = [];
  if (course_id)    { params.push(course_id);    conds.push(`v.course_id = $${params.length}`); }
  if (batch_id)     { params.push(batch_id);     conds.push(`v.batch_id = $${params.length}`); }
  if (is_published !== undefined) { params.push(is_published); conds.push(`v.is_published = $${params.length}`); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

  const { rows: data } = await query(
    `SELECT v.*, c.name AS course_name, c.code AS course_code,
            u.first_name || ' ' || u.last_name AS uploaded_by_name
     FROM videos v
     LEFT JOIN courses c ON c.id = v.course_id
     LEFT JOIN users u ON u.id = v.uploaded_by
     ${where}
     ORDER BY v.sort_order ASC, v.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const { rows: [{ total }] } = await query(
    `SELECT COUNT(*) AS total FROM videos v ${where}`, params
  );
  return { data, total: parseInt(total) };
};

export const getVideoById = async (id) => {
  const { rows } = await query(
    `SELECT v.*, c.name AS course_name, c.code AS course_code,
            u.first_name || ' ' || u.last_name AS uploaded_by_name
     FROM videos v
     LEFT JOIN courses c ON c.id = v.course_id
     LEFT JOIN users u ON u.id = v.uploaded_by
     WHERE v.id = $1`, [id]
  );
  return rows[0] || null;
};

export const createVideo = async (payload, uploadedBy) => {
  const { rows } = await query(
    `INSERT INTO videos (course_id, batch_id, title, description, duration_sec, object_key, file_size, thumbnail_key, sort_order, uploaded_by, is_published)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      payload.course_id, payload.batch_id || null, payload.title,
      payload.description || null, payload.duration_sec || 0,
      payload.object_key, payload.file_size || 0,
      payload.thumbnail_key || null, payload.sort_order || 0,
      uploadedBy, payload.is_published || false,
    ]
  );
  return rows[0];
};

export const updateVideo = async (id, payload) => {
  const allowed = ['title','description','duration_sec','is_published','sort_order','thumbnail_key'];
  const fields = [];
  const params = [];
  for (const k of allowed) {
    if (payload[k] !== undefined) { params.push(payload[k]); fields.push(`${k}=$${params.length}`); }
  }
  if (!fields.length) return getVideoById(id);
  params.push(id);
  const { rows } = await query(
    `UPDATE videos SET ${fields.join(',')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`, params
  );
  return rows[0] || null;
};

export const deleteVideo = async (id) => {
  const video = await getVideoById(id);
  await query('DELETE FROM videos WHERE id=$1', [id]);
  return video; // caller uses object_key to delete from Zata
};

// ─── Session management ──────────────────────────────────────────────────────

export const createSession = async (userId, videoId, ipAddress, userAgent) => {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + env.VIDEO_SESSION_TTL * 1000);
  // Replace any existing session for this user/video
  await query('DELETE FROM video_sessions WHERE user_id=$1 AND video_id=$2', [userId, videoId]);
  const { rows } = await query(
    `INSERT INTO video_sessions (user_id, video_id, ip_address, user_agent, token, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [userId, videoId, ipAddress, userAgent, token, expiresAt]
  );
  return rows[0];
};

export const validateSession = async (token) => {
  const { rows } = await query(
    `SELECT vs.*, v.object_key, v.course_id, v.is_published, v.file_size
     FROM video_sessions vs
     JOIN videos v ON v.id = vs.video_id
     WHERE vs.token = $1 AND vs.expires_at > NOW()`, [token]
  );
  return rows[0] || null;
};

// ─── Watch progress ──────────────────────────────────────────────────────────

export const upsertWatchLog = async (userId, videoId, lastPosition, newRange, durationSec) => {
  // Fetch existing log
  const { rows: existing } = await query(
    'SELECT * FROM video_watch_logs WHERE user_id=$1 AND video_id=$2', [userId, videoId]
  );
  const log = existing[0];

  // Merge intervals
  const ranges = log ? (log.watched_ranges || []) : [];
  if (newRange && newRange.length === 2) {
    ranges.push(newRange);
  }
  const merged = mergeIntervals(ranges);
  const totalSec = merged.reduce((s, [a, b]) => s + (b - a), 0);
  const completed = durationSec > 0 && totalSec >= durationSec * 0.9;

  const { rows } = await query(
    `INSERT INTO video_watch_logs (user_id, video_id, watched_ranges, total_watch_sec, last_position, completed, updated_at)
     VALUES ($1,$2,$3::jsonb,$4,$5,$6,NOW())
     ON CONFLICT (user_id,video_id) DO UPDATE
       SET watched_ranges=$3::jsonb, total_watch_sec=$4, last_position=$5, completed=$6, updated_at=NOW()
     RETURNING *`,
    [userId, videoId, JSON.stringify(merged), Math.round(totalSec), lastPosition, completed]
  );
  return rows[0];
};

export const getWatchLog = async (userId, videoId) => {
  const { rows } = await query(
    'SELECT * FROM video_watch_logs WHERE user_id=$1 AND video_id=$2', [userId, videoId]
  );
  return rows[0] || null;
};

export const getBatchWatchLogs = async (videoId) => {
  const { rows } = await query(
    `SELECT wl.*, u.first_name || ' ' || u.last_name AS student_name, u.email
     FROM video_watch_logs wl
     JOIN users u ON u.id = wl.user_id
     WHERE wl.video_id = $1
     ORDER BY wl.total_watch_sec DESC`, [videoId]
  );
  return rows;
};

// ─── Analytics ───────────────────────────────────────────────────────────────

export const getVideoAnalytics = async (videoId) => {
  const [total, completed, avg] = await Promise.all([
    query('SELECT COUNT(*) FROM video_watch_logs WHERE video_id=$1', [videoId]),
    query('SELECT COUNT(*) FROM video_watch_logs WHERE video_id=$1 AND completed=true', [videoId]),
    query('SELECT AVG(last_position) FROM video_watch_logs WHERE video_id=$1', [videoId]),
  ]);
  return {
    total_viewers: parseInt(total.rows[0].count),
    completions: parseInt(completed.rows[0].count),
    avg_position: parseFloat(avg.rows[0].avg || 0).toFixed(1),
  };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mergeIntervals = (intervals) => {
  if (!intervals.length) return [];
  const sorted = [...intervals].filter(([a, b]) => b > a).sort(([a], [b]) => a - b);
  const result = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = result[result.length - 1];
    if (sorted[i][0] <= last[1]) {
      last[1] = Math.max(last[1], sorted[i][1]);
    } else {
      result.push(sorted[i]);
    }
  }
  return result;
};
