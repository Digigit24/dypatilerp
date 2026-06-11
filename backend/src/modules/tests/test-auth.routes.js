/**
 * Test Auth — isolated login for applicants taking a test.
 * POST /api/test-auth/login
 *
 * Applicants receive { token, username, password } via email.
 * This endpoint returns a short-lived JWT scoped to the test only.
 * It does NOT grant dashboard access.
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, unauthorized, badRequest, notFound } from '../../utils/response.js';
import { query } from '../../config/database.js';
import { env } from '../../config/env.js';

const router = Router();

router.post('/login', asyncHandler(async (req, res) => {
  const { token, username, password } = req.body;
  if (!token || !username || !password) return badRequest(res, 'token, username and password are required');

  // Look up the access token
  const { rows: [accessToken] } = await query(
    `SELECT tat.*, t.duration_minutes, t.title AS test_title, t.status AS test_status,
            a.first_name, a.last_name, a.email AS applicant_email
     FROM test_access_tokens tat
     JOIN tests t ON t.id = tat.test_id
     JOIN applicants a ON a.id = tat.applicant_id
     WHERE tat.token = $1`,
    [token]
  );

  if (!accessToken) return notFound(res, 'Invalid test link. Please check your email.');
  if (accessToken.test_status !== 'published') return badRequest(res, 'This test is not currently available.');
  if (accessToken.expires_at && new Date(accessToken.expires_at) < new Date()) {
    return unauthorized(res, 'This test link has expired. Contact your administrator.');
  }

  // Validate username (case-insensitive)
  if (username.toLowerCase() !== accessToken.username.toLowerCase()) {
    return unauthorized(res, 'Invalid username or password.');
  }

  // Validate password against the applicant's user account
  const { rows: [user] } = await query(
    'SELECT id, email, password_hash, first_name, last_name, is_active FROM users WHERE id = $1',
    [accessToken.user_id]
  );
  if (!user || !user.is_active) return unauthorized(res, 'Account not found or inactive.');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return unauthorized(res, 'Invalid username or password.');

  // Check if already submitted
  const { rows: [existingAttempt] } = await query(
    `SELECT status FROM test_attempts WHERE test_id = $1 AND user_id = $2`,
    [accessToken.test_id, user.id]
  );
  if (existingAttempt?.status === 'submitted') {
    return badRequest(res, 'You have already submitted this test.');
  }

  // Mark token used_at (first login only)
  if (!accessToken.used_at) {
    await query('UPDATE test_access_tokens SET used_at = NOW() WHERE id = $1', [accessToken.id]);
  }

  // Issue a test-scoped JWT (short expiry = duration + 30 min buffer)
  const expiresInSeconds = (accessToken.duration_minutes + 30) * 60;
  const testJwt = jwt.sign(
    {
      sub: user.id,
      roles: ['applicant'],
      test_id: accessToken.test_id,
      token_id: accessToken.id,
      applicant_id: accessToken.applicant_id,
      scope: 'test_only',
    },
    env.JWT_SECRET,
    { expiresIn: expiresInSeconds }
  );

  ok(res, {
    access_token: testJwt,
    test_id: accessToken.test_id,
    user: {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
    },
    attempt_status: existingAttempt?.status || null,
  });
}));

export default router;
