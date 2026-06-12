import { Router } from 'express';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { requirePermission, isOwnScope } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, notFound } from '../../utils/response.js';
import { query } from '../../config/database.js';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';

/**
 * Ownership guard: students (own scope) can only touch their own profile.
 * Staff with broader grants (course/all) can manage any profile.
 */
const assertOwnerOrBroaderScope = (req, res, targetUserId) => {
  if (isOwnScope(req) && req.user.id !== targetUserId) {
    res.status(403).json({
      success: false,
      code: 'PERMISSION_DENIED',
      message: 'You can only manage your own research profile.',
    });
    return false;
  }
  return true;
};

const router = Router();

const profileSchema = z.object({
  bio: z.string().optional(),
  research_interests: z.array(z.string()).optional().default([]),
  phd_details: z.record(z.any()).optional().default({}),
  current_institution: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  linkedin_url: z.string().url().optional().or(z.literal('')),
  orcid: z.string().optional(),
  google_scholar_url: z.string().url().optional().or(z.literal('')),
  is_public: z.boolean().optional(),
  slug: z.string().optional(),
});

const publicationSchema = z.object({
  title: z.string().min(1).max(500),
  authors: z.array(z.string()).default([]),
  journal: z.string().optional(),
  year: z.number().int().optional(),
  doi: z.string().optional(),
  url: z.string().url().optional().or(z.literal('')),
  publication_type: z.enum(['journal','conference','book_chapter','patent','other']).default('journal'),
});

/**
 * @swagger
 * /research-profiles/{userId}:
 *   get:
 *     tags: [Research Profiles]
 *     summary: Get research profile for a user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Research profile with publications
 */
router.get('/:userId', optionalAuth, asyncHandler(async (req, res) => {
  const { rows: [profile] } = await query('SELECT * FROM research_profiles WHERE user_id=$1', [req.params.userId]);
  if (!profile) return notFound(res, 'Profile not found');
  // Allow owner to see their own private profile; others only see public profiles
  const isOwner = req.user?.id === req.params.userId;
  const isStaff = req.user?.roles?.some((r) => !['student', 'applicant'].includes(r));
  if (!profile.is_public && !isOwner && !isStaff) {
    return notFound(res, 'Profile not found');
  }
  const { rows: publications } = await query(
    'SELECT * FROM publications WHERE user_id=$1 ORDER BY year DESC, created_at DESC', [req.params.userId]
  );
  ok(res, { ...profile, publications });
}));

/**
 * @swagger
 * /research-profiles/public/{slug}:
 *   get:
 *     tags: [Research Profiles]
 *     summary: Get public profile by slug
 *     security: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Public research profile
 */
router.get('/public/:slug', asyncHandler(async (req, res) => {
  const { rows: [profile] } = await query(
    'SELECT * FROM research_profiles WHERE slug=$1 AND is_public=true', [req.params.slug]
  );
  if (!profile) return notFound(res, 'Profile not found');
  const { rows: publications } = await query(
    'SELECT * FROM publications WHERE user_id=$1 ORDER BY year DESC', [profile.user_id]
  );
  ok(res, { ...profile, publications });
}));

/**
 * @swagger
 * /research-profiles/{userId}:
 *   put:
 *     tags: [Research Profiles]
 *     summary: Upsert research profile for a user
 *     responses:
 *       200:
 *         description: Profile saved
 */
router.put('/:userId', authenticate, requirePermission('research_profiles', 'update'), validate(profileSchema), asyncHandler(async (req, res) => {
  const uid = req.params.userId;
  if (!assertOwnerOrBroaderScope(req, res, uid)) return;
  const b = req.body;
  const { rows: [profile] } = await query(
    `INSERT INTO research_profiles (user_id,bio,research_interests,phd_details,current_institution,department,designation,linkedin_url,orcid,google_scholar_url,is_public,slug)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (user_id) DO UPDATE SET
       bio=EXCLUDED.bio, research_interests=EXCLUDED.research_interests, phd_details=EXCLUDED.phd_details,
       current_institution=EXCLUDED.current_institution, department=EXCLUDED.department, designation=EXCLUDED.designation,
       linkedin_url=EXCLUDED.linkedin_url, orcid=EXCLUDED.orcid, google_scholar_url=EXCLUDED.google_scholar_url,
       is_public=EXCLUDED.is_public, slug=EXCLUDED.slug, updated_at=NOW()
     RETURNING *`,
    [uid, b.bio||null, JSON.stringify(b.research_interests||[]), JSON.stringify(b.phd_details||{}),
     b.current_institution||null, b.department||null, b.designation||null,
     b.linkedin_url||null, b.orcid||null, b.google_scholar_url||null, b.is_public||false, b.slug||null]
  );
  ok(res, profile, 'Profile saved');
}));

/**
 * @swagger
 * /research-profiles/{userId}/publications:
 *   post:
 *     tags: [Research Profiles]
 *     summary: Add a publication to a user's profile
 *     responses:
 *       201:
 *         description: Publication added
 */
router.post('/:userId/publications', authenticate, requirePermission('research_profiles', 'update'), validate(publicationSchema), asyncHandler(async (req, res) => {
  if (!assertOwnerOrBroaderScope(req, res, req.params.userId)) return;
  const b = req.body;
  const { rows: [pub] } = await query(
    `INSERT INTO publications (user_id,title,authors,journal,year,doi,url,publication_type)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.params.userId, b.title, JSON.stringify(b.authors), b.journal||null, b.year||null, b.doi||null, b.url||null, b.publication_type]
  );
  res.status(201).json({ success: true, message: 'Publication added', data: pub });
}));

/**
 * @swagger
 * /research-profiles/{userId}/publications/{pubId}:
 *   delete:
 *     tags: [Research Profiles]
 *     summary: Delete a publication
 *     responses:
 *       204:
 *         description: Deleted
 */
router.delete('/:userId/publications/:pubId', authenticate, requirePermission('research_profiles', 'update'), asyncHandler(async (req, res) => {
  if (!assertOwnerOrBroaderScope(req, res, req.params.userId)) return;
  await query('DELETE FROM publications WHERE id=$1 AND user_id=$2', [req.params.pubId, req.params.userId]);
  res.status(204).send();
}));

export default router;
