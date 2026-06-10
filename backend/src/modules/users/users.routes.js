import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission, requireRole } from '../../middleware/rbac.js';
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
  const patch = req.body; // e.g. { theme: 'dark', primaryColor: '#...' }
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

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (admin only)
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: role
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated user list
 */
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

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     responses:
 *       200:
 *         description: User detail
 */
router.get('/:id', requirePermission('users', 'read'), asyncHandler(async (req, res) => {
  const { rows: [user] } = await query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url, u.is_active, u.last_login_at, u.created_at,
            array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as roles
     FROM users u LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id
     WHERE u.id=$1 GROUP BY u.id`, [req.params.id]
  );
  if (!user) return notFound(res, 'User not found');
  ok(res, user);
}));

/**
 * @swagger
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Create a new user (admin only)
 *     responses:
 *       201:
 *         description: User created
 */
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

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update a user
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', requirePermission('users', 'update'), validate(updateUserSchema), asyncHandler(async (req, res) => {
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

/**
 * @swagger
 * /users/{id}/roles:
 *   post:
 *     tags: [Users]
 *     summary: Assign a role to a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role_name]
 *             properties:
 *               role_name: { type: string }
 *               course_id: { type: string, format: uuid }
 *               batch_id: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Role assigned
 */
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

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Deactivate a user (soft delete)
 *     responses:
 *       204:
 *         description: Deactivated
 */
router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  await query('UPDATE users SET is_active=false, updated_at=NOW() WHERE id=$1', [req.params.id]);
  noContent(res);
}));

export default router;
