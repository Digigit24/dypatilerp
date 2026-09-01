import { query } from '../../config/database.js';
import crypto from 'crypto';
import { env } from '../../config/env.js';

// ─── Video CRUD ──────────────────────────────────────────────────────────────

export const listVideos = async ({ course_id, batch_id, is_published, media_type, folder_id, visibility, user_roles, limit, offset }) => {
  const params = [];
  const conds = [];
  if (course_id)    { params.push(course_id);    conds.push(`v.course_id = $${params.length}`); }
  if (batch_id)     { params.push(batch_id);     conds.push(`v.batch_id = $${params.length}`); }
  if (is_published !== undefined) { params.push(is_published); conds.push(`v.is_published = $${params.length}`); }
  if (media_type)   { params.push(media_type);   conds.push(`v.media_type = $${params.length}`); }
  if (folder_id === 'root') { conds.push('v.folder_id IS NULL'); }
  else if (folder_id)       { params.push(folder_id); conds.push(`v.folder_id = $${params.length}`); }

  // Visibility filtering based on caller role
  if (visibility) {
    // Explicit override (admin use)
    params.push(visibility);
    conds.push(`v.visibility = $${params.length}`);
  } else if (user_roles) {
    const roles = Array.isArray(user_roles) ? user_roles : [user_roles];
    const isAdmin = roles.some((r) => ['admin', 'coordinator'].includes(r));
    const isStaff = roles.some((r) => ['academic_guide', 'industry_mentor'].includes(r));
    if (!isAdmin && !isStaff) {
      // Students: see 'course' and 'public' items (batch-scoped items handled by batch_id filter above)
      conds.push(`v.visibility IN ('course','public')`);
    } else if (isStaff) {
      // Staff (guide/mentor): see 'course' and 'public' (not 'private' drafts unless it's their own)
      conds.push(`v.visibility IN ('course','public','batch')`);
    }
    // admin/coordinator: no restriction — see everything
  }

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
    `INSERT INTO videos (course_id, batch_id, title, description, duration_sec, object_key, file_size, thumbnail_key, sort_order, uploaded_by, is_published, media_type, mime_type, folder_id, visibility, assignment_id, submission_id, upload_status, owner_user_id, slot)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
    [
      payload.course_id || null, payload.batch_id || null, payload.title,
      payload.description || null, payload.duration_sec || 0,
      payload.object_key, payload.file_size || 0,
      payload.thumbnail_key || null, payload.sort_order || 0,
      uploadedBy, payload.is_published || false,
      payload.media_type || 'video', payload.mime_type || null,
      payload.folder_id || null,
      payload.visibility || 'course',
      payload.assignment_id || null,
      payload.submission_id || null,
      payload.upload_status || 'ready',
      payload.owner_user_id || null,
      payload.slot || null,
    ]
  );
  return rows[0];
};

/**
 * Insert-or-replace the current file for a (owner_user_id, slot) pair — used
 * by profile-scoped documents (CV, identity docs, ...), where a slot only
 * ever holds one current file. Matches the `uq_videos_owner_slot` partial
 * unique index exactly so the ON CONFLICT target resolves.
 */
export const upsertOwnerSlotVideo = async (payload, uploadedBy) => {
  const { rows } = await query(
    `INSERT INTO videos (course_id, folder_id, batch_id, title, description, object_key, file_size, mime_type, media_type, uploaded_by, is_published, visibility, upload_status, owner_user_id, slot, verified_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'document',$9,false,'private','ready',$10,$11,NOW())
     ON CONFLICT (owner_user_id, slot) WHERE owner_user_id IS NOT NULL AND slot IS NOT NULL AND slot <> 'admission_confirmation'
     DO UPDATE SET
       title=EXCLUDED.title, description=EXCLUDED.description, object_key=EXCLUDED.object_key,
       file_size=EXCLUDED.file_size, mime_type=EXCLUDED.mime_type, uploaded_by=EXCLUDED.uploaded_by,
       course_id=EXCLUDED.course_id, folder_id=EXCLUDED.folder_id, batch_id=EXCLUDED.batch_id,
       upload_status='ready', verified_at=NOW(), updated_at=NOW(),
       is_published=false, published_at=NULL
     RETURNING *`,
    [
      payload.course_id || null, payload.folder_id || null, payload.batch_id || null,
      payload.title, payload.description || null, payload.object_key,
      payload.file_size || 0, payload.mime_type || null, uploadedBy,
      payload.owner_user_id, payload.slot,
    ]
  );
  return rows[0];
};

export const updateVideo = async (id, payload) => {
  const allowed = ['title','description','duration_sec','is_published','sort_order','thumbnail_key','media_type','mime_type','folder_id','visibility','batch_id','assignment_id','submission_id','upload_status','file_size'];
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

// ─── Default folder lookup ────────────────────────────────────────────────────

export const getOrCreateDefaultFolder = async (courseId, folderName, createdBy) => {
  const { rows: [existing] } = await query(
    `SELECT id FROM media_folders WHERE course_id=$1 AND name=$2 AND parent_id IS NULL`,
    [courseId, folderName]
  );
  if (existing) return existing.id;
  const { rows: [created] } = await query(
    `INSERT INTO media_folders (course_id, name, created_by) VALUES ($1,$2,$3) RETURNING id`,
    [courseId, folderName, createdBy]
  );
  return created.id;
};

/**
 * Resolve (creating if needed) the nested folder a submission file belongs in:
 *   Course > Batch > Semester N > Assignments|Progress Reports|Targets
 * Mirrors the Zata object key exactly, so the Media UI and the bucket agree.
 */
export const getOrCreateSubmissionFolder = async (courseId, batchCode, semester, kind, createdBy) => {
  const KIND_LABEL = { assignment: 'Assignments', progress_report: 'Progress Reports', target: 'Targets' };
  const path = [batchCode || 'Unassigned batch', `Semester ${Number(semester) || 1}`, KIND_LABEL[kind] || 'Submissions'];
  let parentId = null;
  for (const name of path) {
    const { rows: [found] } = await query(
      `SELECT id FROM media_folders WHERE course_id=$1 AND name=$2
         AND parent_id IS NOT DISTINCT FROM $3 LIMIT 1`,
      [courseId, name, parentId]
    );
    if (found) { parentId = found.id; continue; }
    const { rows: [made] } = await query(
      `INSERT INTO media_folders (course_id, parent_id, name, created_by, is_system, semester, kind)
       VALUES ($1,$2,$3,$4,TRUE,$5,$6) RETURNING id`,
      [courseId, parentId, name, createdBy, Number(semester) || 1, kind]
    );
    parentId = made.id;
  }
  return parentId;
};

/**
 * Resolve (creating if needed) the folder a scholar's admin-managed, owner-slot
 * documents belong in: Course > Batch > Students > <Scholar Name>. Mirrors
 * getOrCreateSubmissionFolder's path-walk exactly, just keyed to a scholar
 * instead of a submission kind — so official letters (and any future
 * admin-issued, per-scholar document) show up in the Media Manager's normal
 * folder tree instead of being invisible owner-slot rows.
 */
// `cache` is an optional Map shared across a whole batch run (bulk admission-
// letter generation, say) — the first two path segments (batch code,
// "Students") are IDENTICAL for every scholar in that batch, so without it a
// 46-scholar run redoes the same two lookups 46 times over for no reason.
export const getOrCreateStudentDocFolder = async (courseId, batchCode, studentLabel, createdBy, cache = null) => {
  const path = [batchCode || 'Unassigned batch', 'Students', studentLabel || 'Unnamed scholar'];
  let parentId = null;
  for (const name of path) {
    const cacheKey = `${courseId}|${parentId}|${name}`;
    if (cache?.has(cacheKey)) { parentId = cache.get(cacheKey); continue; }
    const { rows: [found] } = await query(
      `SELECT id FROM media_folders WHERE course_id=$1 AND name=$2
         AND parent_id IS NOT DISTINCT FROM $3 LIMIT 1`,
      [courseId, name, parentId]
    );
    if (found) {
      parentId = found.id;
    } else {
      const { rows: [made] } = await query(
        `INSERT INTO media_folders (course_id, parent_id, name, created_by, is_system, kind)
         VALUES ($1,$2,$3,$4,TRUE,'student_documents') RETURNING id`,
        [courseId, parentId, name, createdBy]
      );
      parentId = made.id;
    }
    cache?.set(cacheKey, parentId);
  }
  return parentId;
};

// ─── Media folders ────────────────────────────────────────────────────────────

export const listFolders = async ({ course_id, parent_id }) => {
  const params = [];
  const conds = [];
  if (course_id) { params.push(course_id); conds.push(`f.course_id = $${params.length}`); }
  if (parent_id === 'root') { conds.push('f.parent_id IS NULL'); }
  else if (parent_id)       { params.push(parent_id); conds.push(`f.parent_id = $${params.length}`); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT f.*,
            (SELECT COUNT(*) FROM videos v WHERE v.folder_id = f.id)        AS item_count,
            (SELECT COUNT(*) FROM media_folders c WHERE c.parent_id = f.id) AS subfolder_count
     FROM media_folders f
     ${where}
     ORDER BY f.name ASC`, params
  );
  return rows;
};

export const getFolderById = async (id) => {
  const { rows } = await query('SELECT * FROM media_folders WHERE id=$1', [id]);
  return rows[0] || null;
};

/** Direct-child files of one folder (not recursive — subfolders are skipped, same scope as the ZIP download). */
export const listFolderFiles = async (folderId) => {
  const { rows } = await query(
    `SELECT id, title, object_key, mime_type FROM videos WHERE folder_id=$1 AND object_key IS NOT NULL`,
    [folderId]
  );
  return rows;
};

export const createFolder = async ({ course_id, parent_id, name }, createdBy) => {
  const { rows } = await query(
    `INSERT INTO media_folders (course_id, parent_id, name, created_by)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [course_id || null, parent_id || null, name, createdBy]
  );
  return rows[0];
};

export const updateFolder = async (id, payload) => {
  const allowed = ['name', 'parent_id'];
  const fields = [];
  const params = [];
  for (const k of allowed) {
    if (payload[k] !== undefined) { params.push(payload[k]); fields.push(`${k}=$${params.length}`); }
  }
  if (!fields.length) return getFolderById(id);
  params.push(id);
  const { rows } = await query(
    `UPDATE media_folders SET ${fields.join(',')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`, params
  );
  return rows[0] || null;
};

export const deleteFolder = async (id) => {
  const folder = await getFolderById(id);
  if (!folder) return null;
  // Move contained media + subfolders up to the parent (no destructive cascade of files)
  await query('UPDATE videos SET folder_id=$1 WHERE folder_id=$2', [folder.parent_id, id]);
  await query('UPDATE media_folders SET parent_id=$1 WHERE parent_id=$2', [folder.parent_id, id]);
  await query('DELETE FROM media_folders WHERE id=$1', [id]);
  return folder;
};

/** Breadcrumb path from root → folder */
export const getFolderPath = async (id) => {
  const path = [];
  let cur = await getFolderById(id);
  let guard = 0;
  while (cur && guard < 20) {
    path.unshift({ id: cur.id, name: cur.name });
    cur = cur.parent_id ? await getFolderById(cur.parent_id) : null;
    guard += 1;
  }
  return path;
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
    `SELECT vs.*, v.object_key, v.course_id, v.is_published, v.file_size, v.mime_type, v.media_type, v.title
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
