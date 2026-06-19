import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission, requireRole, isOwnScope } from '../../middleware/rbac.js';
import { randomBytes } from 'crypto';
import { sendLoginCredentials } from '../email/email.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, notFound, noContent } from '../../utils/response.js';
import { query } from '../../config/database.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import bcrypt from 'bcryptjs';

const router = Router();
router.use(authenticate);

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(['admin','coordinator','academic_guide','industry_mentor','student','applicant']).optional(),
});

const updateUserSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  phone: z.string().optional(),
  avatar_url: z.string().url().optional(),
  is_active: z.boolean().optional(),
});

// ─── GET /users/me/preferences ───────────────────────────────────────────────
// Must come before /:id to avoid route shadowing
router.get('/me/preferences', asyncHandler(async (req, res) => {
  const { rows: [user] } = await query(
    `SELECT COALESCE(preferences, '{}') AS preferences FROM users WHERE id=$1`,
    [req.user.id]
  );
  ok(res, user?.preferences || {});
}));

// ─── PATCH /users/me/preferences ─────────────────────────────────────────────
router.patch('/me/preferences', asyncHandler(async (req, res) => {
  const patch = req.body;
  const { rows: [user] } = await query(
    `UPDATE users
     SET preferences = COALESCE(preferences, '{}') || $1::jsonb,
         updated_at  = NOW()
     WHERE id=$2
     RETURNING COALESCE(preferences, '{}') AS preferences`,
    [JSON.stringify(patch), req.user.id]
  );
  ok(res, user?.preferences || {}, 'Preferences saved');
}));

// ─── Credentials helpers ──────────────────────────────────────────────────────
const genPassword = () => randomBytes(6).toString('base64url').slice(0, 10);

const courseOfUser = async (userId) => {
  const { rows: [row] } = await query(
    `SELECT b.course_id FROM batch_enrollments be
     JOIN batches b ON b.id = be.batch_id
     WHERE be.user_id = $1 AND be.status = 'active' LIMIT 1`, [userId]
  );
  return row?.course_id || null;
};

const isStaff = (roles = []) => (roles || []).some((r) => !['student', 'applicant'].includes(r));

const rotateAndSend = async (userId) => {
  const { rows: [user] } = await query(
    `SELECT u.id, u.email, u.first_name, u.last_name,
            array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) AS roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.id = $1 GROUP BY u.id`, [userId]
  );
  if (!user) return { ok: false, error: 'User not found' };

  const password = genPassword();
  const hash = await bcrypt.hash(password, 10);
  await query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hash, userId]);

  const roles = Array.isArray(user.roles) ? user.roles
    : typeof user.roles === 'string' ? user.roles.replace(/^\{|\}$/g, '').split(',').filter(Boolean) : [];
  const courseId = await courseOfUser(userId);
  const result = await sendLoginCredentials({
    user,
    password,
    courseId,
    portalLabel: isStaff(roles) ? 'Staff Portal' : 'Scholar Portal',
  });
  return {
    ok: true,
    user_id: userId,
    name: `${user.first_name} ${user.last_name || ''}`.trim(),
    email: user.email,
    email_sent: !!result.success,
    email_error: result.success ? null : result.error,
  };
};

// ─── POST /users/me/password ──────────────────────────────────────────────────
router.post('/me/password', asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ success: false, message: 'current_password and new_password are required' });
  }
  if (String(new_password).length < 8) {
    return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
  }
  const { rows: [u] } = await query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
  const valid = u && await bcrypt.compare(current_password, u.password_hash);
  if (!valid) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  const hash = await bcrypt.hash(new_password, 10);
  await query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hash, req.user.id]);
  ok(res, null, 'Password changed');
}));

// ─── POST /users/bulk-send-credentials ───────────────────────────────────────
router.post('/bulk-send-credentials', requireRole('admin'), asyncHandler(async (req, res) => {
  const ids = [...new Set(req.body.user_ids || [])];
  if (!ids.length) return res.status(400).json({ success: false, message: 'user_ids is required' });
  if (ids.length > 300) return res.status(400).json({ success: false, message: 'Max 300 recipients per batch' });

  const results = [];
  for (const id of ids) {
    try { results.push(await rotateAndSend(id)); }
    catch (err) { results.push({ ok: false, user_id: id, email_sent: false, email_error: err.message }); }
  }
  const sent = results.filter((r) => r.email_sent).length;
  ok(res, { total: ids.length, emails_sent: sent, results }, `Credentials sent to ${sent}/${ids.length} user(s)`);
}));

// ─── POST /users/:id/send-credentials ────────────────────────────────────────
router.post('/:id/send-credentials', requireRole('admin', 'coordinator'), asyncHandler(async (req, res) => {
  const result = await rotateAndSend(req.params.id);
  if (!result.ok) return res.status(404).json({ success: false, message: result.error });
  ok(res, result, result.email_sent ? 'Credentials emailed' : `Password reset but email failed: ${result.email_error}`);
}));

// ─── POST /users/:id/reset-password ──────────────────────────────────────────
router.post('/:id/reset-password', requireRole('admin'), asyncHandler(async (req, res) => {
  const { rows: [user] } = await query('SELECT id, email, first_name, last_name FROM users WHERE id=$1', [req.params.id]);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const password = (req.body.password || '').trim() || genPassword();
  if (password.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
  const hash = await bcrypt.hash(password, 10);
  await query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hash, req.params.id]);

  let email_sent = false;
  if (req.body.send_email) {
    const courseId = await courseOfUser(req.params.id);
    const r = await sendLoginCredentials({ user, password, courseId, portalLabel: 'Portal' });
    email_sent = !!r.success;
  }
  ok(res, { password, email_sent }, 'Password reset');
}));

// ─── GET /users ───────────────────────────────────────────────────────────────
router.get('/', requirePermission('users', 'read'), asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const params = [];
  const conds = [];
  if (req.query.search) {
    params.push(`%${req.query.search}%`);
    conds.push(`(u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }
  if (req.query.role) {
    params.push(req.query.role);
    conds.push(`EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.name=$${params.length})`);
  } else if (req.query.include_all !== 'true') {
    // Default view = staff only. Exclude users whose roles are only student/applicant.
    // Role-less accounts (rare staff records) are kept so they remain manageable.
    conds.push(`(
      NOT EXISTS (SELECT 1 FROM user_roles ur0 WHERE ur0.user_id = u.id)
      OR EXISTS (
        SELECT 1 FROM user_roles ur2 JOIN roles r2 ON r2.id = ur2.role_id
        WHERE ur2.user_id = u.id AND r2.name NOT IN ('student', 'applicant')
      )
    )`);
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const { rows: data } = await query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url, u.is_active, u.last_login_at, u.created_at,
            array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as roles
     FROM users u LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id
     ${where} GROUP BY u.id ORDER BY u.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
    [...params, limit, offset]
  );
  const { rows: [{ total }] } = await query(`SELECT COUNT(DISTINCT u.id) AS total FROM users u ${where}`, params);
  res.json({ success: true, data, pagination: buildPaginationMeta(parseInt(total), page, limit) });
}));

// ─── GET /users/:id ───────────────────────────────────────────────────────────
router.get('/:id', requirePermission('users', 'read'), asyncHandler(async (req, res) => {
  // Own-scope users (students) can only read their own record
  if (isOwnScope(req) && req.user.id !== req.params.id) {
    return res.status(403).json({ success: false, code: 'PERMISSION_DENIED', message: 'You can only view your own profile.' });
  }
  const { rows: [user] } = await query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url, u.is_active, u.last_login_at, u.created_at,
            array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as roles
     FROM users u LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id
     WHERE u.id=$1 GROUP BY u.id`, [req.params.id]
  );
  if (!user) return notFound(res, 'User not found');
  ok(res, user);
}));

// ─── POST /users ──────────────────────────────────────────────────────────────
router.post('/', requireRole('admin'), validate(createUserSchema), asyncHandler(async (req, res) => {
  const hash = await bcrypt.hash(req.body.password, 12);
  const { rows: [user] } = await query(
    `INSERT INTO users (email,password_hash,first_name,last_name,phone) VALUES ($1,$2,$3,$4,$5) RETURNING id,email,first_name,last_name,created_at`,
    [req.body.email, hash, req.body.first_name, req.body.last_name, req.body.phone||null]
  );
  if (req.body.role) {
    const { rows: [role] } = await query('SELECT id FROM roles WHERE name=$1', [req.body.role]);
    if (role) await query(`INSERT INTO user_roles (user_id,role_id,assigned_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [user.id, role.id, req.user.id]);
  }
  created(res, user, 'User created');
}));

// ─── PUT /users/:id ───────────────────────────────────────────────────────────
router.put('/:id', requirePermission('users', 'update'), validate(updateUserSchema), asyncHandler(async (req, res) => {
  // Own-scope users (students) can only update their own record, and cannot change is_active
  if (isOwnScope(req)) {
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ success: false, code: 'PERMISSION_DENIED', message: 'You can only update your own profile.' });
    }
    delete req.body.is_active; // students cannot activate/deactivate themselves
  }
  const fields = [];
  const params = [];
  const allowed = ['first_name','last_name','phone','avatar_url','is_active'];
  for (const k of allowed) {
    if (req.body[k] !== undefined) { params.push(req.body[k]); fields.push(`${k}=$${params.length}`); }
  }
  if (!fields.length) return notFound(res, 'Nothing to update');
  params.push(req.params.id);
  const { rows: [user] } = await query(
    `UPDATE users SET ${fields.join(',')}, updated_at=NOW() WHERE id=$${params.length} RETURNING id,email,first_name,last_name,is_active`, params
  );
  if (!user) return notFound(res, 'User not found');
  ok(res, user, 'Updated');
}));

// ─── POST /users/:id/roles ────────────────────────────────────────────────────
router.post('/:id/roles', requireRole('admin', 'coordinator'), asyncHandler(async (req, res) => {
  const { role_name, course_id, batch_id } = req.body;
  const { rows: [role] } = await query('SELECT id FROM roles WHERE name=$1', [role_name]);
  if (!role) return notFound(res, 'Role not found');
  await query(
    `INSERT INTO user_roles (user_id,role_id,course_id,batch_id,assigned_by) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
    [req.params.id, role.id, course_id||null, batch_id||null, req.user.id]
  );
  ok(res, null, 'Role assigned');
}));

// ─── DELETE /users/:id ────────────────────────────────────────────────────────
router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  await query('UPDATE users SET is_active=false, updated_at=NOW() WHERE id=$1', [req.params.id]);
  noContent(res);
}));

export default router;
