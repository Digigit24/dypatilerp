/**
 * Scoped RBAC — the single thin layer every API obeys.
 *
 * A grant is (role, module, action, scope) where scope is one of:
 *   all    — everything, everywhere
 *   course — rows belonging to courses the user is assigned to (user_roles.course_id)
 *   batch  — rows belonging to batches the user is assigned to (user_roles.batch_id)
 *   own    — only the user's own rows
 *
 * requirePermission(module, action):
 *   1. denies with a clean, human 403 when no grant exists
 *   2. otherwise attaches req.perm = { scope, courseIds, batchIds, userId }
 *      so route handlers can constrain their queries via the helpers below.
 */
import { query } from '../config/database.js';
import { forbidden } from '../utils/response.js';

const SCOPE_RANK = { all: 4, course: 3, batch: 2, own: 1 };

// ── Per-user grants cache (60s) — keeps the layer thin at runtime ────────────
const _cache = new Map();
const CACHE_TTL = 60_000;

/** Call after changing role permissions or user assignments. */
export const bustPermissionCache = (userId) => {
  if (userId) _cache.delete(userId);
  else _cache.clear();
};

const loadGrants = async (userId) => {
  const hit = _cache.get(userId);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit;

  const { rows: grants } = await query(
    `SELECT DISTINCT p.module, p.action, COALESCE(rp.scope, 'all') AS scope
     FROM user_roles ur
     JOIN role_permissions rp ON rp.role_id = ur.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE ur.user_id = $1`,
    [userId]
  );
  const { rows: scopeRows } = await query(
    'SELECT DISTINCT course_id, batch_id FROM user_roles WHERE user_id = $1',
    [userId]
  );
  const entry = {
    ts: Date.now(),
    grants,
    courseIds: [...new Set(scopeRows.map((r) => r.course_id).filter(Boolean))],
    batchIds: [...new Set(scopeRows.map((r) => r.batch_id).filter(Boolean))],
  };
  _cache.set(userId, entry);
  return entry;
};

/**
 * Non-middleware permission check for handlers that must vary their RESPONSE
 * (not just allow/deny) by what the caller may see — e.g. the admin dashboard
 * trimming aggregate sections a guide/mentor isn't permitted to view. Reuses the
 * same 60s grants cache as requirePermission(); the backend stays the authority.
 */
export const userHasPermission = async (userId, module, action = 'read') => {
  if (!userId) return false;
  const { grants } = await loadGrants(userId);
  return grants.some((g) => g.module === module && g.action === action);
};

export const requirePermission = (module, action) => async (req, res, next) => {
  if (!req.user) return forbidden(res);
  try {
    const { grants, courseIds, batchIds } = await loadGrants(req.user.id);
    const matching = grants.filter((g) => g.module === module && g.action === action);

    if (!matching.length) {
      return res.status(403).json({
        success: false,
        code: 'PERMISSION_DENIED',
        message: `You don't have permission to ${action} ${module.replaceAll('_', ' ')}.`,
      });
    }

    // Strongest grant wins (all > course > batch > own)
    const best = matching.reduce((a, b) => (SCOPE_RANK[b.scope] > SCOPE_RANK[a.scope] ? b : a));
    req.perm = { module, action, scope: best.scope, courseIds, batchIds, userId: req.user.id };
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Restrict to specific role names (quick guards for admin-only routes).
 * Usage: requireRole('admin') or requireRole('admin', 'coordinator')
 */
export const requireRole = (...roleNames) => (req, res, next) => {
  if (!req.user) return forbidden(res);
  const hasRole = req.user.roles.some((r) => roleNames.includes(r));
  if (!hasRole) {
    return res.status(403).json({
      success: false,
      code: 'PERMISSION_DENIED',
      message: `This action requires the ${roleNames.join(' or ')} role.`,
    });
  }
  next();
};

// ── Scope helpers for list/query endpoints ────────────────────────────────────
// IDs come from our own database (uuid columns), never from user input,
// so inlining them is safe.

/** SQL fragment limiting `batchCol` to the user's assigned batches (batch scope). */
export const scopeBatchSQL = (req, batchCol) => {
  if (req.perm?.scope !== 'batch') return '';
  if (!req.perm.batchIds.length) return 'AND FALSE';
  return `AND ${batchCol} IN (${req.perm.batchIds.map((id) => `'${id}'`).join(',')})`;
};

/** SQL fragment limiting `courseCol` to the user's assigned courses (course scope). */
export const scopeCourseSQL = (req, courseCol) => {
  if (req.perm?.scope !== 'course') return '';
  if (!req.perm.courseIds.length) return 'AND FALSE';
  return `AND ${courseCol} IN (${req.perm.courseIds.map((id) => `'${id}'`).join(',')})`;
};

/** True when the grant only covers the user's own rows. */
export const isOwnScope = (req) => req.perm?.scope === 'own';

/** Array of allowed batch ids (or null when unrestricted). */
export const allowedBatchIds = (req) =>
  req.perm?.scope === 'batch' ? req.perm.batchIds : null;
