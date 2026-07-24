import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

/**
 * Route-level tests for POST /api/public/applications. The service layer
 * (already covered by public-applications.service.test.js) and the email
 * notifier are mocked here so these tests exercise only: request validation,
 * course_id/batch_id stripping, HTTP status/response-shape mapping, and that
 * a success fires the same confirmation-email path the shared applicants
 * endpoint uses. No live Postgres/Neon connection is ever used.
 */

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

const validBody = () => ({
  program: 'dlitt',
  applicant: {
    first_name: 'Asha',
    last_name: 'Rao',
    email: 'asha.rao@example.com',
  },
});

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
    delete body.applicant.email;
    const res = await request(app).post('/api/public/applications').send(body);
    expect(res.status).toBe(400);
    expect(svc.submitPublicApplication).not.toHaveBeenCalled();
  });

  it('strips an arbitrary course_id/batch_id sent on the applicant object before it reaches the service', async () => {
    svc.submitPublicApplication.mockResolvedValue({ success: true, applicant: { id: 'app-1', email: 'asha.rao@example.com' } });
    const body = validBody();
    body.applicant.course_id = 'attacker-course-id';
    body.applicant.batch_id = 'attacker-batch-id';

    await request(app).post('/api/public/applications').send(body);

    expect(svc.submitPublicApplication).toHaveBeenCalledTimes(1);
    const [, appliedApplicant] = svc.submitPublicApplication.mock.calls[0];
    expect(appliedApplicant.course_id).toBeUndefined();
    expect(appliedApplicant.batch_id).toBeUndefined();
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

    await new Promise((resolve) => setImmediate(resolve)); // flush the fire-and-forget notify call
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
    expect(notifyApplicationSubmitted).not.toHaveBeenCalled();
  });
});
