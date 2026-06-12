import { describe, it, expect, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';

/**
 * Unit tests for the auth middleware claim-mapping (ISSUE-007).
 * `optionalAuth` previously failed to carry test-scoped claims, so candidates
 * on the take-test route were mis-classified as staff. Both middlewares now
 * share `mapTokenToUser`.
 */

// Literal repeated in the factory below — vi.mock is hoisted above this const,
// so the factory cannot reference SECRET directly.
const SECRET = 'test_secret_for_auth_mw';
vi.mock('../src/config/env.js', () => ({ env: { JWT_SECRET: 'test_secret_for_auth_mw' } }));
vi.mock('../src/config/database.js', () => ({ query: vi.fn() }));

import { query } from '../src/config/database.js';
import { authenticate, optionalAuth, mapTokenToUser } from '../src/middleware/auth.js';

const USER_ROW = { id: 'user-1', email: 'a@b.com', first_name: 'A', last_name: 'B', is_active: true };

const makeRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

beforeEach(() => {
  vi.clearAllMocks();
  query.mockResolvedValue({ rows: [USER_ROW] });
});

const testToken = jwt.sign(
  { sub: 'user-1', roles: ['applicant'], scope: 'test_only', test_id: 'test-9', token_id: 'tok-1', applicant_id: 'app-1' },
  SECRET
);
const staffToken = jwt.sign({ sub: 'user-1', roles: ['admin'] }, SECRET);

describe('mapTokenToUser', () => {
  it('carries test-scoped claims when scope is test_only', () => {
    const u = mapTokenToUser({ id: 'user-1' }, jwt.decode(testToken));
    expect(u.scope).toBe('test_only');
    expect(u.test_scope).toBe('test-9');
    expect(u.applicant_id).toBe('app-1');
    expect(u.token_id).toBe('tok-1');
    expect(u.roles).toEqual(['applicant']);
  });

  it('does not set test_scope for a normal token', () => {
    const u = mapTokenToUser({ id: 'user-1' }, jwt.decode(staffToken));
    expect(u.scope).toBeNull();
    expect(u.test_scope).toBeUndefined();
    expect(u.roles).toEqual(['admin']);
  });
});

describe('optionalAuth', () => {
  it('populates req.user.test_scope from a test-scoped token (ISSUE-007 regression)', async () => {
    const req = { headers: { authorization: `Bearer ${testToken}` } };
    const next = vi.fn();
    await optionalAuth(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.user.scope).toBe('test_only');
    expect(req.user.test_scope).toBe('test-9');
    expect(req.user.applicant_id).toBe('app-1');
  });

  it('continues without req.user when no token is present', async () => {
    const req = { headers: {} };
    const next = vi.fn();
    await optionalAuth(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });
});

describe('authenticate', () => {
  it('maps the same test-scoped claims as optionalAuth', async () => {
    const req = { headers: { authorization: `Bearer ${testToken}` } };
    const next = vi.fn();
    await authenticate(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.user.test_scope).toBe('test-9');
    expect(req.user.scope).toBe('test_only');
  });

  it('rejects a missing token with 401', async () => {
    const req = { headers: {} };
    const res = makeRes();
    const next = vi.fn();
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
