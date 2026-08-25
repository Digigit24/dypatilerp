import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';

/**
 * Unit tests for the forgot/reset-password token lifecycle in auth.service.js.
 * The DB layer is mocked — these tests exercise the token generation, hashing,
 * throttling and consumption logic in isolation.
 */

vi.mock('../src/config/env.js', () => ({
  env: { JWT_SECRET: 's', JWT_REFRESH_SECRET: 's', JWT_EXPIRES_IN: '7d', JWT_REFRESH_EXPIRES_IN: '30d' },
}));
vi.mock('../src/config/database.js', () => ({ query: vi.fn(), getClient: vi.fn() }));

import { query } from '../src/config/database.js';
import { createPasswordResetToken, consumePasswordResetToken } from '../src/modules/auth/auth.service.js';

const USER_ID = 'user-1';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createPasswordResetToken', () => {
  it('returns null (no token issued) when a request was made very recently', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'existing-token-row' }] }); // recent-request check
    const token = await createPasswordResetToken(USER_ID);
    expect(token).toBeNull();
    // Must stop after the throttle check — no delete/insert should fire.
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('issues a new token, superseding any earlier unused one, when not throttled', async () => {
    query
      .mockResolvedValueOnce({ rows: [] })   // recent-request check: none
      .mockResolvedValueOnce({})             // DELETE previous unused tokens
      .mockResolvedValueOnce({});            // INSERT new token
    const token = await createPasswordResetToken(USER_ID);

    expect(typeof token).toBe('string');
    expect(token).toHaveLength(64); // 32 random bytes as hex
    expect(query).toHaveBeenCalledTimes(3);

    const deleteCall = query.mock.calls[1];
    expect(deleteCall[0]).toMatch(/DELETE FROM password_reset_tokens/);
    expect(deleteCall[1]).toEqual([USER_ID]);

    const insertCall = query.mock.calls[2];
    expect(insertCall[0]).toMatch(/INSERT INTO password_reset_tokens/);
    const [insertedUserId, insertedHash] = insertCall[1];
    expect(insertedUserId).toBe(USER_ID);
    // The raw token itself must never be what's stored — only its SHA-256 hash.
    expect(insertedHash).toBe(crypto.createHash('sha256').update(token).digest('hex'));
    expect(insertedHash).not.toBe(token);
  });
});

describe('consumePasswordResetToken', () => {
  it('returns null for a token with no matching unused/unexpired row', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const userId = await consumePasswordResetToken('some-raw-token');
    expect(userId).toBeNull();
    // Must not attempt to mark anything used when nothing matched.
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('marks the token used and returns the owning user id on success', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 'row-1', user_id: USER_ID }] }) // lookup
      .mockResolvedValueOnce({});                                          // mark used

    const userId = await consumePasswordResetToken('some-raw-token');
    expect(userId).toBe(USER_ID);

    const lookupCall = query.mock.calls[0];
    expect(lookupCall[0]).toMatch(/token_hash = \$1 AND used_at IS NULL AND expires_at > NOW\(\)/);
    expect(lookupCall[1][0]).toBe(crypto.createHash('sha256').update('some-raw-token').digest('hex'));

    const updateCall = query.mock.calls[1];
    expect(updateCall[0]).toMatch(/UPDATE password_reset_tokens SET used_at = NOW\(\)/);
    expect(updateCall[1]).toEqual(['row-1']);
  });
});
