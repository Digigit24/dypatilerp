# Open Issues / Vulnerabilities

Each entry: Date · Severity · Location · Reproduction · Suggested fix · Status.
Resolved items move to `resolved-issues.md`.

> ISSUE-007 (test-take full-bank + answer-key leak) — **RESOLVED 2026-06-12**,
> see `resolved-issues.md`.

---

## VULN-001 — Roles are read from the JWT, not re-checked at request time

- **Date:** 2026-06-09
- **Severity:** Medium
- **Location:** `backend/src/middleware/auth.js:30` (`req.user.roles = parseRoles(payload.roles)`)
- **Reproduction:**
  1. A user logs in and receives a 7-day JWT containing their roles.
  2. An admin revokes/changes that user's roles in the DB.
  3. The user keeps the privileges encoded in the old token until it expires.
- **Impact:** Authorization decisions in `requirePermission`/`requireRole` can be
  based on stale role claims. The `fees` student-scoping branch
  (`fees.routes.js:47`) depends on `req.user.roles`, so a demoted user could
  retain the non-student listing path until token expiry.
- **Suggested fix:** Source roles from the DB during `authenticate` (join
  `user_roles`), or add a short-lived access token + token-version/`token_revoked_at`
  check. At minimum, shorten `JWT_EXPIRES_IN`.
- **Status:** OPEN (pre-existing; surfaced while testing the fees auth path)

---

## VULN-002 — Payment recording is not transactional

- **Date:** 2026-06-09
- **Severity:** Low
- **Location:** `backend/src/modules/fees/fees.service.js:39-54` (`recordPayment`)
- **Reproduction:** Two concurrent `POST /api/fees/:id/payments` requests both
  read the running `SUM(amount)` before either commits; the fee's `status`
  transition to `paid` and the inserted rows are not wrapped in a single
  transaction.
- **Impact:** Possible inconsistent `status` / double-counting under concurrency.
  Not exploitable via the current diff, but the fees module is impacted.
- **Suggested fix:** Wrap the insert + recompute + status update in a single
  `BEGIN/COMMIT` transaction (or use a row lock `SELECT ... FOR UPDATE`).
- **Status:** OPEN (out of current diff scope — tracked for follow-up)

---

## VULN-003 — UUID regex is laxer than the DB/zod expectation

- **Date:** 2026-06-09
- **Severity:** Informational
- **Location:** `backend/src/modules/fees/fees.routes.js:42`
- **Reproduction:** `uuidRe` accepts any hex in the version/variant nibbles
  (e.g. a v0/v6 "uuid"), whereas `z.string().uuid()` used elsewhere is stricter.
- **Impact:** A syntactically-valid-but-nonexistent UUID passes validation and
  reaches the parameterized query (returns empty results — no injection risk).
- **Suggested fix:** Reuse `z.string().uuid().safeParse()` for consistency
  instead of a hand-rolled regex.
- **Status:** OPEN (cosmetic / consistency)

---

## DEP-001 — npm audit reports vulnerabilities in dependencies

- **Date:** 2026-06-09
- **Severity:** Low (dev/test tooling) — verify before dismissing
- **Location:** root + `backend` `node_modules` (reported after adding test deps)
- **Reproduction:** `npm audit` (root) and `cd backend && npm audit`.
- **Suggested fix:** Run `npm audit` to review each advisory; apply
  `npm audit fix` where non-breaking. Most are transitive dev-only deps.
- **Status:** OPEN (triage pending)
