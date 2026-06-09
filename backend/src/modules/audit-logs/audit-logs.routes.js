import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { query } from '../../config/database.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';

const router = Router();
router.use(authenticate, requireRole('admin'));

/**
 * @swagger
 * /audit-logs:
 *   get:
 *     tags: [Audit]
 *     summary: Get paginated audit logs (admin only)
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *         description: Filter by action keyword (ILIKE match)
 *       - in: query
 *         name: resource_type
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Paginated audit log entries with actor names
 */
router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const params = [];
  const conds = [];

  if (req.query.user_id) {
    params.push(req.query.user_id);
    conds.push(`al.user_id = $${params.length}`);
  }
  if (req.query.action) {
    params.push(`%${req.query.action}%`);
    conds.push(`al.action ILIKE $${params.length}`);
  }
  if (req.query.resource_type) {
    params.push(req.query.resource_type);
    conds.push(`al.resource_type = $${params.length}`);
  }
  if (req.query.from) {
    params.push(req.query.from);
    conds.push(`al.created_at >= $${params.length}::date`);
  }
  if (req.query.to) {
    params.push(req.query.to);
    conds.push(`al.created_at < ($${params.length}::date + INTERVAL '1 day')`);
  }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

  const { rows: data } = await query(
    `SELECT al.*,
            u.first_name || ' ' || u.last_name AS actor_name,
            u.email AS actor_email
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ${where}
     ORDER BY al.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const { rows: [{ total }] } = await query(
    `SELECT COUNT(*) AS total FROM audit_logs al ${where}`, params
  );

  res.json({ success: true, data, pagination: buildPaginationMeta(parseInt(total), page, limit) });
}));

/**
 * @swagger
 * /audit-logs/actions:
 *   get:
 *     tags: [Audit]
 *     summary: List distinct action types for filter dropdown
 */
router.get('/actions', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT DISTINCT action FROM audit_logs ORDER BY action LIMIT 200`
  );
  ok(res, rows.map((r) => r.action));
}));

/**
 * @swagger
 * /audit-logs/resource-types:
 *   get:
 *     tags: [Audit]
 *     summary: List distinct resource types for filter dropdown
 */
router.get('/resource-types', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT DISTINCT resource_type FROM audit_logs WHERE resource_type IS NOT NULL ORDER BY resource_type`
  );
  ok(res, rows.map((r) => r.resource_type));
}));

export default router;
