import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../config/database.js';
import { unauthorized } from '../utils/response.js';
import { isImpersonationSessionActive } from '../modules/auth/auth.service.js';

// PostgreSQL returns text[] as "{admin,coordinator}" — parse to a real JS array
const parseRoles = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') return raw.replace(/^\{|\}$/g, '').split(',').filter(Boolean);
  return [];
};

// Apply JWT payload claims onto the DB user row. Used by BOTH authenticate and
// optionalAuth so the two can never drift (the source of ISSUE-007, where
// optionalAuth omitted the test-scoped claims and candidates were treated as
// staff on the take-test endpoint).
export const mapTokenToUser = (user, payload) => {
  user.roles = parseRoles(payload.roles);
  user.scope = payload.scope || null;
  // Test-scoped claims (set by test-auth login) — carry them through so the
  // take-test route can positively identify a candidate.
  if (payload.scope === 'test_only') {
    user.applicant_id = payload.applicant_id || null;
    user.token_id     = payload.token_id     || null;
    user.test_scope   = payload.test_id      || null;
  }
  // Admin-impersonation claims — carried through so route handlers (and the
  // global audit trail) can always tell a request apart from the target's own.
  if (payload.scope === 'impersonation') {
    user.impersonated_by         = payload.impersonated_by || null;
    user.impersonation_session_id = payload.impersonation_session_id || null;
  }
  return user;
};

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorized(res, 'No token provided');
  }

  const token = authHeader.slice(7);

  // 1. Verify the JWT first — only token problems may produce a 401
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    return unauthorized(res, 'Invalid or expired token');
  }

  // 2. DB lookup — a DB outage must NOT masquerade as an auth failure,
  //    otherwise the frontend logs the user out on every DB hiccup.
  try {
    // An impersonation token stays cryptographically valid for its full 15
    // minutes even after "Return to Admin" is clicked — re-check the backing
    // session row on every request so ending it takes effect immediately
    // instead of merely on the client, or after the token naturally expires.
    if (payload.scope === 'impersonation') {
      const active = await isImpersonationSessionActive(
        payload.impersonation_session_id, payload.impersonated_by, payload.sub
      );
      if (!active) return unauthorized(res, 'Impersonation session has ended');
    }

    const { rows } = await query(
      'SELECT id, email, first_name, last_name, is_active FROM users WHERE id = $1',
      [payload.sub]
    );
    if (!rows.length || !rows[0].is_active) {
      return unauthorized(res, 'User not found or inactive');
    }
    req.user = mapTokenToUser(rows[0], payload);
    next();
  } catch (err) {
    console.error('[auth] DB error during authentication:', err.message);
    return res.status(503).json({
      success: false,
      message: 'Database temporarily unreachable — please retry',
    });
  }
};

export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    const { rows } = await query(
      'SELECT id, email, first_name, last_name, is_active FROM users WHERE id = $1',
      [payload.sub]
    );
    if (rows.length && rows[0].is_active) {
      req.user = mapTokenToUser(rows[0], payload);
    }
  } catch { /* ignore */ }
  next();
};

/**
 * Guard for the handful of self-service actions an impersonated session must
 * never be allowed to take on the target's behalf — e.g. changing their
 * password. Mount after `authenticate`.
 */
export const blockDuringImpersonation = (req, res, next) => {
  if (req.user?.scope === 'impersonation') {
    return res.status(403).json({
      success: false,
      message: 'This action is disabled while viewing as another user.',
    });
  }
  next();
};
