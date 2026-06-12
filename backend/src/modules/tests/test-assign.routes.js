/**
 * Test Assign — create per-applicant access tokens + user accounts
 * POST /api/tests/:id/assign
 */
import { Router } from 'express';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, badRequest, notFound } from '../../utils/response.js';
import { query } from '../../config/database.js';
import { env } from '../../config/env.js';
import { sendTestCredentials } from '../email/email.service.js';

const router = Router({ mergeParams: true });

/** Generate a random 8-char alphanumeric password */
const genPassword = () => randomBytes(5).toString('base64url').slice(0, 8);

/** Generate a 64-char hex token */
const genToken = () => randomBytes(32).toString('hex');

/** Test links are valid for 5 days from issue/reset */
const TOKEN_VALIDITY_DAYS = 5;
const tokenExpiry = () => new Date(Date.now() + TOKEN_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

/**
 * POST /tests/:id/assign
 * Body: { applicant_ids: [...] }  OR  { assign_all: true, course_id: "..." }
 *
 * For each applicant:
 *  1. Create a user account if they don't have one
 *  2. Create a test_access_token
 *  3. Set applicant status = test_pending (if submitted)
 * Returns credentials list for admin to review / send emails
 */
router.post('/', authenticate, requirePermission('tests', 'update'), asyncHandler(async (req, res) => {
  const testId = req.params.id;

  // Verify test exists and is published
  const { rows: [test] } = await query('SELECT * FROM tests WHERE id = $1', [testId]);
  if (!test) return notFound(res, 'Test not found');
  if (test.status === 'draft') return badRequest(res, 'Publish the test before assigning it to applicants.');

  const sendEmails = req.body.send_email !== false; // default true

  // Resolve applicant list — by IDs, by course, or by batch
  let applicantIds = req.body.applicant_ids || [];
  if (req.body.assign_all) {
    if (req.body.course_id) {
      const { rows } = await query(
        `SELECT id FROM applicants WHERE course_id = $1 AND status IN ('shortlisted_test','test_pending')`,
        [req.body.course_id]
      );
      applicantIds = rows.map((r) => r.id);
    } else if (req.body.batch_id) {
      const { rows } = await query(
        `SELECT a.id FROM applicants a
         JOIN batch_students bs ON bs.student_id = a.user_id
         WHERE bs.batch_id = $1 AND a.status IN ('shortlisted_test','test_pending')`,
        [req.body.batch_id]
      );
      applicantIds = rows.map((r) => r.id);
    }
  }

  if (!applicantIds.length) return badRequest(res, 'No applicants found for the given criteria.');

  // Load sections for email
  const { rows: sections } = await query(
    'SELECT title FROM test_sections WHERE test_id=$1 ORDER BY order_index', [testId]
  );

  const results = [];

  for (const applicantId of applicantIds) {
    const { rows: [applicant] } = await query('SELECT * FROM applicants WHERE id = $1', [applicantId]);
    if (!applicant) continue;

    let userId = applicant.user_id;
    let plainPassword = null;

    // ── Create user account if not existing ──
    if (!userId) {
      const { rows: [existingUser] } = await query(
        'SELECT id FROM users WHERE email = $1', [applicant.email]
      );

      if (existingUser) {
        userId = existingUser.id;
      } else {
        plainPassword = genPassword();
        const hash = await bcrypt.hash(plainPassword, 10);
        const { rows: [newUser] } = await query(
          `INSERT INTO users (email, password_hash, first_name, last_name, phone)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [applicant.email, hash, applicant.first_name, applicant.last_name, applicant.phone || null]
        );
        userId = newUser.id;

        // Assign applicant role
        const { rows: roleRows } = await query('SELECT id FROM roles WHERE name = $1', ['applicant']);
        if (roleRows.length) {
          await query(
            'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [userId, roleRows[0].id]
          );
        }

        // Link user back to applicant record
        await query('UPDATE applicants SET user_id = $1 WHERE id = $2', [userId, applicantId]);
      }
    } else {
      // User exists — generate a new password so they have fresh credentials
      plainPassword = genPassword();
      const hash = await bcrypt.hash(plainPassword, 10);
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);
    }

    // ── Create or replace access token ──
    const token = genToken();
    const username = applicant.email;
    const { rows: [accessToken] } = await query(
      `INSERT INTO test_access_tokens (test_id, applicant_id, token, username, user_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (test_id, applicant_id)
       DO UPDATE SET token = EXCLUDED.token, username = EXCLUDED.username,
                     user_id = EXCLUDED.user_id, expires_at = EXCLUDED.expires_at,
                     used_at = NULL, created_at = NOW()
       RETURNING *`,
      [
        testId,
        applicantId,
        token,
        username,
        userId,
        tokenExpiry(),
      ]
    );

    // ── Update applicant status to test_pending ──
    if (applicant.status === 'submitted' || applicant.status === 'shortlisted_test') {
      await query(`UPDATE applicants SET status = 'test_pending' WHERE id = $1`, [applicantId]);
    }

    const loginUrl = `${env.FRONTEND_URL}/test-login?token=${token}`;

    const credential = {
      applicant_id:   applicantId,
      name:           `${applicant.first_name} ${applicant.last_name}`,
      email:          applicant.email,
      username,
      password:       plainPassword,
      token,
      login_url:      loginUrl,
      email_sent:     false,
    };

    // ── Send credentials email ──
    if (sendEmails && plainPassword) {
      const emailResult = await sendTestCredentials({
        applicant,
        test,
        sections,
        username,
        password: plainPassword,
        loginUrl,
        courseId: test.course_id,
      });
      credential.email_sent = emailResult.success;
      if (!emailResult.success) {
        console.error(`[assign] Email failed for ${applicant.email}:`, emailResult.error);
      }
    }

    results.push(credential);
  }

  ok(res, {
    assigned_count: results.length,
    emails_sent:    results.filter((r) => r.email_sent).length,
    credentials:    results,
  }, `Test assigned to ${results.length} applicant(s)`);
}));

/**
 * POST /tests/:id/assign/reset
 * Reset a single applicant's attempt: delete old attempt, rotate token + password, resend email.
 * Works for testing re-runs AND real second-attempt scenarios.
 */
router.post('/reset', authenticate, requirePermission('tests', 'update'), asyncHandler(async (req, res) => {
  const testId = req.params.id;
  const { applicant_id, send_email = true } = req.body;
  if (!applicant_id) return badRequest(res, 'applicant_id is required');

  // Verify test
  const { rows: [test] } = await query('SELECT * FROM tests WHERE id=$1', [testId]);
  if (!test) return notFound(res, 'Test not found');

  // Get existing access token for this applicant
  const { rows: [accessToken] } = await query(
    'SELECT * FROM test_access_tokens WHERE test_id=$1 AND applicant_id=$2',
    [testId, applicant_id]
  );
  if (!accessToken) return notFound(res, 'This applicant has not been assigned this test yet.');

  // ── Delete existing attempt(s) ──
  await query('DELETE FROM test_attempts WHERE test_id=$1 AND user_id=$2', [testId, accessToken.user_id]);

  // ── Rotate credentials ──
  const newToken    = genToken();
  const newPassword = genPassword();
  const hash        = await bcrypt.hash(newPassword, 10);

  // Update user password so old password no longer works
  await query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, accessToken.user_id]);

  // Refresh access token (reset used_at so fresh login is required)
  await query(
    `UPDATE test_access_tokens
     SET token=$1, used_at=NULL, created_at=NOW(), expires_at=$4
     WHERE test_id=$2 AND applicant_id=$3`,
    [newToken, testId, applicant_id, tokenExpiry()]
  );

  // ── Reset applicant status → test_pending ──
  await query(
    `UPDATE applicants SET status='test_pending'
     WHERE id=$1 AND status IN ('test_completed', 'submitted', 'test_pending')`,
    [applicant_id]
  );

  // ── Fetch applicant + sections for email ──
  const { rows: [applicant] } = await query('SELECT * FROM applicants WHERE id=$1', [applicant_id]);
  const { rows: sections }    = await query(
    'SELECT title FROM test_sections WHERE test_id=$1 ORDER BY order_index', [testId]
  );

  const loginUrl = `${env.FRONTEND_URL}/test-login?token=${newToken}`;
  let email_sent = false;

  if (send_email) {
    const result = await sendTestCredentials({
      applicant,
      test,
      sections,
      username: accessToken.username,
      password: newPassword,
      loginUrl,
      courseId: test.course_id,
    });
    email_sent = result.success;
    if (!result.success) console.error(`[reset] Email failed for ${applicant.email}:`, result.error);
  }

  ok(res, {
    applicant_id,
    name:      `${applicant.first_name} ${applicant.last_name}`,
    email:     applicant.email,
    username:  accessToken.username,
    password:  newPassword,
    login_url: loginUrl,
    email_sent,
  }, 'Test attempt reset — new credentials issued');
}));

/**
 * GET /tests/:id/access-tokens
 * List all access tokens for this test (admin view)
 */
router.get('/access-tokens', authenticate, requirePermission('tests', 'read'), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT tat.*, a.first_name, a.last_name, a.email,
            ta.status AS attempt_status, ta.score, ta.submitted_at
     FROM test_access_tokens tat
     JOIN applicants a ON a.id = tat.applicant_id
     LEFT JOIN test_attempts ta ON ta.test_id = tat.test_id AND ta.user_id = tat.user_id
     WHERE tat.test_id = $1
     ORDER BY tat.created_at DESC`,
    [req.params.id]
  );
  ok(res, rows);
}));

export default router;
