import { Router } from 'express';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { requirePermission, requireRole } from '../../middleware/rbac.js';
import * as ctrl from './videos.controller.js';

const router = Router();

// Roles that can manage media (create folders, upload, edit metadata)
const MEDIA_MANAGERS = ['admin', 'coordinator', 'academic_guide', 'industry_mentor'];

/**
 * @swagger
 * /videos:
 *   get:
 *     tags: [Videos]
 *     summary: List videos (filtered by course/batch, visibility, published status)
 */
router.get('/', authenticate, requirePermission('dashboard', 'read'), ctrl.list);

/**
 * @swagger
 * /videos/folders:
 *   get:
 *     tags: [Videos]
 *     summary: List media folders (filter by course_id, parent_id)
 *   post:
 *     tags: [Videos]
 *     summary: Create a media folder
 */
router.get('/folders', authenticate, requirePermission('dashboard', 'read'), ctrl.listFolders);
router.post('/folders', authenticate, requireRole(...MEDIA_MANAGERS), ctrl.createFolder);

/**
 * @swagger
 * /videos/folders/{id}:
 *   put:
 *     tags: [Videos]
 *     summary: Rename / move a media folder
 *   delete:
 *     tags: [Videos]
 *     summary: Delete a folder (contents move up to its parent)
 */
router.get('/folders/:id/path', authenticate, requirePermission('dashboard', 'read'), ctrl.getFolderPath);
// Bulk content download is a bigger exposure than viewing one item at a time
// (and getFolderById/listFolderFiles don't filter by course), so this uses
// the same trusted-role gate as folder management, not the broad read-only
// dashboard:read permission every staff role tends to carry.
router.get('/folders/:id/download-zip', authenticate, requireRole(...MEDIA_MANAGERS), ctrl.downloadFolderZip);
router.put('/folders/:id', authenticate, requireRole(...MEDIA_MANAGERS), ctrl.updateFolder);
router.delete('/folders/:id', authenticate, requireRole('admin', 'coordinator'), ctrl.removeFolder);

/**
 * @swagger
 * /videos/upload/request-url:
 *   post:
 *     tags: [Videos]
 *     summary: Get a presigned upload URL for direct-to-Zata upload (staff only)
 */
router.post('/upload/request-url', authenticate, requireRole(...MEDIA_MANAGERS), ctrl.requestUploadUrl);

/**
 * @swagger
 * /videos/upload:
 *   post:
 *     tags: [Videos]
 *     summary: Proxy upload — browser posts file here, backend streams to Zata (staff only)
 */
router.post('/upload', authenticate, requireRole(...MEDIA_MANAGERS), ctrl.proxyUpload);

/**
 * @swagger
 * /videos/courses/{courseId}/init-folder:
 *   post:
 *     tags: [Videos]
 *     summary: Create the course folder in the Zata bucket
 */
router.post('/courses/:courseId/init-folder', authenticate, requireRole('admin', 'coordinator'), ctrl.initCourseFolder);

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
 *     summary: Register a new video (staff after uploading to Zata)
 */
router.post('/', authenticate, requireRole(...MEDIA_MANAGERS), ctrl.create);

/**
 * @swagger
 * /videos/{id}:
 *   put:
 *     tags: [Videos]
 *     summary: Update video metadata (title, description, visibility, publish status)
 */
router.put('/:id', authenticate, requireRole(...MEDIA_MANAGERS), ctrl.update);

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
 */
router.post('/:id/session', authenticate, ctrl.createSession);

/**
 * @swagger
 * /videos/{id}/stream:
 *   get:
 *     tags: [Videos]
 *     summary: Secure streaming proxy
 */
router.get('/:id/stream', ctrl.streamVideo); // validated via sessionToken query param

/**
 * @swagger
 * /videos/{id}/download:
 *   get:
 *     tags: [Videos]
 *     summary: Download any media file (validated via sessionToken)
 */
router.get('/:id/download', ctrl.downloadMedia); // validated via sessionToken query param

/**
 * Inline preview — same bytes as /stream but Content-Disposition: inline, so a
 * reviewer reads the document in the browser instead of downloading it.
 * Validated via sessionToken exactly like streaming.
 */
router.get('/:id/preview', ctrl.previewMedia);

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
 * /videos/{id}/thumbnail:
 *   get:
 *     tags: [Videos]
 *     summary: Serve a JPEG thumbnail (auto-generated via ffmpeg or SVG placeholder)
 */
router.get('/:id/thumbnail', ctrl.getThumbnail); // public — no auth needed for poster images

export default router;
