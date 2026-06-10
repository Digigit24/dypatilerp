import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

/**
 * Unit/integration tests for the Fees router — focused on the GET /fees
 * handler whose authorization-scoping + student_user_id UUID validation
 * changed in this diff. Middleware and the data-access service are mocked so
 * the route logic is exercised in isolation (no live Postgres needed).
 */

// --- Mock auth: build req.user from test headers ---------------------------
vi.mock('../src/middleware/auth.js', () => ({
  authenticate: (req, res, next) => {
    const userId = req.headers['x-test-userid'];
    if (!userId) return res.status(401).json({ success: false, message: 'No token provided' });
    const roles = (req.headers['x-test-roles'] || '').split(',').filter(Boolean);
    req.user = { id: userId, roles };
    next();
  },
  optionalAuth: (req, res, next) => next(),
}));

// --- Mock rbac: allow by default, forbid when x-test-forbid is set ----------
vi.mock('../src/middleware/rbac.js', () => ({
  requirePermission: () => (req, res, next) => {
    if (req.headers['x-test-forbid']) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  },
  requireRole: () => (req, res, next) => next(),
}));

// --- Mock validate: passthrough (POST body validation tested elsewhere) -----
vi.mock('../src/middleware/validate.js', () => ({
  validate: () => (req, res, next) => next(),
}));

// --- Mock the data-access service ------------------------------------------
vi.mock('../src/modules/fees/fees.service.js', () => ({
  listFees: vi.fn(),
  getFeeById: vi.fn(),
  createFee: vi.fn(),
  recordPayment: vi.fn(),
  bulkCreateFees: vi.fn(),
}));

import * as svc from '../src/modules/fees/fees.service.js';
import feesRouter from '../src/modules/fees/fees.routes.js';

const VALID_UUID = '11111111-2222-4333-8444-555555555555';
const STUDENT_UUID = '99999999-8888-4777-8666-555555555555';

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/fees', feesRouter);
  return app;
};

let app;
beforeEach(() => {
  vi.clearAllMocks();
  svc.listFees.mockResolvedValue({ data: [{ id: 'fee_1', amount: 1000 }], total: 1 });
  app = makeApp();
});

describe('GET /api/fees — authentication', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/fees');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false });
    expect(svc.listFees).not.toHaveBeenCalled();
  });
});

describe('GET /api/fees — authorization', () => {
  it('returns 403 when the fees:read permission is missing', async () => {
    const res = await request(app)
      .get('/api/fees')
      .set('x-test-userid', VALID_UUID)
      .set('x-test-roles', 'coordinator')
      .set('x-test-forbid', '1');
    expect(res.status).toBe(403);
    expect(svc.listFees).not.toHaveBeenCalled();
  });
});

describe('GET /api/fees — student role scoping', () => {
  it('forces student_user_id to the authenticated student id', async () => {
    const res = await request(app)
      .get('/api/fees')
      .set('x-test-userid', STUDENT_UUID)
      .set('x-test-roles', 'student');
    expect(res.status).toBe(200);
    expect(svc.listFees).toHaveBeenCalledTimes(1);
    expect(svc.listFees.mock.calls[0][0]).toMatchObject({ student_user_id: STUDENT_UUID });
  });

  it('ignores a spoofed student_user_id query param for students', async () => {
    const res = await request(app)
      .get('/api/fees')
      .query({ student_user_id: VALID_UUID }) // attempt to read another student's fees
      .set('x-test-userid', STUDENT_UUID)
      .set('x-test-roles', 'student');
    expect(res.status).toBe(200);
    // own id wins, not the spoofed query value
    expect(svc.listFees.mock.calls[0][0].student_user_id).toBe(STUDENT_UUID);
  });
});

describe('GET /api/fees — student_user_id UUID validation (non-student)', () => {
  it('rejects a non-UUID student_user_id with 400', async () => {
    const res = await request(app)
      .get('/api/fees')
      .query({ student_user_id: 'stu_001' })
      .set('x-test-userid', VALID_UUID)
      .set('x-test-roles', 'admin');
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false });
    expect(res.body.message).toMatch(/uuid/i);
    expect(svc.listFees).not.toHaveBeenCalled();
  });

  it('accepts a valid UUID student_user_id', async () => {
    const res = await request(app)
      .get('/api/fees')
      .query({ student_user_id: STUDENT_UUID })
      .set('x-test-userid', VALID_UUID)
      .set('x-test-roles', 'admin');
    expect(res.status).toBe(200);
    expect(svc.listFees.mock.calls[0][0].student_user_id).toBe(STUDENT_UUID);
  });

  it('allows admins to list all fees when student_user_id is omitted', async () => {
    const res = await request(app)
      .get('/api/fees')
      .set('x-test-userid', VALID_UUID)
      .set('x-test-roles', 'admin');
    expect(res.status).toBe(200);
    expect(svc.listFees).toHaveBeenCalledTimes(1);
    expect(svc.listFees.mock.calls[0][0].student_user_id).toBeUndefined();
  });

  it('rejects an uppercase-malformed UUID (edge case)', async () => {
    const res = await request(app)
      .get('/api/fees')
      .query({ student_user_id: '11111111-2222-4333-8444-ZZZZZZZZZZZZ' })
      .set('x-test-userid', VALID_UUID)
      .set('x-test-roles', 'coordinator');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/fees — response schema & pagination', () => {
  it('returns success envelope with data array and pagination meta', async () => {
    svc.listFees.mockResolvedValue({
      data: [{ id: 'fee_1' }, { id: 'fee_2' }],
      total: 42,
    });
    const res = await request(app)
      .get('/api/fees')
      .query({ page: 2, limit: 20 })
      .set('x-test-userid', VALID_UUID)
      .set('x-test-roles', 'admin');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toMatchObject({
      total: 42,
      page: 2,
      limit: 20,
      totalPages: 3,
    });
  });
});

describe('GET /api/fees — error handling', () => {
  it('surfaces a 500 when the service throws', async () => {
    svc.listFees.mockRejectedValue(new Error('db down'));
    // mount minimal error handler to mirror app.js behavior
    const appWithHandler = express();
    appWithHandler.use(express.json());
    appWithHandler.use('/api/fees', feesRouter);
    // eslint-disable-next-line no-unused-vars
    appWithHandler.use((err, req, res, next) => res.status(500).json({ success: false }));

    const res = await request(appWithHandler)
      .get('/api/fees')
      .set('x-test-userid', VALID_UUID)
      .set('x-test-roles', 'admin');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
