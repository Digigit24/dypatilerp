import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

/**
 * Route-level tests for POST /api/public/applications. The service layer
 * (covered by public-applications.service.test.js) and the email notifier are
 * mocked, so these tests exercise only: request validation, HTTP status /
 * response-shape mapping, generic-500 error handling, and that notification
 * fires ONLY after a successful creation. No live Postgres/Neon connection is
 * ever used and no real email is ever sent.
 *
 * The router's rate limiter is a module-level singleton whose in-memory
 * counter would otherwise accumulate across every request in this file. We
 * raise its per-window limit to a high value via env BEFORE the router module
 * is evaluated (vi.hoisted runs before imports), so these functional tests are
 * isolated from rate-limit exhaustion. (Rate-limit-specific behavior is a
 * separate concern, not exercised here.)
 */
// Capture the original value so it can be restored after this file's suite,
// preventing the raised limit from leaking into any other test file.
const { ORIGINAL_RL_MAX } = vi.hoisted(() => {
  const ORIGINAL_RL_MAX = process.env.PUBLIC_APPLICATIONS_RATE_LIMIT_MAX;
  process.env.PUBLIC_APPLICATIONS_RATE_LIMIT_MAX = '100000';
  return { ORIGINAL_RL_MAX };
});

afterAll(() => {
  if (ORIGINAL_RL_MAX === undefined) delete process.env.PUBLIC_APPLICATIONS_RATE_LIMIT_MAX;
  else process.env.PUBLIC_APPLICATIONS_RATE_LIMIT_MAX = ORIGINAL_RL_MAX;
});

vi.mock('../src/modules/public-applications/public-applications.service.js', () => ({
  submitPublicApplication: vi.fn(),
}));

vi.mock('../src/modules/notifications/notify.service.js', () => ({
  notifyApplicationSubmitted: vi.fn().mockResolvedValue(undefined),
}));

import * as svc from '../src/modules/public-applications/public-applications.service.js';
import { notifyApplicationSubmitted } from '../src/modules/notifications/notify.service.js';
import publicApplicationsRouter from '../src/modules/public-applications/public-applications.routes.js';

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/public/applications', publicApplicationsRouter);
  return app;
};

// Matches the strict, nested public schema (applicant.personal.*).
const validBody = () => ({
  program: 'dlitt',
  applicant: {
    personal: {
      first_name: 'Asha',
      last_name: 'Rao',
      email: 'asha.rao@example.com',
    },
  },
});

// Flushes the fire-and-forget setImmediate notification scheduled by the controller.
const flushMicrotasks = () => new Promise((resolve) => setImmediate(resolve));

let app;
beforeEach(() => {
  vi.clearAllMocks();
  app = makeApp();
});

describe('POST /api/public/applications — validation', () => {
  it('400s when program is missing', async () => {
    const res = await request(app).post('/api/public/applications').send({ applicant: validBody().applicant });
    expect(res.status).toBe(400);
    expect(svc.submitPublicApplication).not.toHaveBeenCalled();
  });

  it('400s on an invalid program key format', async () => {
    const res = await request(app).post('/api/public/applications').send({ ...validBody(), program: 'DLitt Program!' });
    expect(res.status).toBe(400);
    expect(svc.submitPublicApplication).not.toHaveBeenCalled();
  });

  it('400s when the applicant email is missing', async () => {
    const body = validBody();
    delete body.applicant.personal.email;
    const res = await request(app).post('/api/public/applications').send(body);
    expect(res.status).toBe(400);
    expect(svc.submitPublicApplication).not.toHaveBeenCalled();
  });

  it('400-rejects (does not silently strip) an injected course_id/batch_id, and never calls the service', async () => {
    svc.submitPublicApplication.mockResolvedValue({ success: true, applicant: { id: 'app-1' } });
    const body = validBody();
    body.applicant.course_id = 'attacker-course-id';
    body.applicant.batch_id = 'attacker-batch-id';

    const res = await request(app).post('/api/public/applications').send(body);

    expect(res.status).toBe(400);
    expect(svc.submitPublicApplication).not.toHaveBeenCalled();
  });
});

describe('POST /api/public/applications — outcomes', () => {
  it('201s and fires the confirmation notification on success', async () => {
    const applicant = { id: 'app-1', email: 'asha.rao@example.com', course_id: 'course-1', batch_id: 'batch-1' };
    svc.submitPublicApplication.mockResolvedValue({ success: true, applicant });

    const res = await request(app).post('/api/public/applications').send(validBody());

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(applicant);

    await flushMicrotasks(); // let the fire-and-forget notify call run
    expect(notifyApplicationSubmitted).toHaveBeenCalledWith(applicant);
  });

  it('503s with a safe generic message when the target is unavailable (missing/disabled/invalid)', async () => {
    svc.submitPublicApplication.mockResolvedValue({ success: false, reason: 'unavailable' });
    const res = await request(app).post('/api/public/applications').send(validBody());

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      success: false,
      message: 'Applications for this program are not currently being accepted.',
    });
    await flushMicrotasks();
    expect(notifyApplicationSubmitted).not.toHaveBeenCalled();
  });

  it('409s on a duplicate application', async () => {
    svc.submitPublicApplication.mockResolvedValue({ success: false, reason: 'duplicate' });
    const res = await request(app).post('/api/public/applications').send(validBody());

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      success: false,
      message: 'An application with this email has already been submitted for this program.',
    });
    await flushMicrotasks();
    expect(notifyApplicationSubmitted).not.toHaveBeenCalled();
  });
});

describe('POST /api/public/applications — generic 500 error handling', () => {
  let errorSpy;
  beforeEach(() => {
    // Silence + capture the server-side error log so test output stays clean
    // and we can assert the failure was logged via the existing logger.
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('returns a generic 500 when the service throws an unexpected error', async () => {
    svc.submitPublicApplication.mockRejectedValue(new Error('boom'));
    const res = await request(app).post('/api/public/applications').send(validBody());

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'An unexpected error occurred. Please try again later.',
    });
  });

  it('does not leak the internal error message, SQL, IDs, paths, or a stack trace', async () => {
    const leaky = new Error('duplicate key value violates unique constraint "applicants_pkey" — SELECT * FROM applicants WHERE id=\'11111111-2222-4333-8444-555555555555\' at /home/app/src/db.js:42');
    svc.submitPublicApplication.mockRejectedValue(leaky);

    const res = await request(app).post('/api/public/applications').send(validBody());
    const bodyText = JSON.stringify(res.body);

    expect(res.status).toBe(500);
    expect(bodyText).not.toContain('duplicate key');
    expect(bodyText).not.toContain('SELECT');
    expect(bodyText).not.toContain('applicants_pkey');
    expect(bodyText).not.toContain('11111111-2222-4333-8444-555555555555');
    expect(bodyText).not.toContain('/home/app');
    expect(bodyText).not.toContain('stack');
    expect(res.body).not.toHaveProperty('stack');
    // The technical detail IS logged server-side via the existing logger.
    expect(errorSpy).toHaveBeenCalled();
  });

  it('does not fire the notification when applicant creation fails unexpectedly', async () => {
    svc.submitPublicApplication.mockRejectedValue(new Error('db down'));
    await request(app).post('/api/public/applications').send(validBody());

    await flushMicrotasks();
    expect(notifyApplicationSubmitted).not.toHaveBeenCalled();
  });
});

describe('POST /api/public/applications — request-size guard', () => {
  it('rejects an oversized payload with a safe 413 and never reaches the service or notifier', async () => {
    // The route guard rejects bodies whose Content-Length exceeds ~16kb before
    // validation/controller run. Pad well past that threshold.
    const body = validBody();
    body.applicant.research_statement = 'a'.repeat(20 * 1024);

    const res = await request(app).post('/api/public/applications').send(body);

    expect(res.status).toBe(413);
    expect(res.body).toEqual({ success: false, message: 'Request payload too large.' });
    // No internal detail beyond the generic message.
    expect(JSON.stringify(res.body)).not.toContain('16');
    expect(svc.submitPublicApplication).not.toHaveBeenCalled();
    await flushMicrotasks();
    expect(notifyApplicationSubmitted).not.toHaveBeenCalled();
  });
});

/**
 * Genuine rate-limit test. The router's limiter is a module-level singleton, so
 * to exercise a real 429 we re-import the router with a LOW configured limit via
 * a fresh module registry (vi.resetModules). We import the freshly-mocked
 * service/notifier from the SAME reset registry so the assertions observe the
 * exact instances the fresh router calls. This is fully isolated from the
 * functional tests above (which use the high-limit top-level router), so it
 * cannot make them flaky. The raised env is restored in afterEach + afterAll.
 */
describe('POST /api/public/applications — rate limiting (isolated)', () => {
  let limitedApp;
  let svcFresh;
  let notifyFresh;

  beforeEach(async () => {
    process.env.PUBLIC_APPLICATIONS_RATE_LIMIT_MAX = '2'; // allow 2, reject the 3rd
    vi.resetModules();
    svcFresh = await import('../src/modules/public-applications/public-applications.service.js');
    notifyFresh = await import('../src/modules/notifications/notify.service.js');
    const { default: freshRouter } = await import('../src/modules/public-applications/public-applications.routes.js');
    svcFresh.submitPublicApplication.mockResolvedValue({
      success: true,
      applicant: { id: 'app-x', email: 'x@example.com' },
    });
    limitedApp = express();
    limitedApp.use(express.json());
    limitedApp.use('/api/public/applications', freshRouter);
  });

  afterEach(() => {
    process.env.PUBLIC_APPLICATIONS_RATE_LIMIT_MAX = '100000'; // restore this file's high limit
    vi.resetModules();
  });

  it('allows requests up to the limit, then rejects the next with a safe generic 429', async () => {
    const r1 = await request(limitedApp).post('/api/public/applications').send(validBody());
    const r2 = await request(limitedApp).post('/api/public/applications').send(validBody());
    const r3 = await request(limitedApp).post('/api/public/applications').send(validBody());

    // Requests below the limit succeed.
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);

    // The request above the limit is rejected with a safe, generic 429.
    expect(r3.status).toBe(429);
    expect(r3.body).toEqual({
      success: false,
      message: 'Too many application attempts. Please try again later.',
    });

    // The rejected request never reached the service (creation) …
    expect(svcFresh.submitPublicApplication).toHaveBeenCalledTimes(2);
    // … and never triggered a notification (only the 2 successes did).
    await flushMicrotasks();
    expect(notifyFresh.notifyApplicationSubmitted).toHaveBeenCalledTimes(2);
  });
});
