import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';

/**
 * Unit tests for the email-OTP login token lifecycle in auth.service.js.
 * The DB layer is mocked — these tests exercise code generation, hashing,
 * throttling, attempt-limiting and consumption logic in isolation.
 */

vi.mock('../src/config/env.js', () => ({
  env: { JWT_SECRET: 's', JWT_REFRESH_SECRET: 's', JWT_EXPIRES_IN: '7d', JWT_REFRESH_EXPIRES_IN: '30d' },
}));
vi.mock('../src/config/database.js', () => ({ query: vi.fn(), getClient: vi.fn() }));

import { query } from '../src/config/database.js';
import { createLoginOtp, verifyLoginOtp } from '../src/modules/auth/auth.service.js';

const USER_ID = 'user-1';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createLoginOtp', () => {
  it('returns null (no code issued) when one was requested very recently', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'existing-otp-row' }] }); // recent-request check
    const code = await createLoginOtp(USER_ID);
    expect(code).toBeNull();
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('issues a 6-digit code, superseding any earlier unused one, when not throttled', async () => {
    query
      .mockResolvedValueOnce({ rows: [] })   // recent-request check: none
      .mockResolvedValueOnce({})             // DELETE previous unused codes
      .mockResolvedValueOnce({});            // INSERT new code

    const code = await createLoginOtp(USER_ID);

    expect(code).toMatch(/^\d{6}$/);
    expect(query).toHaveBeenCalledTimes(3);

    const deleteCall = query.mock.calls[1];
    expect(deleteCall[0]).toMatch(/DELETE FROM login_otps/);
    expect(deleteCall[1]).toEqual([USER_ID]);

    const insertCall = query.mock.calls[2];
    expect(insertCall[0]).toMatch(/INSERT INTO login_otps/);
    const [insertedUserId, insertedHash] = insertCall[1];
    expect(insertedUserId).toBe(USER_ID);
    // The raw code itself must never be what's stored — only its bcrypt hash.
    expect(insertedHash).not.toBe(code);
    expect(await bcrypt.compare(code, insertedHash)).toBe(true);
  });
});

describe('verifyLoginOtp', () => {
  it('throws OTP_NOT_FOUND when no unused/unexpired code exists for the user', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    await expect(verifyLoginOtp(USER_ID, '123456')).rejects.toMatchObject({ code: 'OTP_NOT_FOUND' });
  });

  it('throws OTP_LOCKED and invalidates the row after 5 prior wrong attempts', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 'row-1', code_hash: 'irrelevant', attempt_count: 5 }] })
      .mockResolvedValueOnce({}); // mark used (locked out)
    await expect(verifyLoginOtp(USER_ID, '123456')).rejects.toMatchObject({ code: 'OTP_LOCKED' });
    expect(query.mock.calls[1][0]).toMatch(/UPDATE login_otps SET used_at = NOW\(\)/);
  });

  it('returns false and increments attempt_count on a wrong code', async () => {
    const hash = await bcrypt.hash('654321', 10);
    query
      .mockResolvedValueOnce({ rows: [{ id: 'row-1', code_hash: hash, attempt_count: 0 }] })
      .mockResolvedValueOnce({}); // increment attempt_count
    const ok = await verifyLoginOtp(USER_ID, '000000');
    expect(ok).toBe(false);
    expect(query.mock.calls[1][0]).toMatch(/attempt_count = attempt_count \+ 1/);
  });

  it('returns true and marks the code used on a correct match', async () => {
    const hash = await bcrypt.hash('654321', 10);
    query
      .mockResolvedValueOnce({ rows: [{ id: 'row-1', code_hash: hash, attempt_count: 2 }] })
      .mockResolvedValueOnce({}); // mark used
    const ok = await verifyLoginOtp(USER_ID, '654321');
    expect(ok).toBe(true);
    expect(query.mock.calls[1][0]).toMatch(/UPDATE login_otps SET used_at = NOW\(\)/);
    expect(query.mock.calls[1][1]).toEqual(['row-1']);
  });
});
