import bcrypt from 'bcryptjs';
import * as authService from './auth.service.js';
import { sendPasswordResetEmail, sendLoginOtpEmail } from '../email/email.service.js';
import { env } from '../../config/env.js';
import { ok, created, badRequest, unauthorized, conflict } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { writeAuditLog } from '../../utils/auditLog.js';

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
  writeAuditLog({
    userId: user.id, action: 'LOGIN',
    resourceType: 'user', resourceId: user.id,
    changes: { email: user.email },
    ipAddress: req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress,
  });

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
  const user = await authService.findUserById(userId);
  if (!user) return unauthorized(res, 'User not found');
  const { accessToken, refreshToken: newRefresh } = authService.generateTokens(user, user.role_names || []);
  await authService.revokeRefreshTokens(userId);
  await authService.storeRefreshToken(userId, newRefresh);
  ok(res, { access_token: accessToken, refresh_token: newRefresh });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.revokeRefreshTokens(req.user.id);
  ok(res, null, 'Logged out');
});

const clientIp = (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress;

// ─── Forgot / reset password ──────────────────────────────────────────────────
// Always responds with the same generic message regardless of whether the
// email exists — an account-enumeration oracle is exactly the kind of thing a
// forgot-password endpoint must never become.
const GENERIC_FORGOT_MESSAGE = 'If that email address is registered, a password reset link is on its way.';

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await authService.findUserByEmail(email);
  if (user && user.is_active) {
    const rawToken = await authService.createPasswordResetToken(user.id);
    if (rawToken) {
      const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${rawToken}`;
      sendPasswordResetEmail({ user, resetUrl }).catch((err) =>
        console.error('[auth] Failed to send password reset email:', err.message)
      );
      writeAuditLog({
        userId: user.id, action: 'PASSWORD_RESET_REQUESTED',
        resourceType: 'user', resourceId: user.id,
        ipAddress: clientIp(req),
      });
    }
  }
  ok(res, null, GENERIC_FORGOT_MESSAGE);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, new_password } = req.body;
  const userId = await authService.consumePasswordResetToken(token);
  if (!userId) {
    return badRequest(res, 'This reset link is invalid or has expired. Please request a new one.');
  }
  const passwordHash = await bcrypt.hash(new_password, 12);
  await authService.updatePasswordHash(userId, passwordHash);
  // Forces re-login everywhere — a password reset is exactly the moment every
  // other session (possibly the one an attacker still holds) should die.
  await authService.revokeRefreshTokens(userId);
  writeAuditLog({
    userId, action: 'PASSWORD_RESET_COMPLETED',
    resourceType: 'user', resourceId: userId,
    ipAddress: clientIp(req),
  });
  ok(res, null, 'Your password has been reset. Please log in with your new password.');
});

// ─── Admin impersonation ──────────────────────────────────────────────────────
// Ending is intentionally idempotent (no-op success) rather than an error when
// called with a non-impersonation token — the frontend's "Return to Admin"
// button always fires this best-effort, even if the session already lapsed.
export const endImpersonation = asyncHandler(async (req, res) => {
  if (req.user.scope !== 'impersonation' || !req.user.impersonation_session_id) {
    return ok(res, null, 'No active impersonation session');
  }
  await authService.endImpersonationSession(req.user.impersonation_session_id, 'manual');
  writeAuditLog({
    userId: req.user.impersonated_by || null, action: 'IMPERSONATION_END',
    resourceType: 'user', resourceId: req.user.id,
    changes: { session_id: req.user.impersonation_session_id },
    ipAddress: clientIp(req),
  });
  ok(res, null, 'Impersonation ended');
});

// ─── Email OTP login ──────────────────────────────────────────────────────────
// Same anti-enumeration shape as forgot-password: always a generic success
// response, so this can never be used to probe which emails are registered.
const GENERIC_OTP_MESSAGE = 'If that email address is registered, a sign-in code is on its way.';

export const requestLoginOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await authService.findUserByEmail(email);
  if (user && user.is_active) {
    const code = await authService.createLoginOtp(user.id);
    if (code) {
      sendLoginOtpEmail({ user, code }).catch((err) =>
        console.error('[auth] Failed to send login OTP email:', err.message)
      );
      writeAuditLog({
        userId: user.id, action: 'LOGIN_OTP_REQUESTED',
        resourceType: 'user', resourceId: user.id,
        ipAddress: clientIp(req),
      });
    }
  }
  ok(res, null, GENERIC_OTP_MESSAGE);
});

export const verifyOtpAndLogin = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  const user = await authService.findUserByEmail(email);
  if (!user || !user.is_active) return unauthorized(res, 'Incorrect code');

  let valid;
  try {
    valid = await authService.verifyLoginOtp(user.id, code);
  } catch (err) {
    // OTP_NOT_FOUND must read identically to "wrong code" / "no such user" —
    // otherwise calling this endpoint directly (skipping /otp/request) with
    // any code would distinguish a registered email (400, no active code)
    // from an unregistered one (401) without ever sending a request-otp
    // email, defeating the whole point of the generic response there.
    // OTP_LOCKED stays distinct: reaching it already implies a real OTP
    // session existed, so surfacing it costs no additional information and
    // is genuinely useful — it tells a fumbling real user to stop retrying
    // a dead code and request a fresh one.
    if (err.code === 'OTP_LOCKED') return badRequest(res, err.message);
    return unauthorized(res, 'Incorrect code');
  }
  if (!valid) return unauthorized(res, 'Incorrect code');

  const roles = user.role_names || [];
  const { accessToken, refreshToken } = authService.generateTokens(user, roles);
  await authService.storeRefreshToken(user.id, refreshToken);
  await authService.updateLastLogin(user.id);
  writeAuditLog({
    userId: user.id, action: 'LOGIN_OTP',
    resourceType: 'user', resourceId: user.id,
    changes: { email: user.email },
    ipAddress: clientIp(req),
  });

  const { password_hash, ...safeUser } = user;
  ok(res, { user: safeUser, access_token: accessToken, refresh_token: refreshToken });
});

export const me = asyncHandler(async (req, res) => {
  const { rows } = await import('../../config/database.js').then(m =>
    m.query(
      `SELECT u.id, u.email, u.first_name, u.middle_name, u.last_name, u.phone, u.avatar_url, u.is_active,
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
