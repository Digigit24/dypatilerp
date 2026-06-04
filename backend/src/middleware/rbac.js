import { query } from '../config/database.js';
import { forbidden } from '../utils/response.js';

/**
 * Check if the authenticated user has the required permission.
 * Usage: requirePermission('students', 'read')
 */
export const requirePermission = (module, action) => async (req, res, next) => {
  if (!req.user) return forbidden(res);

  const { rows } = await query(
    `SELECT 1
     FROM user_roles ur
     JOIN role_permissions rp ON rp.role_id = ur.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE ur.user_id = $1
       AND p.module = $2
       AND p.action = $3
     LIMIT 1`,
    [req.user.id, module, action]
  );

  if (!rows.length) return forbidden(res, `Missing permission: ${module}:${action}`);
  next();
};

/**
 * Restrict to specific role names (quick guards for admin-only routes).
 * Usage: requireRole('admin') or requireRole('admin', 'coordinator')
 */
export const requireRole = (...roleNames) => (req, res, next) => {
  if (!req.user) return forbidden(res);
  const hasRole = req.user.roles.some((r) => roleNames.includes(r));
  if (!hasRole) return forbidden(res, `Requires one of roles: ${roleNames.join(', ')}`);
  next();
};
