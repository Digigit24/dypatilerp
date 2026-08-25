import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as ctrl from './auth.controller.js';
import {
  loginSchema, registerSchema, refreshTokenSchema,
  forgotPasswordSchema, resetPasswordSchema,
  requestLoginOtpSchema, verifyLoginOtpSchema,
} from './auth.schema.js';

const router = Router();

// A dedicated, tighter limiter for the one new unauthenticated endpoint that
// sends an email per request — the global API limiter (100/15min) is shared
// across everything and isn't tight enough on its own to stop inbox-flood abuse.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many reset requests. Please try again later.' },
});

// Credential-stuffing protection specific to the login endpoint — separate
// from (and tighter than) the general API limiter, which is shared across
// every route and isn't meant to police brute-force login attempts.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

// Same shape as forgotPasswordLimiter — one email per request.
const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many code requests. Please try again later.' },
});

// Defense in depth against guessing a 6-digit code across many requested
// codes — each individual code already locks itself out after 5 wrong
// attempts (see auth.service.js), this just caps the request rate too.
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please request a new code.' },
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *     responses:
 *       200:
 *         description: Login successful, returns tokens and user
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', loginLimiter, validate(loginSchema), ctrl.login);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new applicant account
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, first_name, last_name]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               first_name: { type: string }
 *               last_name: { type: string }
 *               phone: { type: string }
 *     responses:
 *       201:
 *         description: Account created
 *       409:
 *         description: Email already exists
 */
router.post('/register', validate(registerSchema), ctrl.register);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token using refresh token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refresh_token]
 *             properties:
 *               refresh_token: { type: string }
 *     responses:
 *       200:
 *         description: New tokens issued
 */
router.post('/refresh', validate(refreshTokenSchema), ctrl.refresh);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset link by email
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Always returns success — never reveals whether the email is registered
 */
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), ctrl.forgotPassword);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using a token from the forgot-password email
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, new_password]
 *             properties:
 *               token: { type: string }
 *               new_password: { type: string, minLength: 8 }
 *     responses:
 *       200:
 *         description: Password reset — all sessions revoked
 *       400:
 *         description: Token invalid, expired, or already used
 */
router.post('/reset-password', validate(resetPasswordSchema), ctrl.resetPassword);

/**
 * @swagger
 * /auth/end-impersonation:
 *   post:
 *     tags: [Auth]
 *     summary: End the current admin impersonation session and return to the admin's own account
 *     responses:
 *       200:
 *         description: Impersonation ended (idempotent no-op if none was active)
 */
router.post('/end-impersonation', authenticate, ctrl.endImpersonation);

/**
 * @swagger
 * /auth/otp/request:
 *   post:
 *     tags: [Auth]
 *     summary: Request a one-time 6-digit sign-in code by email
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Always returns success — never reveals whether the email is registered
 */
router.post('/otp/request', otpRequestLimiter, validate(requestLoginOtpSchema), ctrl.requestLoginOtp);

/**
 * @swagger
 * /auth/otp/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Verify a one-time code and sign in
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email: { type: string, format: email }
 *               code: { type: string, pattern: '^\\d{6}$' }
 *     responses:
 *       200:
 *         description: Login successful, returns tokens and user
 *       400:
 *         description: Code expired, never requested, or locked out after too many wrong attempts
 *       401:
 *         description: Incorrect code
 */
router.post('/otp/verify', otpVerifyLimiter, validate(verifyLoginOtpSchema), ctrl.verifyOtpAndLogin);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout and revoke refresh tokens
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post('/logout', authenticate, ctrl.logout);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user profile
 *     responses:
 *       200:
 *         description: Current user data with roles
 */
router.get('/me', authenticate, ctrl.me);

export default router;
