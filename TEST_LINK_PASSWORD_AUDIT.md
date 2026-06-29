# Audit — "Test link password not working" (dyperf)

**Date:** 2026-06-29 · **Scope:** read-only audit, no code changed.
**Files reviewed:** `backend/src/modules/tests/test-assign.routes.js`, `backend/src/modules/tests/test-auth.routes.js`, `backend/src/modules/email/email.service.js`, `backend/src/modules/email/email-templates.registry.js`, `backend/src/db/alter_test_system.sql`, `src/pages/public/TestLoginPage.jsx`.

## How the flow works
1. Admin assigns a test → `test-assign` creates/looks up a `users` row, generates an **8-char password**, hashes it into `users.password_hash`, creates a `test_access_tokens` row, and emails the plain password.
2. Student opens link → `test-auth/login` looks up the token, then validates the typed password with `bcrypt.compare(password, users.password_hash)`.

The password lives on the **global `users` row**, not on the per-test token. That single fact is the source of most of the bugs below.

---

## Root-cause findings (most → least likely)

### BUG 1 — Password is rotated on every re-assign, silently invalidating already-emailed passwords  ★ most likely cause
`test-assign.routes.js` lines 114–119: when an applicant already has a `user_id`, the code **always generates a new password and overwrites `users.password_hash`**.

Consequences:
- Re-running **"assign all"** (e.g. to pick up newly-added applicants) rotates the password for *every* previously-invited student. Their original email password stops working.
- Assigning the **same applicant to a second test** overwrites the password from the first test's email.
- Because the hash is shared across the whole portal, any password change anywhere breaks the test link too.

This precisely matches "*some* students" — the affected ones are those who were re-assigned / assigned to a 2nd test / caught in a re-run. The `reset` endpoint (lines 211–217) rotates intentionally, which is fine; the problem is `assign` rotating *unintentionally* on re-run.

### BUG 2 — "Existing email" path issues a link but never sets or sends a password
`test-assign.routes.js` lines 90–92: if the applicant has no `user_id` but a `users` row already exists for that email, the code sets `userId = existingUser.id` and leaves `plainPassword = null`. It never sets a known password, and the email is skipped because of the guard `if (sendEmails && plainPassword)` (line 161).

Result: the student gets a working link but **no usable password** (the account's old password is unknown to them) → "password not working." Affects re-applicants or anyone seeded with an account earlier.

### BUG 3 — Frontend trims the token but not the password
`TestLoginPage.jsx` line 12 carefully strips junk from the token (`rawToken.split(/[\s|]/)[0].trim()`), but the password (line 33) is sent **verbatim**. Plain-text mailers and copy-paste often append a trailing space/newline. `bcrypt.compare` then fails on the whitespace. The code comments already acknowledge mailers mangle the credentials — the defense was applied only to the token, not the password.

### BUG 4 — Generated password charset is transcription-unfriendly (minor)
`genPassword` (line 19): `randomBytes(5).toString('base64url').slice(0,8)` produces 8 chars from `[A-Za-z0-9-_]`. The `-`/`_` and mixed case are easy to mistype and easy to confuse with link separators. Not the primary cause, but it raises the manual-entry failure rate.

---

## Production logs — app.dyperf.com
Loki + Prometheus are healthy. I checked the observability stack for the dyperf backend:
- **No service named `app.dyperf.com` (or any dyperf/ERP backend) is shipping logs to this Loki instance.** The apps that *do* log here are `video-management-api`, `smarthms-frontend`, `s3-backend-api` (PM2/nodeapps) and a Django app `kumsserp2.celiyo.com` (gunicorn), plus system/auth/nginx.
- The dyperf frontend is deployed on Netlify (`netlify.toml` present), which doesn't ship to this stack.
- The `auth.log` hits for "password" are unrelated SSH brute-force noise.

So I could **not** confirm the bug from production logs — the relevant backend isn't observable here. This is also expected behavior-wise: failed test logins return HTTP 401 (handled), not 500, so they wouldn't surface as errors even if the backend were logging. **Recommendation:** ship the test-auth backend logs to Loki (or add a counter on `test-auth/login` 401s) so this is diagnosable next time.

---

## Suggested fix direction (NOT applied)
- Don't rotate the password on plain re-assign when the user/token already exists; only rotate in `reset`, or store a per-test credential instead of reusing the global `users.password_hash`.
- In the existing-email branch, generate + set + email a password (or explicitly resend), don't fall through silently.
- `.trim()` the password on the frontend (and/or backend) like the token already is.
- Consider a clearer password alphabet (no `-_`, avoid look-alikes).

Tell me if you want me to implement any of these.
