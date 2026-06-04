import bcrypt from 'bcryptjs';
import * as authService from './auth.service.js';
import { ok, created, unauthorized, conflict } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.findUserByEmail(email);
  if (!user || !user.is_active) return unauthorized(res, 'Invalid credentials');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return unauthorized(res, 'Invalid credentials');

  const roles = user.role_names || [];
  const { accessToken, refreshToken } = authService.generateTokens(user, roles);
  await authService.storeRefreshToken(user.id, refreshToken);
  await authService.updateLastLogin(user.id);

  const { password_hash, ...safeUser } = user;
  ok(res, { user: safeUser, access_token: accessToken, refresh_token: refreshToken });
});

export const register = asyncHandler(async (req, res) => {
  const existing = await authService.findUserByEmail(req.body.email);
  if (existing) return conflict(res, 'Email already registered');

  const user = await authService.createUser(req.body);
  await authService.assignDefaultRole(user.id, 'applicant');

  const { accessToken, refreshToken } = authService.generateTokens(user, ['applicant']);
  await authService.storeRefreshToken(user.id, refreshToken);

  created(res, { user, access_token: accessToken, refresh_token: refreshToken }, 'Account created');
});

export const refresh = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;
  const userId = await authService.verifyRefreshToken(refresh_token);
  const user = await authService.findUserByEmail(null);  // get by id
  const { rows } = await import('../../config/database.js').then(m =>
    m.query(
      `SELECT u.*, array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as role_names
       FROM users u LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id
       WHERE u.id=$1 GROUP BY u.id`,
      [userId]
    )
  );
  if (!rows.length) return unauthorized(res, 'User not found');
  const u = rows[0];
  const { accessToken, refreshToken: newRefresh } = authService.generateTokens(u, u.role_names || []);
  await authService.revokeRefreshTokens(userId);
  await authService.storeRefreshToken(userId, newRefresh);
  ok(res, { access_token: accessToken, refresh_token: newRefresh });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.revokeRefreshTokens(req.user.id);
  ok(res, null, 'Logged out');
});

export const me = asyncHandler(async (req, res) => {
  const { rows } = await import('../../config/database.js').then(m =>
    m.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url, u.is_active,
              u.email_verified, u.last_login_at, u.created_at,
              array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [req.user.id]
    )
  );
  ok(res, rows[0]);
});
