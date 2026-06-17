import { Router } from 'express';
import { notifyTestCompleted } from '../notifications/notify.service.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, notFound, badRequest } from '../../utils/response.js';
import { query } from '../../config/database.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';

// Mount sub-routers
import sectionRoutes from './test-sections.routes.js';
import assignRoutes  from './test-assign.routes.js';

const router = Router();

// ── Random sampling helper ─────────────────────────────────────────────────────
// Builds a per-candidate question id set: each section's bank is shuffled and
// truncated to pick_count (or kept whole). Section order is preserved.
const buildQuestionSet = async (testId) => {
  const { rows: sections } = await query(
    'SELECT id, pick_count FROM test_sections WHERE test_id=$1 ORDER BY order_index ASC', [testId]
  );
  const { rows: bank } = await query(
    'SELECT id, section_id FROM test_questions WHERE test_id=$1 ORDER BY order_index ASC', [testId]
  );
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const set = [];
  for (const sec of sections) {
    const sectionBank = bank.filter((q) => q.section_id === sec.id);
    const shuffled = shuffle(sectionBank);
    const picked = sec.pick_count && sec.pick_count > 0 ? shuffled.slice(0, sec.pick_count) : shuffled;
    set.push(...picked.map((q) => q.id));
  }
  set.push(...bank.filter((q) => !q.section_id).map((q) => q.id));
  return set;
};

// ── Sub-routers ────────────────────────────────────────────────────────────────
router.use('/:testId/sections', sectionRoutes);
router.use('/:id/assign',       assignRoutes);

// ── Schemas ────────────────────────────────────────────────────────────────────
const createTestSchema = z.object({
  course_id:        z.string().uuid().optional().nullable(),
  batch_id:         z.string().uuid().optional(),
  title:            z.string().min(2).max(255),
  description:      z.string().optional(),
  type:             z.enum(['entrance','assessment','quiz']).default('entrance'),
  duration_minutes: z.number().int().min(1).default(90),
  total_marks:      z.number().int().min(1).default(100),
  passing_marks:    z.number().int().optional(),
  instructions:     z.string().optional(),
  start_time:       z.string().datetime().optional(),
  end_time:         z.string().datetime().optional(),
});

const questionSchema = z.object({
  question_type: z.enum(['mcq','short_answer','long_answer','true_false','file_upload']),
  question_text: z.string().min(1),
  section_id:    z.string().uuid().optional().nullable(),
  marks:         z.number().int().min(1).default(1),
  order_index:   z.number().int().default(0),
  is_required:   z.boolean().default(true),
  config:        z.record(z.any()).default({}),
});

// ── List tests ─────────────────────────────────────────────────────────────────
router.get('/', authenticate, requirePermission('tests', 'read'), asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const params = [];
  const conds = [];
  // X-Course-Id header takes precedence over query param
  const courseId = req.courseId || req.query.course_id;
  if (courseId)            { params.push(courseId);            conds.push(`t.course_id=$${params.length}`); }
  if (req.query.batch_id)  { params.push(req.query.batch_id);  conds.push(`t.batch_id=$${params.length}`);  }
  if (req.query.status)    { params.push(req.query.status);    conds.push(`t.status=$${params.length}`);    }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const { rows: data } = await query(
    `SELECT t.*, c.name AS course_name,
            (SELECT COUNT(*) FROM test_questions WHERE test_id=t.id)::int   AS question_count,
            (SELECT COUNT(*) FROM test_sections  WHERE test_id=t.id)::int   AS section_count,
            (SELECT COUNT(*) FROM test_access_tokens WHERE test_id=t.id)::int AS assigned_count
     FROM tests t LEFT JOIN courses c ON c.id=t.course_id
     ${where} ORDER BY t.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
    [...params, limit, offset]
  );
  const { rows: [{ total }] } = await query(`SELECT COUNT(*) AS total FROM tests t ${where}`, params);
  res.json({ success: true, data, pagination: buildPaginationMeta(parseInt(total), page, limit) });
}));

// ── Get test by ID (with sections + questions) ─────────────────────────────────
// Admins receive the full question bank. Candidates (test-scoped JWT) receive
// ONLY their frozen random question set, with correct answers stripped.
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const { rows: [test] } = await query('SELECT * FROM tests WHERE id=$1', [req.params.id]);
  if (!test) return notFound(res, 'Test not found');

  const { rows: sections } = await query(
    'SELECT * FROM test_sections WHERE test_id=$1 ORDER BY order_index ASC', [test.id]
  );
  const { rows: questions } = await query(
    `SELECT * FROM test_questions WHERE test_id=$1 ORDER BY order_index ASC`,
    [test.id]
  );

  const bankCount = (s) => questions.filter((q) => q.section_id === s.id).length;
  const effectiveCount = (s) => {
    const bank = bankCount(s);
    return s.pick_count && s.pick_count > 0 ? Math.min(s.pick_count, bank) : bank;
  };

  // The take-test endpoint NEVER returns answer keys to anyone. Full bank +
  // answers live on the RBAC-gated GET /:id/admin-bank route.
  const sanitize = (q) => {
    const { correct_answer, ...cfg } = q.config || {};
    return { ...q, config: cfg };
  };

  // Build sections+questions from an ordered set of question ids, sanitized.
  const assembleFromSet = (set) => {
    const pos = new Map(set.map((id, i) => [id, i]));
    const chosen = questions
      .filter((q) => pos.has(q.id))
      .sort((a, b) => pos.get(a.id) - pos.get(b.id))
      .map(sanitize);
    const sectionsWithQ = sections.map((sec) => {
      const qs = chosen.filter((q) => q.section_id === sec.id);
      return { ...sec, questions: qs, effective_question_count: qs.length };
    });
    return { ...test, sections: sectionsWithQ, questions: chosen };
  };

  // Counts only — no questions at all (instructions screen / unauthenticated).
  const countsOnly = () => {
    const sectionsMeta = sections.map((sec) => ({
      ...sec, questions: [], effective_question_count: effectiveCount(sec),
    }));
    return {
      ...test,
      sections: sectionsMeta,
      questions: [],
      question_count: sectionsMeta.reduce((sum, sec) => sum + sec.effective_question_count, 0),
    };
  };

  // Unauthenticated → counts only, never any questions.
  if (!req.user) return ok(res, countsOnly());

  // Positive signal: a test-scoped token is a candidate; anything else is staff.
  const isStaff = req.user.scope !== 'test_only';

  if (!isStaff) {
    // Candidate — serve EXACTLY their frozen sampled set, sanitized.
    const { rows: attemptRows } = await query(
      'SELECT id, question_set, status FROM test_attempts WHERE test_id=$1 AND user_id=$2', [test.id, req.user.id]
    );
    const attempt = attemptRows[0] || null;
    let set = attempt?.question_set;

    // Lazy backfill: attempts started before sampling existed get a set now,
    // so in-progress candidates are healed without a reset.
    if (attempt && (!Array.isArray(set) || !set.length)) {
      set = await buildQuestionSet(test.id);
      await query('UPDATE test_attempts SET question_set=$1 WHERE id=$2', [JSON.stringify(set), attempt.id]);
    }

    if (Array.isArray(set) && set.length) return ok(res, assembleFromSet(set));

    // No attempt yet (instructions screen) — counts only, never the question bank.
    return ok(res, countsOnly());
  }

  // Staff (admin/coordinator/etc.) previewing via the take-test endpoint receive
  // a FRESHLY sampled set using the same per-section pick_count — NEVER the full
  // bank, and always sanitized (no answer keys). Full bank + answers is the
  // separate, RBAC-gated GET /:id/admin-bank route below.
  const staffSet = await buildQuestionSet(test.id);
  ok(res, assembleFromSet(staffSet));
}));

// ── Admin/QA: full question bank WITH answer keys ───────────────────────────────
// This is the ONLY endpoint that returns the complete bank and the correct
// answers, and it is gated on a real `tests:read` permission. The test-taking UI
// must never consume this — it uses GET /:id, which only ever returns the
// randomized, sanitized sample.
router.get('/:id/admin-bank', authenticate, requirePermission('tests', 'read'), asyncHandler(async (req, res) => {
  const { rows: [test] } = await query('SELECT * FROM tests WHERE id=$1', [req.params.id]);
  if (!test) return notFound(res, 'Test not found');

  const { rows: sections } = await query(
    'SELECT * FROM test_sections WHERE test_id=$1 ORDER BY order_index ASC', [test.id]
  );
  const { rows: questions } = await query(
    'SELECT * FROM test_questions WHERE test_id=$1 ORDER BY order_index ASC', [test.id]
  );

  const effectiveCount = (s) => {
    const bank = questions.filter((q) => q.section_id === s.id).length;
    return s.pick_count && s.pick_count > 0 ? Math.min(s.pick_count, bank) : bank;
  };
  const sectionsWithQ = sections.map((s) => ({
    ...s,
    questions: questions.filter((q) => q.section_id === s.id),
    effective_question_count: effectiveCount(s),
  }));
  ok(res, { ...test, sections: sectionsWithQ, questions });
}));

// ── Create test ────────────────────────────────────────────────────────────────
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

// ── Update test metadata ───────────────────────────────────────────────────────
router.patch('/:id', authenticate, requirePermission('tests', 'update'), asyncHandler(async (req, res) => {
  const b = req.body;
  const { rows: [test] } = await query(
    `UPDATE tests SET
       title            = COALESCE($1, title),
       description      = COALESCE($2, description),
       instructions     = COALESCE($3, instructions),
       duration_minutes = COALESCE($4, duration_minutes),
       total_marks      = COALESCE($5, total_marks),
       passing_marks    = COALESCE($6, passing_marks),
       start_time       = COALESCE($7, start_time),
       end_time         = COALESCE($8, end_time),
       updated_at       = NOW()
     WHERE id = $9 RETURNING *`,
    [b.title||null, b.description||null, b.instructions||null,
     b.duration_minutes||null, b.total_marks||null, b.passing_marks||null,
     b.start_time||null, b.end_time||null, req.params.id]
  );
  if (!test) return notFound(res, 'Test not found');
  ok(res, test);
}));

// ── Publish test ───────────────────────────────────────────────────────────────
router.post('/:id/publish', authenticate, requirePermission('tests', 'update'), asyncHandler(async (req, res) => {
  const { rows: [{ count }] } = await query(
    'SELECT COUNT(*)::int AS count FROM test_questions WHERE test_id=$1', [req.params.id]
  );
  if (count === 0) return badRequest(res, 'Cannot publish a test with no questions.');
  const { rows: [test] } = await query(
    `UPDATE tests SET status='published', updated_at=NOW() WHERE id=$1 AND status='draft' RETURNING *`,
    [req.params.id]
  );
  if (!test) return badRequest(res, 'Test not found or already published');
  ok(res, test, 'Test published');
}));

// ── Unpublish / close test ─────────────────────────────────────────────────────
router.post('/:id/close', authenticate, requirePermission('tests', 'update'), asyncHandler(async (req, res) => {
  const { rows: [test] } = await query(
    `UPDATE tests SET status='closed', updated_at=NOW() WHERE id=$1 RETURNING *`, [req.params.id]
  );
  if (!test) return notFound(res, 'Test not found');
  ok(res, test, 'Test closed');
}));

// ── Add question ───────────────────────────────────────────────────────────────
router.post('/:testId/questions', authenticate, requirePermission('tests', 'update'),
  validate(questionSchema), asyncHandler(async (req, res) => {
    const b = req.body;
    // Auto-assign order_index if not given
    const { rows: [{ next }] } = await query(
      'SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM test_questions WHERE test_id=$1',
      [req.params.testId]
    );
    const { rows: [q] } = await query(
      `INSERT INTO test_questions (test_id,section_id,question_type,question_text,marks,order_index,is_required,config)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.params.testId, b.section_id||null, b.question_type, b.question_text,
       b.marks, b.order_index ?? next, b.is_required, JSON.stringify(b.config)]
    );
    created(res, q, 'Question added');
  })
);

// ── Update question ────────────────────────────────────────────────────────────
router.patch('/:testId/questions/:questionId', authenticate, requirePermission('tests', 'update'),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const { rows: [q] } = await query(
      `UPDATE test_questions SET
         section_id    = COALESCE($1, section_id),
         question_text = COALESCE($2, question_text),
         marks         = COALESCE($3, marks),
         order_index   = COALESCE($4, order_index),
         config        = COALESCE($5, config)
       WHERE id=$6 AND test_id=$7 RETURNING *`,
      [b.section_id||null, b.question_text||null, b.marks||null, b.order_index||null,
       b.config ? JSON.stringify(b.config) : null, req.params.questionId, req.params.testId]
    );
    if (!q) return notFound(res, 'Question not found');
    ok(res, q);
  })
);

// ── Delete question ────────────────────────────────────────────────────────────
router.delete('/:testId/questions/:questionId', authenticate, requirePermission('tests', 'update'),
  asyncHandler(async (req, res) => {
    await query('DELETE FROM test_questions WHERE id=$1 AND test_id=$2', [req.params.questionId, req.params.testId]);
    res.status(204).send();
  })
);

// ── Bulk replace questions for a test ─────────────────────────────────────────
router.put('/:testId/questions', authenticate, requirePermission('tests', 'update'),
  asyncHandler(async (req, res) => {
    const questions = req.body.questions || [];
    // Delete all and re-insert for simplicity
    await query('DELETE FROM test_questions WHERE test_id=$1', [req.params.testId]);
    const inserted = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const { rows: [row] } = await query(
        `INSERT INTO test_questions (test_id,section_id,question_type,question_text,marks,order_index,is_required,config)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [req.params.testId, q.section_id||null, q.question_type||'mcq', q.question_text,
         q.marks||1, i, q.is_required!==false, JSON.stringify(q.config||{})]
      );
      inserted.push(row);
    }
    ok(res, inserted, `${inserted.length} questions saved`);
  })
);

// ── Start attempt ──────────────────────────────────────────────────────────────
router.post('/:id/start', authenticate, asyncHandler(async (req, res) => {
  const { rows: [test] } = await query('SELECT * FROM tests WHERE id=$1 AND status=$2', [req.params.id, 'published']);
  if (!test) return notFound(res, 'Test not found or not published');

  const { rows: [existing] } = await query(
    'SELECT * FROM test_attempts WHERE test_id=$1 AND user_id=$2', [req.params.id, req.user.id]
  );
  if (existing) {
    if (existing.status === 'submitted') return badRequest(res, 'You have already submitted this test.');
    return ok(res, existing, 'Resuming existing attempt');
  }

  // Get applicant_id from token claim if present (test-scoped JWT)
  const applicantId = req.user.applicant_id || null;
  const tokenId     = req.user.token_id     || null;

  // ── Build & freeze the per-candidate random question set ──────────────────
  const questionSet = await buildQuestionSet(req.params.id);

  const { rows: [attempt] } = await query(
    `INSERT INTO test_attempts (test_id, user_id, applicant_id, token_id, question_set)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.params.id, req.user.id, applicantId, tokenId, JSON.stringify(questionSet)]
  );
  created(res, attempt, 'Attempt started');
}));

// ── Get my attempt + saved responses (for resume) ─────────────────────────────
router.get('/:id/my-attempt', authenticate, asyncHandler(async (req, res) => {
  // Compute time_remaining_secs in pure SQL so it's timezone-independent.
  // started_at is TIMESTAMP WITHOUT TIME ZONE stored as UTC (Neon default).
  // We subtract NOW() AT TIME ZONE 'UTC' (also TIMESTAMP WITHOUT TIME ZONE in UTC)
  // so the interval arithmetic is consistent regardless of server/client locale.
  const { rows: [attempt] } = await query(
    `SELECT ta.*,
       GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (
         ta.started_at + (t.duration_minutes * INTERVAL '1 minute')
         - (NOW() AT TIME ZONE 'UTC')
       ))))::int AS time_remaining_secs
     FROM test_attempts ta
     JOIN tests t ON t.id = ta.test_id
     WHERE ta.test_id = $1 AND ta.user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!attempt) return ok(res, null, 'No attempt found');

  const { rows: responseRows } = await query(
    'SELECT question_id, response_data FROM test_responses WHERE attempt_id=$1', [attempt.id]
  );
  // Flatten response_data so frontend can read r.selected_option directly
  const responses = responseRows.map((r) => ({
    question_id: r.question_id,
    selected_option: r.response_data?.selected_option ?? null,
  }));
  ok(res, { ...attempt, responses });
}));

// ── Batch-save responses in a SINGLE round-trip ─────────────────────────────────
// The Neon driver issues one network round-trip per query(), so the previous
// per-response loop meant ~100 round-trips per autosave/submit (15-60s under load,
// causing request pile-up, pool exhaustion and "No active attempt found" races).
// One multi-row upsert collapses that to a single round-trip.
//
// Responses are deduped by question_id (last value wins) because ON CONFLICT
// DO UPDATE cannot touch the same row twice in one statement.
const saveResponsesBatch = async (attemptId, responses) => {
  const deduped = new Map();
  for (const r of responses || []) {
    if (!r || !r.question_id) continue;
    deduped.set(r.question_id, r.selected_option ?? null);
  }
  if (deduped.size === 0) return 0;

  const valuesSql = [];
  const params = [];
  let i = 1;
  for (const [questionId, selectedOption] of deduped) {
    valuesSql.push(`($${i++}, $${i++}, $${i++}::jsonb)`);
    params.push(attemptId, questionId, JSON.stringify({ selected_option: selectedOption }));
  }

  await query(
    `INSERT INTO test_responses (attempt_id, question_id, response_data)
     VALUES ${valuesSql.join(', ')}
     ON CONFLICT (attempt_id, question_id)
     DO UPDATE SET response_data = EXCLUDED.response_data`,
    params
  );
  return deduped.size;
};

// ── Autosave responses ─────────────────────────────────────────────────────────
router.patch('/:id/autosave', authenticate, asyncHandler(async (req, res) => {
  const { rows: [attempt] } = await query(
    `SELECT id, status FROM test_attempts WHERE test_id=$1 AND user_id=$2`,
    [req.params.id, req.user.id]
  );

  // Forgiving by design — autosave must NEVER throw a hard error at a student
  // who is mid-exam. If the attempt is already submitted (or a stale duplicate
  // request lands after submit), respond with a soft no-op success instead of
  // the old 400 "No active attempt found".
  if (!attempt) return ok(res, { saved_count: 0, skipped: 'no_attempt' }, 'No active attempt');
  if (attempt.status !== 'in_progress') {
    return ok(res, { saved_count: 0, skipped: 'submitted' }, 'Attempt already submitted');
  }

  const saved = await saveResponsesBatch(attempt.id, req.body.responses);
  await query('UPDATE test_attempts SET last_saved_at=NOW() WHERE id=$1', [attempt.id]);
  ok(res, { saved_count: saved, last_saved_at: new Date() });
}));

// ── Submit test (with MCQ auto-scoring) ───────────────────────────────────────
router.post('/:id/submit', authenticate, asyncHandler(async (req, res) => {
  const { rows: [attempt] } = await query(
    `SELECT * FROM test_attempts WHERE test_id=$1 AND user_id=$2`,
    [req.params.id, req.user.id]
  );
  if (!attempt) return badRequest(res, 'No active attempt found');

  // Idempotent submit — if the attempt is already submitted (duplicate click,
  // overlapping/retried request, or a network retry after a successful submit),
  // return the stored result as SUCCESS instead of a scary 400. This is the
  // direct fix for students who saw "No active attempt found" even though their
  // test had actually been recorded.
  if (attempt.status !== 'in_progress') {
    return ok(res, {
      attempt_id: attempt.id,
      score: attempt.score,
      time_taken_secs: attempt.time_taken_secs,
      already_submitted: true,
    }, 'Test already submitted');
  }

  // Save all final responses in a SINGLE round-trip (see saveResponsesBatch).
  await saveResponsesBatch(attempt.id, req.body.responses);

  // ── Auto-score MCQ questions ──
  const { rows: questions } = await query(
    `SELECT q.id, q.marks, q.config, q.question_type
     FROM test_questions q WHERE q.test_id = $1`, [req.params.id]
  );
  const { rows: responses } = await query(
    'SELECT * FROM test_responses WHERE attempt_id=$1', [attempt.id]
  );
  const responseMap = Object.fromEntries(responses.map((r) => [r.question_id, r]));

  // Only the candidate's frozen question set counts toward the score
  const allowedSet = Array.isArray(attempt.question_set) && attempt.question_set.length
    ? new Set(attempt.question_set) : null;

  let totalScore = 0;
  const scoreUpdates = []; // { id, award }
  for (const q of questions) {
    if (allowedSet && !allowedSet.has(q.id)) continue;
    if (q.question_type !== 'mcq') continue;
    const resp = responseMap[q.id];
    if (!resp) continue;
    const correct = q.config?.correct_answer;
    const given   = resp.response_data?.selected_option;
    const award   = (correct && given && correct === given) ? (q.marks || 1) : 0;
    totalScore += award;
    scoreUpdates.push({ id: resp.id, award });
  }

  // Write all marks_awarded in a SINGLE set-based UPDATE (was ~N round-trips).
  if (scoreUpdates.length) {
    const valuesSql = [];
    const params = [];
    let i = 1;
    for (const u of scoreUpdates) {
      valuesSql.push(`($${i++}::uuid, $${i++}::int)`);
      params.push(u.id, u.award);
    }
    await query(
      `UPDATE test_responses AS tr
         SET marks_awarded = v.award
       FROM (VALUES ${valuesSql.join(', ')}) AS v(id, award)
       WHERE tr.id = v.id`,
      params
    );
  }

  const timeTaken = Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000);

  await query(
    `UPDATE test_attempts SET status='submitted', submitted_at=NOW(), time_taken_secs=$1, score=$2 WHERE id=$3`,
    [timeTaken, totalScore, attempt.id]
  );

  // Update applicant status → test_completed
  if (attempt.applicant_id) {
    await query(
      `UPDATE applicants SET status='test_completed' WHERE id=$1 AND status='test_pending'`,
      [attempt.applicant_id]
    );
  }

  // Automated "Test Completed" — receivers configured per course in the wizard
  // (default: coordinators + admins; the candidate copy is opt-in)
  setImmediate(async () => {
    try {
      const { rows: [test] } = await query(
        'SELECT course_id, total_marks, passing_marks, title FROM tests WHERE id=$1', [req.params.id]
      );
      const { rows: [candidate] } = await query(
        'SELECT email, first_name, last_name FROM users WHERE id=$1', [attempt.user_id]
      );
      if (test) {
        await notifyTestCompleted({
          courseId: test.course_id,
          attemptId: attempt.id,
          candidate,
          testTitle: test.title,
          score: totalScore,
          total: test.total_marks || 100,
          passing: test.passing_marks ?? Math.ceil((test.total_marks || 100) * 0.4),
        });
      }
    } catch (e) { console.error('[notify] test_completed:', e.message); }
  });

  ok(res, {
    attempt_id: attempt.id,
    score: totalScore,
    time_taken_secs: timeTaken,
  }, 'Test submitted successfully');
}));

// ── Admin: get full test results for an applicant ─────────────────────────────
router.get('/:id/results/:applicantId', authenticate, requirePermission('applicants', 'read'),
  asyncHandler(async (req, res) => {
    // Always pick the LATEST submitted attempt (after a reset, old one is deleted so this is fine)
    const { rows: [attempt] } = await query(
      `SELECT ta.*, u.first_name, u.last_name, u.email
       FROM test_attempts ta
       JOIN users u ON u.id = ta.user_id
       WHERE ta.test_id=$1 AND ta.applicant_id=$2 AND ta.status='submitted'
       ORDER BY ta.submitted_at DESC LIMIT 1`,
      [req.params.id, req.params.applicantId]
    );
    if (!attempt) return notFound(res, 'No submitted attempt found for this applicant');

    const set = Array.isArray(attempt.question_set) && attempt.question_set.length
      ? attempt.question_set : null;

    let responses;
    if (set) {
      // Sampled test: show every question the candidate was served,
      // including unanswered ones (LEFT JOIN on responses)
      ({ rows: responses } = await query(
        `SELECT q.id AS question_id, q.question_text, q.question_type, q.marks, q.config, q.order_index,
                s.title AS section_title, s.order_index AS section_order,
 
                tr.id, tr.attempt_id, tr.response_data, tr.marks_awarded
         FROM test_questions q
         LEFT JOIN test_sections s ON s.id = q.section_id
         LEFT JOIN test_responses tr ON tr.question_id = q.id AND tr.attempt_id = $1
         WHERE q.id = ANY($2::uuid[])
         ORDER BY s.order_index ASC NULLS LAST, array_position($2::uuid[], q.id)`,
        [attempt.id, set]
      ));
    } else {
      ({ rows: responses } = await query(
        `SELECT tr.*, q.question_text, q.question_type, q.marks, q.config, q.order_index,
                s.title AS section_title, s.order_index AS section_order
         FROM test_responses tr
         JOIN test_questions q ON q.id = tr.question_id
         LEFT JOIN test_sections s ON s.id = q.section_id
         WHERE tr.attempt_id=$1
         ORDER BY s.order_index ASC NULLS LAST, q.order_index ASC`,
        [attempt.id]
      ));
    }

    // Build section-level summary
    const sectionMap = {};
    for (const r of responses) {
      const key = r.section_title || 'General';
      if (!sectionMap[key]) sectionMap[key] = { section_title: key, total: 0, correct: 0, marks: 0, total_marks: 0 };
      sectionMap[key].total++;
      sectionMap[key].total_marks += (r.marks || 1);
      if ((r.marks_awarded || 0) > 0) {
        sectionMap[key].correct++;
        sectionMap[key].marks += r.marks_awarded;
      }
    }

    // Fetch test title for display
    const { rows: [testRow] } = await query('SELECT title, total_marks, duration_minutes FROM tests WHERE id=$1', [req.params.id]);

    ok(res, {
      test: testRow || null,
      attempt,
      responses: responses.map((r) => ({
        ...r,
        is_correct: (r.marks_awarded || 0) > 0,
        correct_answer: r.config?.correct_answer,
        options: r.config?.options || [],
      })),
      section_scores: Object.values(sectionMap),
    });
  })
);

export default router;
