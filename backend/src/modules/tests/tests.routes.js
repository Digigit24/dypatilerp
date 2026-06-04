import { Router } from 'express';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, notFound, badRequest } from '../../utils/response.js';
import { query } from '../../config/database.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';

const router = Router();

const createTestSchema = z.object({
  course_id: z.string().uuid(),
  batch_id: z.string().uuid().optional(),
  title: z.string().min(2).max(255),
  description: z.string().optional(),
  type: z.enum(['entrance','assessment','quiz']).default('entrance'),
  duration_minutes: z.number().int().min(1).default(60),
  total_marks: z.number().int().min(1).default(100),
  passing_marks: z.number().int().optional(),
  instructions: z.string().optional(),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
});

const questionSchema = z.object({
  question_type: z.enum(['mcq','short_answer','long_answer','true_false','file_upload']),
  question_text: z.string().min(1),
  marks: z.number().int().min(1).default(1),
  order_index: z.number().int().default(0),
  is_required: z.boolean().default(true),
  config: z.record(z.any()).default({}),
});

/**
 * @swagger
 * /tests:
 *   get:
 *     tags: [Tests]
 *     summary: List tests (filter by course_id, batch_id, type, status)
 *     responses:
 *       200:
 *         description: Paginated tests
 */
router.get('/', authenticate, requirePermission('tests', 'read'), asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const params = [];
  const conds = [];
  if (req.query.course_id) { params.push(req.query.course_id); conds.push(`t.course_id=$${params.length}`); }
  if (req.query.batch_id) { params.push(req.query.batch_id); conds.push(`t.batch_id=$${params.length}`); }
  if (req.query.status) { params.push(req.query.status); conds.push(`t.status=$${params.length}`); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const { rows: data } = await query(
    `SELECT t.*, c.name as course_name,
            (SELECT COUNT(*) FROM test_questions WHERE test_id=t.id) as question_count
     FROM tests t JOIN courses c ON c.id=t.course_id
     ${where} ORDER BY t.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
    [...params, limit, offset]
  );
  const { rows: [{ total }] } = await query(`SELECT COUNT(*) AS total FROM tests t ${where}`, params);
  res.json({ success: true, data, pagination: buildPaginationMeta(parseInt(total), page, limit) });
}));

/**
 * @swagger
 * /tests/{id}:
 *   get:
 *     tags: [Tests]
 *     summary: Get test by ID (with questions if published)
 *     responses:
 *       200:
 *         description: Test detail
 */
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const { rows: [test] } = await query('SELECT * FROM tests WHERE id=$1', [req.params.id]);
  if (!test) return notFound(res, 'Test not found');
  const { rows: questions } = await query(
    'SELECT * FROM test_questions WHERE test_id=$1 ORDER BY order_index ASC', [test.id]
  );
  ok(res, { ...test, questions });
}));

/**
 * @swagger
 * /tests:
 *   post:
 *     tags: [Tests]
 *     summary: Create a new test
 *     responses:
 *       201:
 *         description: Test created in draft
 */
router.post('/', authenticate, requirePermission('tests', 'create'), validate(createTestSchema), asyncHandler(async (req, res) => {
  const b = req.body;
  const { rows: [test] } = await query(
    `INSERT INTO tests (course_id,batch_id,title,description,type,duration_minutes,total_marks,passing_marks,instructions,start_time,end_time,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [b.course_id, b.batch_id||null, b.title, b.description||null, b.type, b.duration_minutes,
     b.total_marks, b.passing_marks||null, b.instructions||null, b.start_time||null, b.end_time||null, req.user.id]
  );
  created(res, test, 'Test created');
}));

/**
 * @swagger
 * /tests/{id}/publish:
 *   post:
 *     tags: [Tests]
 *     summary: Publish a draft test (makes it available to applicants/students)
 *     responses:
 *       200:
 *         description: Test published
 */
router.post('/:id/publish', authenticate, requirePermission('tests', 'update'), asyncHandler(async (req, res) => {
  const { rows: [test] } = await query(
    `UPDATE tests SET status='published', updated_at=NOW() WHERE id=$1 AND status='draft' RETURNING *`, [req.params.id]
  );
  if (!test) return badRequest(res, 'Test not found or already published');
  ok(res, test, 'Test published');
}));

/**
 * @swagger
 * /tests/{testId}/questions:
 *   post:
 *     tags: [Tests]
 *     summary: Add a question to a test
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Question added
 */
router.post('/:testId/questions', authenticate, requirePermission('tests', 'update'),
  validate(questionSchema), asyncHandler(async (req, res) => {
    const b = req.body;
    const { rows: [q] } = await query(
      `INSERT INTO test_questions (test_id,question_type,question_text,marks,order_index,is_required,config)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.params.testId, b.question_type, b.question_text, b.marks, b.order_index, b.is_required, JSON.stringify(b.config)]
    );
    created(res, q, 'Question added');
  })
);

/**
 * @swagger
 * /tests/{testId}/questions/{questionId}:
 *   delete:
 *     tags: [Tests]
 *     summary: Delete a question from a test
 *     responses:
 *       204:
 *         description: Deleted
 */
router.delete('/:testId/questions/:questionId', authenticate, requirePermission('tests', 'update'),
  asyncHandler(async (req, res) => {
    await query('DELETE FROM test_questions WHERE id=$1 AND test_id=$2', [req.params.questionId, req.params.testId]);
    res.status(204).send();
  })
);

/**
 * @swagger
 * /tests/{id}/start:
 *   post:
 *     tags: [Tests]
 *     summary: Start a test attempt (for applicant/student)
 *     responses:
 *       201:
 *         description: Attempt started
 */
router.post('/:id/start', authenticate, asyncHandler(async (req, res) => {
  const { rows: [test] } = await query('SELECT * FROM tests WHERE id=$1 AND status=$2', [req.params.id, 'published']);
  if (!test) return notFound(res, 'Test not found or not published');
  const { rows: [existing] } = await query(
    'SELECT * FROM test_attempts WHERE test_id=$1 AND user_id=$2', [req.params.id, req.user.id]
  );
  if (existing) return ok(res, existing, 'Existing attempt returned');
  const { rows: [attempt] } = await query(
    `INSERT INTO test_attempts (test_id,user_id) VALUES ($1,$2) RETURNING *`,
    [req.params.id, req.user.id]
  );
  created(res, attempt, 'Attempt started');
}));

/**
 * @swagger
 * /tests/{id}/submit:
 *   post:
 *     tags: [Tests]
 *     summary: Submit a test attempt with responses
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               responses:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     question_id: { type: string, format: uuid }
 *                     response_data: { type: object }
 *     responses:
 *       200:
 *         description: Test submitted
 */
router.post('/:id/submit', authenticate, asyncHandler(async (req, res) => {
  const { rows: [attempt] } = await query(
    `SELECT * FROM test_attempts WHERE test_id=$1 AND user_id=$2 AND status='in_progress'`, [req.params.id, req.user.id]
  );
  if (!attempt) return badRequest(res, 'No active attempt found');
  for (const r of (req.body.responses || [])) {
    await query(
      `INSERT INTO test_responses (attempt_id,question_id,response_data)
       VALUES ($1,$2,$3) ON CONFLICT (attempt_id,question_id) DO UPDATE SET response_data=EXCLUDED.response_data`,
      [attempt.id, r.question_id, JSON.stringify(r.response_data)]
    );
  }
  const timeTaken = Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000);
  await query(
    `UPDATE test_attempts SET status='submitted', submitted_at=NOW(), time_taken_secs=$1 WHERE id=$2`,
    [timeTaken, attempt.id]
  );
  ok(res, { attempt_id: attempt.id, time_taken_secs: timeTaken }, 'Test submitted');
}));

export default router;
