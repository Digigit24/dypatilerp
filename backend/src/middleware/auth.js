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
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    const { rows } = await query(
      'SELECT id, email, first_name, last_name, is_active FROM users WHERE id = $1',
      [payload.sub]
    );
    if (!rows.length || !rows[0].is_active) {
      return unauthorized(res, 'User not found or inactive');
    }
    req.user = rows[0];
    req.user.roles = parseRoles(payload.roles);
    next();
  } catch {
    return unauthorized(res, 'Invalid or expired token');
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
