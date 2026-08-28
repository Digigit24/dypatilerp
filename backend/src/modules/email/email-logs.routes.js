import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { query } from '../../config/database.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';

const router = Router();
// Proper permission module (seeded admin-only in alter.js block 37b) rather
// than the hardcoded requireRole('admin') its sibling /audit-logs uses —
// this lets access be extended to another role later via the Permissions UI
// with no code change.
router.use(authenticate, requirePermission('email_logs', 'read'));

/**
 * @swagger
 * /email-logs:
 *   get:
 *     tags: [Email]
 *     summary: Get paginated email send history (admin only)
 */
router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const params = [];
  const conds = [];

  if (req.query.status) {
    params.push(req.query.status);
    conds.push(`status = $${params.length}`);
  }
  if (req.query.kind) {
    params.push(req.query.kind);
    conds.push(`kind = $${params.length}`);
  }
  if (req.query.recipient) {
    params.push(`%${req.query.recipient}%`);
    conds.push(`(to_email ILIKE $${params.length} OR cc ILIKE $${params.length})`);
  }
  if (req.query.from) {
    params.push(req.query.from);
    conds.push(`created_at >= $${params.length}::date`);
  }
  if (req.query.to) {
    params.push(req.query.to);
    conds.push(`created_at < ($${params.length}::date + INTERVAL '1 day')`);
  }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

  const { rows: data } = await query(
    `SELECT * FROM email_logs
     ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const { rows: [{ total }] } = await query(
    `SELECT COUNT(*) AS total FROM email_logs ${where}`, params
  );

  res.json({ success: true, data, pagination: buildPaginationMeta(parseInt(total), page, limit) });
}));

/**
 * @swagger
 * /email-logs/kinds:
 *   get:
 *     tags: [Email]
 *     summary: List distinct email kinds for the filter dropdown
 */
router.get('/kinds', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT DISTINCT kind FROM email_logs WHERE kind IS NOT NULL ORDER BY kind`
  );
  ok(res, rows.map((r) => r.kind));
}));

export default router;
