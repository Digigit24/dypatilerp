import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole, bustPermissionCache } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, notFound, badRequest } from '../../utils/response.js';
import { query } from '../../config/database.js';

const router = Router();
router.use(authenticate);

/**
 * GET /roles/my-permissions — the caller's effective grants.
 * Open to every authenticated user: it drives sidebar visibility and
 * action gating in the frontend.
 */
router.get('/my-permissions', asyncHandler(async (req, res) => {
  // This response drives frontend visibility, so it must never be served as a
  // conditional 304. Express' default weak ETag made browser revalidations return
  // 304 with an empty body; the frontend treated that as a failed permission load
  // and fell back to showing everything. Strip the conditional-request headers so
  // Express can never mark the response "fresh" (→ always a 200 with the full
  // body, regardless of any proxy/CDN), and tell clients not to cache it at all.
  delete req.headers['if-none-match'];
  delete req.headers['if-modified-since'];
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');

  const { rows } = await query(
    `SELECT DISTINCT p.module, p.action, COALESCE(rp.scope, 'all') AS scope
     FROM user_roles ur
     JOIN role_permissions rp ON rp.role_id = ur.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE ur.user_id = $1
     ORDER BY p.module, p.action`,
    [req.user.id]
  );
  ok(res, { roles: req.user.roles, permissions: rows });
}));

// Everything below is admin-only
router.use(requireRole('admin'));

// ─── Team assignments (course / batch scoped role grants) ─────────────────────

/** GET /roles/assignments?course_id=… — who is assigned where */
router.get('/assignments', asyncHandler(async (req, res) => {
  const courseId = req.courseId || req.query.course_id;
  const params = [];
  let where = "WHERE r.name NOT IN ('student', 'applicant')";
  if (courseId) {
    params.push(courseId);
    where += ` AND (ur.course_id = $1 OR ur.batch_id IN (SELECT id FROM batches WHERE course_id = $1))`;
  }
  const { rows } = await query(
    `SELECT ur.id, ur.user_id, ur.role_id, ur.course_id, ur.batch_id, ur.assigned_at,
            u.first_name, u.last_name, u.email,
            r.name AS role_name, r.display_name AS role_display,
            b.name AS batch_name, b.code AS batch_code,
            c.name AS course_name
     FROM user_roles ur
     JOIN users u ON u.id = ur.user_id
     JOIN roles r ON r.id = ur.role_id
     LEFT JOIN batches b ON b.id = ur.batch_id
     LEFT JOIN courses c ON c.id = ur.course_id
     ${where}
     ORDER BY b.name NULLS FIRST, r.name, u.first_name`,
    params
  );
  ok(res, rows);
}));

/** POST /roles/assignments — assign a role scoped to a course and/or batch */
router.post('/assignments', asyncHandler(async (req, res) => {
  const { user_id, role_id, role_name, course_id, batch_id } = req.body;
  if (!user_id) return badRequest(res, 'user_id is required');

  let roleId = role_id;
  if (!roleId && role_name) {
    const { rows: [r] } = await query('SELECT id FROM roles WHERE name = $1', [role_name]);
    roleId = r?.id;
  }
  if (!roleId) return badRequest(res, 'role_id or role_name is required');

  // Resolve course from batch when only a batch is given
  let courseId = course_id || null;
  if (!courseId && batch_id) {
    const { rows: [b] } = await query('SELECT course_id FROM batches WHERE id = $1', [batch_id]);
    courseId = b?.course_id || null;
  }

  const { rows: [row] } = await query(
    `INSERT INTO user_roles (user_id, role_id, course_id, batch_id, assigned_by)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, role_id, course_id, batch_id) DO UPDATE SET assigned_at = NOW()
     RETURNING *`,
    [user_id, roleId, courseId, batch_id || null, req.user.id]
  );
  bustPermissionCache(user_id);
  created(res, row, 'Assignment saved');
}));

/** DELETE /roles/assignments/:id — remove one assignment */
router.delete('/assignments/:id', asyncHandler(async (req, res) => {
  const { rows: [row] } = await query('DELETE FROM user_roles WHERE id = $1 RETURNING user_id', [req.params.id]);
  if (!row) return notFound(res, 'Assignment not found');
  bustPermissionCache(row.user_id);
  res.status(204).send();
}));

/**
 * @swagger
 * /roles:
 *   get:
 *     tags: [Roles]
 *     summary: List all roles (admin only)
 *     responses:
 *       200:
 *         description: All roles
 */
router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM roles ORDER BY name');
  ok(res, rows);
}));

/**
 * @swagger
 * /roles/{id}/permissions:
 *   get:
 *     tags: [Roles]
 *     summary: Get permissions for a role
 *     responses:
 *       200:
 *         description: Permissions list
 */
router.get('/:id/permissions', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT p.*, COALESCE(rp.scope, 'all') AS scope FROM permissions p
     JOIN role_permissions rp ON rp.permission_id=p.id
     WHERE rp.role_id=$1
     ORDER BY p.module, p.action`, [req.params.id]
  );
  ok(res, rows);
}));

/**
 * @swagger
 * /roles/{id}/permissions:
 *   put:
 *     tags: [Roles]
 *     summary: Replace all permissions for a role
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [permission_ids]
 *             properties:
 *               permission_ids: { type: array, items: { type: string, format: uuid } }
 *     responses:
 *       200:
 *         description: Permissions updated
 */
router.put('/:id/permissions', asyncHandler(async (req, res) => {
  // Accepts grants: [{ permission_id, scope }] (new) or permission_ids: [id] (legacy, scope=all)
  const grants = Array.isArray(req.body.grants)
    ? req.body.grants
    : (req.body.permission_ids || []).map((id) => ({ permission_id: id, scope: 'all' }));

  const VALID_SCOPES = new Set(['all', 'course', 'batch', 'own']);
  await query('DELETE FROM role_permissions WHERE role_id=$1', [req.params.id]);
  for (const g of grants) {
    if (!g.permission_id) continue;
    const scope = VALID_SCOPES.has(g.scope) ? g.scope : 'all';
    await query(
      `INSERT INTO role_permissions (role_id, permission_id, scope) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [req.params.id, g.permission_id, scope]
    );
  }
  bustPermissionCache();
  ok(res, null, 'Permissions updated');
}));

/**
 * @swagger
 * /permissions:
 *   get:
 *     tags: [Roles]
 *     summary: List all available permissions (module × action matrix)
 *     responses:
 *       200:
 *         description: All permissions grouped by module
 */
router.get('/permissions/all', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM permissions ORDER BY module, action');
  const grouped = rows.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});
  ok(res, grouped);
}));

export default router;
