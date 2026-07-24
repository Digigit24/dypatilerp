import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Unit tests for the public-applications service — the trusted server-side
 * program → course/batch resolver used by the new public DLitt (and future
 * Postdoc) application endpoint. All DB-touching collaborators are mocked;
 * no live Postgres/Neon connection is ever used.
 */

vi.mock('../src/config/database.js', () => ({ query: vi.fn() }));
vi.mock('../src/modules/courses/courses.service.js', () => ({ getCourseById: vi.fn() }));
vi.mock('../src/modules/batches/batches.service.js', () => ({ getBatchById: vi.fn() }));
vi.mock('../src/modules/applicants/applicants.service.js', () => ({ createApplicant: vi.fn() }));

import { query } from '../src/config/database.js';
import { getCourseById } from '../src/modules/courses/courses.service.js';
import { getBatchById } from '../src/modules/batches/batches.service.js';
import { createApplicant } from '../src/modules/applicants/applicants.service.js';
import { resolveTrustedTarget, submitPublicApplication } from '../src/modules/public-applications/public-applications.service.js';

const COURSE_ID = '11111111-1111-4111-8111-111111111111';
const BATCH_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_COURSE_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_BATCH_ID = '44444444-4444-4444-8444-444444444444';

const settingsValue = (overrides = {}) => ({
  dlitt: { enabled: true, course_id: COURSE_ID, batch_id: BATCH_ID },
  ...overrides,
});

/** Wires `query` to answer both the app_settings read and the applicants
 *  duplicate-check with fixed data, unless a test overrides it directly. */
const mockSettings = (value) => {
  query.mockImplementation((sql) => {
    if (sql.includes('FROM app_settings')) {
      return Promise.resolve({ rows: value == null ? [] : [{ value }] });
    }
    if (sql.includes('FROM applicants')) {
      return Promise.resolve({ rows: [] }); // no duplicate by default
    }
    throw new Error('Unexpected query in test: ' + sql);
  });
};

const applicantPayload = { first_name: 'Asha', last_name: 'Rao', email: 'asha.rao@example.com' };

beforeEach(() => {
  vi.clearAllMocks();
  getCourseById.mockResolvedValue({ id: COURSE_ID });
  getBatchById.mockResolvedValue({ id: BATCH_ID, course_id: COURSE_ID });
  createApplicant.mockResolvedValue({ id: 'applicant-1', email: 'asha.rao@example.com' });
});

describe('resolveTrustedTarget', () => {
  it('resolves a valid, enabled target', async () => {
    mockSettings(settingsValue());
    expect(await resolveTrustedTarget('dlitt')).toEqual({ course_id: COURSE_ID, batch_id: BATCH_ID });
  });

  it('returns null when the target is disabled', async () => {
    mockSettings({ dlitt: { enabled: false, course_id: COURSE_ID, batch_id: BATCH_ID } });
    expect(await resolveTrustedTarget('dlitt')).toBeNull();
  });

  it('returns null when the program key is missing entirely', async () => {
    mockSettings({});
    expect(await resolveTrustedTarget('dlitt')).toBeNull();
  });

  it('returns null when the app_settings row itself is missing', async () => {
    mockSettings(null);
    expect(await resolveTrustedTarget('dlitt')).toBeNull();
  });

  it('returns null when the configured course does not exist', async () => {
    mockSettings(settingsValue());
    getCourseById.mockResolvedValue(null);
    expect(await resolveTrustedTarget('dlitt')).toBeNull();
  });

  it('returns null when the configured batch does not exist', async () => {
    mockSettings(settingsValue());
    getBatchById.mockResolvedValue(null);
    expect(await resolveTrustedTarget('dlitt')).toBeNull();
  });

  it('returns null when the batch belongs to a different course than configured', async () => {
    mockSettings(settingsValue());
    getBatchById.mockResolvedValue({ id: BATCH_ID, course_id: OTHER_COURSE_ID });
    expect(await resolveTrustedTarget('dlitt')).toBeNull();
  });

  it('never resolves via the prototype chain for unusual program keys', async () => {
    mockSettings(settingsValue());
    expect(await resolveTrustedTarget('__proto__')).toBeNull();
    expect(await resolveTrustedTarget('constructor')).toBeNull();
  });
});

describe('submitPublicApplication', () => {
  it('creates the applicant with the resolved trusted course/batch ids on success', async () => {
    mockSettings(settingsValue());
    const result = await submitPublicApplication('dlitt', { ...applicantPayload });

    expect(result.success).toBe(true);
    expect(createApplicant).toHaveBeenCalledTimes(1);
    const created = createApplicant.mock.calls[0][0];
    expect(created.course_id).toBe(COURSE_ID);
    expect(created.batch_id).toBe(BATCH_ID);
  });

  it('overwrites an arbitrary course_id/batch_id smuggled onto the payload with the trusted ids', async () => {
    mockSettings(settingsValue());
    await submitPublicApplication('dlitt', {
      ...applicantPayload,
      course_id: 'attacker-course-id',
      batch_id: 'attacker-batch-id',
    });
    const created = createApplicant.mock.calls[0][0];
    expect(created.course_id).toBe(COURSE_ID);
    expect(created.batch_id).toBe(BATCH_ID);
  });

  it('rejects with reason "unavailable" and creates nothing when the target is disabled', async () => {
    mockSettings({ dlitt: { enabled: false, course_id: COURSE_ID, batch_id: BATCH_ID } });
    const result = await submitPublicApplication('dlitt', applicantPayload);
    expect(result).toEqual({ success: false, reason: 'unavailable' });
    expect(createApplicant).not.toHaveBeenCalled();
  });

  it('rejects when the program key is missing, without creating an applicant', async () => {
    mockSettings({});
    const result = await submitPublicApplication('dlitt', applicantPayload);
    expect(result).toEqual({ success: false, reason: 'unavailable' });
    expect(createApplicant).not.toHaveBeenCalled();
  });

  it('rejects an unknown program the same way as a disabled one', async () => {
    mockSettings(settingsValue());
    const result = await submitPublicApplication('some_unknown_program', applicantPayload);
    expect(result).toEqual({ success: false, reason: 'unavailable' });
    expect(createApplicant).not.toHaveBeenCalled();
  });

  it('rejects when the configured course is invalid, without creating an applicant', async () => {
    mockSettings(settingsValue());
    getCourseById.mockResolvedValue(null);
    const result = await submitPublicApplication('dlitt', applicantPayload);
    expect(result).toEqual({ success: false, reason: 'unavailable' });
    expect(createApplicant).not.toHaveBeenCalled();
  });

  it('rejects when the configured batch is invalid, without creating an applicant', async () => {
    mockSettings(settingsValue());
    getBatchById.mockResolvedValue(null);
    const result = await submitPublicApplication('dlitt', applicantPayload);
    expect(result).toEqual({ success: false, reason: 'unavailable' });
    expect(createApplicant).not.toHaveBeenCalled();
  });

  it('rejects when the batch does not belong to the configured course, without creating an applicant', async () => {
    mockSettings(settingsValue());
    getBatchById.mockResolvedValue({ id: BATCH_ID, course_id: OTHER_COURSE_ID });
    const result = await submitPublicApplication('dlitt', applicantPayload);
    expect(result).toEqual({ success: false, reason: 'unavailable' });
    expect(createApplicant).not.toHaveBeenCalled();
  });

  it('rejects a duplicate — same normalized email + course_id + batch_id', async () => {
    query.mockImplementation((sql, params) => {
      if (sql.includes('FROM app_settings')) return Promise.resolve({ rows: [{ value: settingsValue() }] });
      if (sql.includes('FROM applicants')) {
        const [email, courseId, batchId] = params;
        const isDup = email === 'asha.rao@example.com' && courseId === COURSE_ID && batchId === BATCH_ID;
        return Promise.resolve({ rows: isDup ? [{ id: 'existing-applicant' }] : [] });
      }
      throw new Error('Unexpected query in test: ' + sql);
    });

    const result = await submitPublicApplication('dlitt', { ...applicantPayload, email: 'Asha.Rao@Example.com' });
    expect(result).toEqual({ success: false, reason: 'duplicate' });
    expect(createApplicant).not.toHaveBeenCalled();
  });

  it('allows the same email against a different configured batch', async () => {
    query.mockImplementation((sql, params) => {
      if (sql.includes('FROM app_settings')) {
        return Promise.resolve({ rows: [{ value: { dlitt: { enabled: true, course_id: COURSE_ID, batch_id: OTHER_BATCH_ID } } }] });
      }
      if (sql.includes('FROM applicants')) {
        const [, , batchId] = params;
        // A prior applicant only exists for BATCH_ID — the OTHER_BATCH_ID target is a fresh submission.
        return Promise.resolve({ rows: batchId === BATCH_ID ? [{ id: 'existing-applicant' }] : [] });
      }
      throw new Error('Unexpected query in test: ' + sql);
    });
    getBatchById.mockResolvedValue({ id: OTHER_BATCH_ID, course_id: COURSE_ID });

    const result = await submitPublicApplication('dlitt', applicantPayload);
    expect(result.success).toBe(true);
    expect(createApplicant).toHaveBeenCalledTimes(1);
  });

  it('allows the same email against a different configured course', async () => {
    query.mockImplementation((sql, params) => {
      if (sql.includes('FROM app_settings')) {
        return Promise.resolve({ rows: [{ value: { dlitt: { enabled: true, course_id: OTHER_COURSE_ID, batch_id: BATCH_ID } } }] });
      }
      if (sql.includes('FROM applicants')) {
        const [, courseId] = params;
        // A prior applicant only exists for COURSE_ID — the OTHER_COURSE_ID target is a fresh submission.
        return Promise.resolve({ rows: courseId === COURSE_ID ? [{ id: 'existing-applicant' }] : [] });
      }
      throw new Error('Unexpected query in test: ' + sql);
    });
    getCourseById.mockResolvedValue({ id: OTHER_COURSE_ID });
    getBatchById.mockResolvedValue({ id: BATCH_ID, course_id: OTHER_COURSE_ID });

    const result = await submitPublicApplication('dlitt', applicantPayload);
    expect(result.success).toBe(true);
    expect(createApplicant).toHaveBeenCalledTimes(1);
  });
});
