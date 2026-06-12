import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

/**
 * Integration tests for GET /api/tests/:id — the take-test serve path (ISSUE-007).
 * Auth + rbac + the DB layer are mocked so the staff-vs-candidate branching and
 * answer-key sanitization are exercised in isolation (no live Postgres).
 */

// Auth mock: build req.user from test headers (positive `scope` signal).
vi.mock('../src/middleware/auth.js', () => {
  const applyUser = (req) => {
    const id = req.headers['x-test-userid'];
    if (!id) { req.user = undefined; return; }
    const scope = req.headers['x-test-scope'] || null;
    const roles = (req.headers['x-test-roles'] || '').split(',').filter(Boolean);
    req.user = { id, scope, roles };
    if (scope === 'test_only') req.user.test_scope = req.headers['x-test-testid'] || null;
  };
  return {
    authenticate: (req, res, next) => {
      applyUser(req);
      if (!req.user) return res.status(401).json({ success: false, message: 'No token' });
      next();
    },
    optionalAuth: (req, res, next) => { applyUser(req); next(); },
    mapTokenToUser: (u) => u,
  };
});

vi.mock('../src/middleware/rbac.js', () => ({
  requirePermission: () => (req, res, next) => next(),
  requireRole: () => (req, res, next) => next(),
}));

vi.mock('../src/middleware/validate.js', () => ({
  validate: () => (req, res, next) => next(),
}));

vi.mock('../src/config/database.js', () => ({ query: vi.fn(), pool: { end: vi.fn() } }));

import { query } from '../src/config/database.js';
import testsRouter from '../src/modules/tests/tests.routes.js';

const TEST_ID = '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7';

const sections = [
  { id: 'secA', test_id: TEST_ID, title: 'Section A', order_index: 0, pick_count: 25 },
  { id: 'secB', test_id: TEST_ID, title: 'Section B', order_index: 1, pick_count: 50 },
  { id: 'secC', test_id: TEST_ID, title: 'Section C', order_index: 2, pick_count: 25 },
];

const questions = [];
let oi = 0;
for (const sec of sections) {
  for (let i = 0; i < 100; i++) {
    questions.push({
      id: `${sec.id}-q${i}`, test_id: TEST_ID, section_id: sec.id,
      question_type: 'mcq', question_text: `Q ${sec.id} ${i}`, marks: 1, order_index: oi++,
      config: { options: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }], correct_answer: 'A' },
    });
  }
}

const pick = (secId, n) => questions.filter((q) => q.section_id === secId).slice(0, n).map((q) => q.id);
// Frozen sample: 25 + 50 + 25 = 100
const questionSet = [...pick('secA', 25), ...pick('secB', 50), ...pick('secC', 25)];
const test = { id: TEST_ID, title: 'DY Patil PhD Entrance', status: 'published', duration_minutes: 90, total_marks: 100 };

let attemptRows;

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/tests', testsRouter);
  return app;
};

let app;
beforeEach(() => {
  vi.clearAllMocks();
  attemptRows = [{ id: 'att-1', question_set: questionSet, status: 'in_progress' }];
  query.mockImplementation(async (sql) => {
    if (/FROM tests WHERE id/.test(sql)) return { rows: [test] };
    if (/FROM test_sections/.test(sql)) return { rows: sections };
    if (/FROM test_questions WHERE test_id/.test(sql)) return { rows: questions };
    if (/FROM test_attempts/.test(sql)) return { rows: attemptRows };
    return { rows: [] };
  });
  app = makeApp();
});

const candidate = (req) => req
  .set('x-test-userid', 'cand-1')
  .set('x-test-scope', 'test_only')
  .set('x-test-testid', TEST_ID)
  .set('x-test-roles', 'applicant');

const hasAnswerKey = (qs) => qs.some((q) => q.config && 'correct_answer' in q.config);

describe('GET /api/tests/:id — candidate (test-scoped token)', () => {
  it('serves ONLY the frozen sampled set (100), not the full 300 bank', async () => {
    const res = await candidate(request(app).get(`/api/tests/${TEST_ID}`));
    expect(res.status).toBe(200);
    expect(res.body.data.questions).toHaveLength(100);
    expect(res.body.data.sections.map((s) => s.questions.length)).toEqual([25, 50, 25]);
  });

  it('never includes correct_answer on any served question', async () => {
    const res = await candidate(request(app).get(`/api/tests/${TEST_ID}`));
    expect(hasAnswerKey(res.body.data.questions)).toBe(false);
    for (const s of res.body.data.sections) expect(hasAnswerKey(s.questions)).toBe(false);
  });

  it('regression: 3×100 bank with pick 25/50/25 → exactly 100 served, zero answer keys', async () => {
    const res = await candidate(request(app).get(`/api/tests/${TEST_ID}`));
    const total = res.body.data.sections.reduce((n, s) => n + s.questions.length, 0);
    expect(total).toBe(100);
    expect(hasAnswerKey(res.body.data.questions)).toBe(false);
  });
});

describe('GET /api/tests/:id — unauthenticated', () => {
  it('returns counts only, never the question bank', async () => {
    const res = await request(app).get(`/api/tests/${TEST_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.data.questions).toHaveLength(0);
    expect(res.body.data.question_count).toBe(100); // 25+50+25 effective
  });
});

describe('GET /api/tests/:id — staff (non-test-scoped token)', () => {
  it('returns the full bank but WITHOUT correct_answer by default', async () => {
    const res = await request(app).get(`/api/tests/${TEST_ID}`)
      .set('x-test-userid', 'admin-1').set('x-test-roles', 'admin');
    expect(res.status).toBe(200);
    expect(res.body.data.questions).toHaveLength(300);
    expect(hasAnswerKey(res.body.data.questions)).toBe(false);
  });

  it('returns answer keys only for an admin with explicit ?includeAnswers=1', async () => {
    const res = await request(app).get(`/api/tests/${TEST_ID}`)
      .query({ includeAnswers: 1 })
      .set('x-test-userid', 'admin-1').set('x-test-roles', 'admin');
    expect(res.body.data.questions).toHaveLength(300);
    expect(res.body.data.questions.every((q) => q.config.correct_answer === 'A')).toBe(true);
  });

  it('does NOT leak answer keys for a non-admin staff member even with includeAnswers=1', async () => {
    const res = await request(app).get(`/api/tests/${TEST_ID}`)
      .query({ includeAnswers: 1 })
      .set('x-test-userid', 'coord-1').set('x-test-roles', 'coordinator');
    expect(res.body.data.questions).toHaveLength(300);
    expect(hasAnswerKey(res.body.data.questions)).toBe(false);
  });
});
