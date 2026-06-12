import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../config/database.js';
import { unauthorized } from '../utils/response.js';

// PostgreSQL returns text[] as "{admin,coordinator}" — parse to a real JS array
const parseRoles = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') return raw.replace(/^\{|\}$/g, '').split(',').filter(Boolean);
  return [];
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
    const { rows } = await query(
      'SELECT id, email, first_name, last_name, is_active FROM users WHERE id = $1',
      [payload.sub]
    );
    if (!rows.length || !rows[0].is_active) {
      return unauthorized(res, 'User not found or inactive');
    }
    req.user = rows[0];
    req.user.roles = parseRoles(payload.roles);
    // Carry test-scoped claims through (set by test-auth login)
    if (payload.scope === 'test_only') {
      req.user.applicant_id = payload.applicant_id || null;
      req.user.token_id     = payload.token_id     || null;
      req.user.test_scope   = payload.test_id      || null;
    }
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
      req.user = rows[0];
      req.user.roles = parseRoles(payload.roles);
    }
  } catch { /* ignore */ }
  next();
};
