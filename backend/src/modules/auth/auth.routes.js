import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as ctrl from './auth.controller.js';
import { loginSchema, registerSchema, refreshTokenSchema } from './auth.schema.js';

const router = Router();

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
router.post('/login', validate(loginSchema), ctrl.login);

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
