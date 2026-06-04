import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { query } from '../../config/database.js';

const router = Router();
router.use(authenticate, requireRole('admin'));

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
    `SELECT p.* FROM permissions p
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
  const { permission_ids } = req.body;
  await query('DELETE FROM role_permissions WHERE role_id=$1', [req.params.id]);
  for (const pid of (permission_ids || [])) {
    await query(
      `INSERT INTO role_permissions (role_id,permission_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [req.params.id, pid]
    );
  }
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
