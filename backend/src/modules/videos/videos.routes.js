import { Router } from 'express';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { requirePermission, requireRole } from '../../middleware/rbac.js';
import * as ctrl from './videos.controller.js';

const router = Router();

/**
 * @swagger
 * /videos:
 *   get:
 *     tags: [Videos]
 *     summary: List videos (filtered by course/batch, published status)
 */
router.get('/', authenticate, requirePermission('dashboard', 'read'), ctrl.list);

/**
 * @swagger
 * /videos/{id}:
 *   get:
 *     tags: [Videos]
 *     summary: Get video metadata by ID
 */
router.get('/:id', authenticate, requirePermission('dashboard', 'read'), ctrl.getOne);

/**
 * @swagger
 * /videos:
 *   post:
 *     tags: [Videos]
 *     summary: Register a new video (admin/coordinator after uploading to Zata)
 */
router.post('/', authenticate, requireRole('admin', 'coordinator'), ctrl.create);

/**
 * @swagger
 * /videos/{id}:
 *   put:
 *     tags: [Videos]
 *     summary: Update video metadata (title, description, publish status)
 */
router.put('/:id', authenticate, requireRole('admin', 'coordinator'), ctrl.update);

/**
 * @swagger
 * /videos/{id}:
 *   delete:
 *     tags: [Videos]
 *     summary: Delete video and remove from Zata bucket
 */
router.delete('/:id', authenticate, requireRole('admin', 'coordinator'), ctrl.remove);

/**
 * @swagger
 * /videos/{id}/session:
 *   post:
 *     tags: [Videos]
 *     summary: Create a streaming session token for a video
 *     description: Must be called before /stream. Returns a short-lived token.
 */
router.post('/:id/session', authenticate, ctrl.createSession);

/**
 * @swagger
 * /videos/{id}/stream:
 *   get:
 *     tags: [Videos]
 *     summary: Secure streaming proxy — pipes Zata bytes through the server
 *     parameters:
 *       - in: query
 *         name: sessionToken
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: Range
 *         schema: { type: string }
 *         example: "bytes=0-1048576"
 *     responses:
 *       206: { description: Partial content — video chunk }
 *       401: { description: Invalid/expired session }
 *       503: { description: Zata not configured }
 */
router.get('/:id/stream', ctrl.streamVideo); // No JWT middleware — validated via sessionToken query param

/**
 * @swagger
 * /videos/{id}/progress:
 *   post:
 *     tags: [Videos]
 *     summary: Heartbeat — report watched position and interval
 *   get:
 *     tags: [Videos]
 *     summary: Get current user's watch progress for a video
 */
router.post('/:id/progress', authenticate, ctrl.reportProgress);
router.get('/:id/progress', authenticate, ctrl.getProgress);

/**
 * @swagger
 * /videos/{id}/analytics:
 *   get:
 *     tags: [Videos]
 *     summary: Get watch analytics for a video (admin/coordinator only)
 */
router.get('/:id/analytics', authenticate, requireRole('admin', 'coordinator'), ctrl.getAnalytics);

/**
 * @swagger
 * /videos/upload/request-url:
 *   post:
 *     tags: [Videos]
 *     summary: Get a presigned upload URL for direct-to-Zata upload
 */
router.post('/upload/request-url', authenticate, requireRole('admin', 'coordinator'), ctrl.requestUploadUrl);

/**
 * @swagger
 * /videos/courses/{courseId}/init-folder:
 *   post:
 *     tags: [Videos]
 *     summary: Create the course folder in the Zata bucket
 */
router.post('/courses/:courseId/init-folder', authenticate, requireRole('admin', 'coordinator'), ctrl.initCourseFolder);

export default router;
