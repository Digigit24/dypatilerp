import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { query } from '../../config/database.js';
import { env } from '../../config/env.js';

export const findUserByEmail = async (email) => {
  const { rows } = await query(
    `SELECT u.*, array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as role_names
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.email = $1
     GROUP BY u.id`,
    [email]
  );
  return rows[0] || null;
};

export const createUser = async ({ email, password, first_name, last_name, phone }) => {
  const password_hash = await bcrypt.hash(password, 12);
  const { rows } = await query(
    `INSERT INTO users (email, password_hash, first_name, last_name, phone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, first_name, last_name, phone, is_active, created_at`,
    [email, password_hash, first_name, last_name, phone || null]
  );
  return rows[0];
};

export const assignDefaultRole = async (userId, roleName = 'applicant') => {
  const { rows: roleRows } = await query('SELECT id FROM roles WHERE name = $1', [roleName]);
  if (roleRows.length) {
    await query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, roleRows[0].id]
    );
  }
};

export const generateTokens = (user, roles = []) => {
  const payload = { sub: user.id, roles };
  const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ sub: user.id }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
  return { accessToken, refreshToken };
};

export const storeRefreshToken = async (userId, refreshToken) => {
  const hash = await bcrypt.hash(refreshToken, 8);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, hash, expiresAt]
  );
};

export const verifyRefreshToken = async (token) => {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET);
  const { rows } = await query(
    `SELECT rt.*, u.id as uid FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.user_id = $1 AND rt.expires_at > NOW()
     ORDER BY rt.created_at DESC LIMIT 10`,
    [payload.sub]
  );
  for (const row of rows) {
    if (await bcrypt.compare(token, row.token_hash)) {
      return payload.sub;
    }
  }
  throw new Error('Refresh token not found or expired');
};

export const revokeRefreshTokens = async (userId) => {
  await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
};

export const updateLastLogin = (userId) =>
  query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [userId]);
