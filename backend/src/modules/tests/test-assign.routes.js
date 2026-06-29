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
import { sendTestCredentials, sendTestReminder } from '../email/email.service.js';

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

    // Is this applicant ALREADY assigned to THIS test? If so we keep their
    // existing link + password (idempotent re-assign) and never rotate
    // silently — re-running "assign all" must not break already-sent links.
    const { rows: [existingToken] } = await query(
      'SELECT * FROM test_access_tokens WHERE test_id = $1 AND applicant_id = $2',
      [testId, applicantId]
    );

    let userId = applicant.user_id;
    let plainPassword = null;

    // ── Ensure a user account exists (identity only) ──
    // NOTE: we never rotate an existing account's global password here. The
    // test credential lives on the access-token row (password_hash) so that
    // assigning/re-assigning one test can never invalidate another test's
    // credentials or the student's portal password.
    if (!userId) {
      const { rows: [existingUser] } = await query(
        'SELECT id FROM users WHERE email = $1', [applicant.email]
      );

      if (existingUser) {
        userId = existingUser.id;
        // Link the existing account back to this applicant record.
        await query('UPDATE applicants SET user_id = $1 WHERE id = $2', [userId, applicantId]);
      } else {
        // Brand-new account — seed it with the test password so portal login
        // is also possible. (Re-used below as the per-test credential.)
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
    }

    // ── Decide this test's credential ──
    // Already assigned → reuse existing token + password_hash (no rotation,
    //   no email; admins should use /remind to nudge with the existing link).
    // First assignment → issue a fresh per-test password stored on the token.
    let token;
    let passwordHash;
    if (existingToken) {
      token        = existingToken.token;
      passwordHash = existingToken.password_hash;
      // plainPassword stays null → credentials email is not re-sent.
    } else {
      if (!plainPassword) plainPassword = genPassword();
      passwordHash = await bcrypt.hash(plainPassword, 10);
      token        = genToken();
    }

    const username = applicant.email;
    const { rows: [accessToken] } = await query(
      `INSERT INTO test_access_tokens (test_id, applicant_id, token, username, user_id, password_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (test_id, applicant_id)
       DO UPDATE SET token = EXCLUDED.token, username = EXCLUDED.username,
                     user_id = EXCLUDED.user_id, password_hash = EXCLUDED.password_hash,
                     expires_at = EXCLUDED.expires_at
       RETURNING *`,
      [
        testId,
        applicantId,
        token,
        username,
        userId,
        passwordHash,
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

  // Rotate THIS test's credential only — the per-test password_hash lives on
  // the access-token row, so this never touches the global account password
  // or any other test the applicant may have been assigned.
  await query(
    `UPDATE test_access_tokens
     SET token=$1, password_hash=$2, used_at=NULL, created_at=NOW(), expires_at=$5
     WHERE test_id=$3 AND applicant_id=$4`,
    [newToken, hash, testId, applicant_id, tokenExpiry()]
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
 * POST /tests/:id/assign/remind
 * Send a "you haven't started/finished your test" reminder. Re-uses each
 * applicant's EXISTING token & link (no credential rotation), so the password
 * from their original invite still works.
 *
 * Body:
 *   { applicant_ids: [...] }   → remind these applicants
 *   { remind_all: true }       → remind everyone with a link who hasn't submitted
 */
router.post('/remind', authenticate, requirePermission('tests', 'update'), asyncHandler(async (req, res) => {
  const testId = req.params.id;
  const { rows: [test] } = await query('SELECT * FROM tests WHERE id=$1', [testId]);
  if (!test) return notFound(res, 'Test not found');

  let ids = Array.isArray(req.body.applicant_ids) ? req.body.applicant_ids : [];
  if (req.body.remind_all) {
    const { rows } = await query(
      `SELECT tat.applicant_id
       FROM test_access_tokens tat
       LEFT JOIN test_attempts ta ON ta.test_id = tat.test_id AND ta.user_id = tat.user_id
       WHERE tat.test_id = $1 AND (ta.status IS NULL OR ta.status <> 'submitted')`,
      [testId]
    );
    ids = rows.map((r) => r.applicant_id);
  }
  if (!ids.length) return badRequest(res, 'No applicants to remind.');

  let reminded = 0;
  const errors = [];
  for (const applicantId of ids) {
    const { rows: [tok] } = await query(
      'SELECT * FROM test_access_tokens WHERE test_id=$1 AND applicant_id=$2', [testId, applicantId]
    );
    if (!tok) { errors.push({ applicant_id: applicantId, error: 'No test link found' }); continue; }
    const { rows: [applicant] } = await query('SELECT * FROM applicants WHERE id=$1', [applicantId]);
    if (!applicant) { errors.push({ applicant_id: applicantId, error: 'Applicant not found' }); continue; }

    const loginUrl = `${env.FRONTEND_URL}/test-login?token=${tok.token}`;
    const r = await sendTestReminder({ applicant, test, loginUrl, courseId: test.course_id });
    if (r.success) {
      reminded++;
      await query(
        `UPDATE applicants
           SET application_data = jsonb_set(COALESCE(application_data, '{}'::jsonb), '{last_reminded_at}', to_jsonb($2::text), true),
               updated_at = NOW()
         WHERE id = $1`,
        [applicantId, new Date().toISOString()]
      );
    } else {
      errors.push({ applicant_id: applicantId, email: applicant.email, error: r.error });
    }
  }

  ok(res, { reminded, total: ids.length, errors }, `Reminder sent to ${reminded} applicant(s)`);
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
