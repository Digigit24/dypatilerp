import { describe, it, expect, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';

/**
 * Unit tests for the admin-impersonation auth path:
 *  - mapTokenToUser carries impersonation claims (mirrors the existing
 *    test_only handling, see auth.middleware.test.js).
 *  - authenticate() re-checks the backing DB session on every request so
 *    "Return to Admin" (or natural expiry) takes effect immediately, not
 *    just on the client or after the full 15-minute token lifetime.
 *  - blockDuringImpersonation stops the one self-service action
 *    (password change) an impersonated session must never be allowed to take.
 */

const SECRET = 'test_secret_for_impersonation';
vi.mock('../src/config/env.js', () => ({ env: { JWT_SECRET: 'test_secret_for_impersonation' } }));
vi.mock('../src/config/database.js', () => ({ query: vi.fn(), getClient: vi.fn() }));

import { query } from '../src/config/database.js';
import { authenticate, mapTokenToUser, blockDuringImpersonation } from '../src/middleware/auth.js';
import { isImpersonationSessionActive } from '../src/modules/auth/auth.service.js';

const ADMIN_ID = 'admin-1';
const TARGET_ID = 'target-1';
const SESSION_ID = 'session-1';
const TARGET_ROW = { id: TARGET_ID, email: 'scholar@b.com', first_name: 'Scholar', last_name: 'One', is_active: true };

const makeRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

const impersonationToken = jwt.sign(
  {
    sub: TARGET_ID,
    roles: ['student'],
    scope: 'impersonation',
    impersonated_by: ADMIN_ID,
    impersonation_session_id: SESSION_ID,
  },
  SECRET
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('mapTokenToUser (impersonation)', () => {
  it('carries impersonation claims when scope is impersonation', () => {
    const u = mapTokenToUser({ id: TARGET_ID }, jwt.decode(impersonationToken));
    expect(u.scope).toBe('impersonation');
    expect(u.impersonated_by).toBe(ADMIN_ID);
    expect(u.impersonation_session_id).toBe(SESSION_ID);
    expect(u.roles).toEqual(['student']);
  });

  it('does not set impersonation fields for a normal token', () => {
    const u = mapTokenToUser({ id: TARGET_ID }, jwt.decode(jwt.sign({ sub: TARGET_ID, roles: ['student'] }, SECRET)));
    expect(u.impersonated_by).toBeUndefined();
    expect(u.impersonation_session_id).toBeUndefined();
  });
});

describe('isImpersonationSessionActive', () => {
  it('returns true when a matching, unexpired, unended row exists', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: SESSION_ID }] });
    const active = await isImpersonationSessionActive(SESSION_ID, ADMIN_ID, TARGET_ID);
    expect(active).toBe(true);
  });

  it('returns false when no matching row exists (ended, expired, or wrong ids)', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const active = await isImpersonationSessionActive(SESSION_ID, ADMIN_ID, TARGET_ID);
    expect(active).toBe(false);
  });

  it('returns false without querying when sessionId is missing', async () => {
    const active = await isImpersonationSessionActive(null, ADMIN_ID, TARGET_ID);
    expect(active).toBe(false);
    expect(query).not.toHaveBeenCalled();
  });
});

describe('authenticate (impersonation-scoped token)', () => {
  it('rejects with 401 when the backing session has ended', async () => {
    // First call: the active-session check → not found (ended/expired).
    query.mockResolvedValueOnce({ rows: [] });
    const req = { headers: { authorization: `Bearer ${impersonationToken}` } };
    const res = makeRes();
    const next = vi.fn();
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    // Must short-circuit before the user-row lookup — only one query fired.
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('proceeds and maps claims when the backing session is still active', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: SESSION_ID }] })   // active-session check
      .mockResolvedValueOnce({ rows: [TARGET_ROW] });          // user row lookup
    const req = { headers: { authorization: `Bearer ${impersonationToken}` } };
    const res = makeRes();
    const next = vi.fn();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe(TARGET_ID);
    expect(req.user.scope).toBe('impersonation');
    expect(req.user.impersonated_by).toBe(ADMIN_ID);
  });
});

describe('blockDuringImpersonation', () => {
  it('blocks with 403 when req.user.scope is impersonation', () => {
    const req = { user: { scope: 'impersonation' } };
    const res = makeRes();
    const next = vi.fn();
    blockDuringImpersonation(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() for a normal (non-impersonation) session', () => {
    const req = { user: { scope: null } };
    const res = makeRes();
    const next = vi.fn();
    blockDuringImpersonation(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() when there is no req.user at all', () => {
    const req = {};
    const res = makeRes();
    const next = vi.fn();
    blockDuringImpersonation(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
