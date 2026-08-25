import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { query, getClient } from '../../config/database.js';
import { env } from '../../config/env.js';

// Impersonation access tokens are deliberately short-lived and never refreshed
// — when one expires, the "view as" session simply ends and the admin must
// click Impersonate again. Keeps the whole feature refresh-token-free.
const IMPERSONATION_TOKEN_TTL = '15m';
const IMPERSONATION_TTL_MS = 15 * 60 * 1000;

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

export const findUserById = async (id) => {
  const { rows } = await query(
    `SELECT u.*, array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as role_names
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.id = $1
     GROUP BY u.id`,
    [id]
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

export const updatePasswordHash = (userId, passwordHash) =>
  query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, userId]);

// ─── Forgot / reset password ──────────────────────────────────────────────────
// The raw token is only ever emailed, never stored — only its SHA-256 hash is
// persisted. A high-entropy random value (256 bits) doesn't need a slow hash
// like bcrypt to be safe at rest; SHA-256 also gives an O(1) indexed lookup by
// hash, unlike bcrypt which would require looping candidate rows.
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Issue a new reset token for a user, superseding any earlier unused one.
 * Returns null (no token issued, no email should be sent) if a request was
 * already made very recently — throttles repeat-click / refresh-spam without
 * needing separate rate-limit infrastructure.
 */
export const createPasswordResetToken = async (userId) => {
  const { rows: recent } = await query(
    `SELECT id FROM password_reset_tokens
     WHERE user_id = $1 AND used_at IS NULL AND created_at > NOW() - INTERVAL '2 minutes'`,
    [userId]
  );
  if (recent.length) return null;

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await query(`DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL`, [userId]);
  await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );
  return rawToken;
};

/** Verify + consume a reset token. Returns the user id, or null if invalid/expired/used. */
export const consumePasswordResetToken = async (rawToken) => {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const { rows } = await query(
    `SELECT id, user_id FROM password_reset_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
    [tokenHash]
  );
  if (!rows.length) return null;
  await query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`, [rows[0].id]);
  return rows[0].user_id;
};

// ─── Admin impersonation ──────────────────────────────────────────────────────

/** Short-lived access token carrying the target's identity + who is behind it. */
export const generateImpersonationToken = (targetUser, roles, { impersonatedBy, sessionId }) => {
  const payload = {
    sub: targetUser.id,
    roles,
    scope: 'impersonation',
    impersonated_by: impersonatedBy,
    impersonation_session_id: sessionId,
  };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: IMPERSONATION_TOKEN_TTL });
};

/**
 * Start an impersonation session, enforcing "one at a time" from both
 * directions inside a single transaction (race-safe): an admin can't
 * impersonate two people at once, and a target can't be impersonated by two
 * admins at once. Sessions whose token already expired without an explicit
 * end are lazily closed first so they never block a future start.
 *
 * This call is only reachable with the admin's own, non-impersonation-scoped
 * JWT (see the /users/:id/impersonate route guard), so a still-open session
 * under this same admin_user_id is by definition orphaned — the frontend
 * lost track of it (tab closed, crash, direct navigation away without
 * hitting "Return to Admin") rather than a second concurrent attempt. Close
 * it and proceed instead of blocking the admin out of their own feature.
 */
export const startImpersonationSession = async (adminUserId, targetUserId, ipAddress) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE impersonation_sessions SET ended_at = NOW(), ended_reason = 'expired'
       WHERE ended_at IS NULL AND expires_at <= NOW()`
    );

    await client.query(
      `UPDATE impersonation_sessions SET ended_at = NOW(), ended_reason = 'superseded'
       WHERE admin_user_id = $1 AND ended_at IS NULL`,
      [adminUserId]
    );

    const { rows: targetActive } = await client.query(
      `SELECT id FROM impersonation_sessions WHERE target_user_id = $1 AND ended_at IS NULL`,
      [targetUserId]
    );
    if (targetActive.length) {
      const err = new Error('This user is already being impersonated by another admin.');
      err.code = 'TARGET_ALREADY_IMPERSONATED';
      throw err;
    }

    const expiresAt = new Date(Date.now() + IMPERSONATION_TTL_MS);
    const { rows } = await client.query(
      `INSERT INTO impersonation_sessions (admin_user_id, target_user_id, expires_at, ip_address)
       VALUES ($1, $2, $3, $4) RETURNING id, expires_at`,
      [adminUserId, targetUserId, expiresAt, ipAddress || null]
    );

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

export const endImpersonationSession = async (sessionId, reason = 'manual') => {
  await query(
    `UPDATE impersonation_sessions SET ended_at = NOW(), ended_reason = $2
     WHERE id = $1 AND ended_at IS NULL`,
    [sessionId, reason]
  );
};

/** Re-checked on every authenticated request carrying an impersonation-scoped token. */
export const isImpersonationSessionActive = async (sessionId, adminUserId, targetUserId) => {
  if (!sessionId) return false;
  const { rows } = await query(
    `SELECT id FROM impersonation_sessions
     WHERE id = $1 AND admin_user_id = $2 AND target_user_id = $3
       AND ended_at IS NULL AND expires_at > NOW()`,
    [sessionId, adminUserId, targetUserId]
  );
  return rows.length > 0;
};

// ─── Email OTP login ──────────────────────────────────────────────────────────
// A 6-digit code is low-entropy (1M possibilities) compared to the reset
// token, so brute force is stopped by `attempt_count` — a code is invalidated
// after 5 wrong guesses — rather than by hash cost. bcrypt is used only for
// consistency with the rest of the codebase's password-ish hashing.
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

/**
 * Issue a new login code, superseding any earlier unused one. Returns null
 * (no code issued, caller must not send an email) if one was already
 * requested in the last 60 seconds — throttles rapid "resend" clicks.
 */
export const createLoginOtp = async (userId) => {
  const { rows: recent } = await query(
    `SELECT id FROM login_otps
     WHERE user_id = $1 AND used_at IS NULL AND created_at > NOW() - INTERVAL '60 seconds'`,
    [userId]
  );
  if (recent.length) return null;

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await query(`DELETE FROM login_otps WHERE user_id = $1 AND used_at IS NULL`, [userId]);
  await query(
    `INSERT INTO login_otps (user_id, code_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, codeHash, expiresAt]
  );
  return code;
};

/**
 * Verify a login code against the most recent unused, unexpired one for this
 * user. Returns true (and marks it used) on a match, false on a wrong code
 * (attempt_count is incremented). Throws a typed error when there's nothing
 * valid to check against at all — expired, never requested, or already
 * locked out from too many wrong guesses.
 */
export const verifyLoginOtp = async (userId, code) => {
  const { rows } = await query(
    `SELECT id, code_hash, attempt_count FROM login_otps
     WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  const row = rows[0];
  if (!row) {
    const err = new Error('This code has expired or was never requested. Please request a new one.');
    err.code = 'OTP_NOT_FOUND';
    throw err;
  }
  if (row.attempt_count >= OTP_MAX_ATTEMPTS) {
    await query(`UPDATE login_otps SET used_at = NOW() WHERE id = $1`, [row.id]);
    const err = new Error('Too many incorrect attempts. Please request a new code.');
    err.code = 'OTP_LOCKED';
    throw err;
  }

  const match = await bcrypt.compare(code, row.code_hash);
  if (!match) {
    await query(`UPDATE login_otps SET attempt_count = attempt_count + 1 WHERE id = $1`, [row.id]);
    return false;
  }
  await query(`UPDATE login_otps SET used_at = NOW() WHERE id = $1`, [row.id]);
  return true;
};
