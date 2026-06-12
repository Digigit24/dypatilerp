# Resolved Issues / Vulnerabilities

Issues moved here once verified fixed. Each entry keeps its original details
plus a **Resolution** and **Resolved date**.

---

## ISSUE-004 — `student` role has no permissions seeded (student portal 403s)

- **Date found:** 2026-06-09
- **Severity:** High
- **Location:** `backend/src/db/seed.js` — `role_permissions` inserts
- **Resolution:** Added idempotent `INSERT … ON CONFLICT DO NOTHING` permission
  grants in `seed.js` for `student`, `academic_guide`, `industry_mentor`, and
  `applicant` roles.
  - **student** — `fees:read`, `progress_reports:read`, `submissions:read`,
    `submissions:create`, `approvals:read`, `research_profiles:read`,
    `research_profiles:update`, `notifications:read`, `dashboard:read`
  - **academic_guide** — `students:read`, `submissions:read/update`,
    `approvals:read/create/update`, `progress_reports:read`,
    `research_profiles:read`, `notifications:read/create`, `dashboard:read`
  - **industry_mentor** — `students:read`, `submissions:read`,
    `approvals:read/create/update`, `progress_reports:read`,
    `research_profiles:read`, `notifications:read`, `dashboard:read`
  - **applicant** — `tests:read`, `submissions:read`, `notifications:read`
  Re-seed the database (`node backend/src/db/seed.js`) to apply.
- **Resolved date:** 2026-06-09

---

## ISSUE-005 — Research profile API response shape ≠ UI expectation

- **Date found:** 2026-06-09
- **Severity:** Medium
- **Location:** `src/api/services/researchProfileService.js` +
  `src/pages/student/ResearchProfilePage.jsx`
- **Resolution:**
  - Added `normalizeProfile()` in `researchProfileService.js` that maps the
    real API shape to the UI shape: `slug → public_slug`, `user_id →
    student_id`, flat `publications` array grouped by `publication_type` into
    `research_papers` / `patents` / `workshops_seminars` / `publications`,
    `research_interests → skills`.
  - Added `?? []` defensive fallbacks in `ResearchProfilePage.jsx` for all
    array accesses (`profile[key] ?? []` and `profile.skills ?? []`) to prevent
    crashes if a key is missing.
- **Resolved date:** 2026-06-09

---

## ISSUE-006 — E2E payment-preview spec masks failure behind a conditional

- **Date found:** 2026-06-09
- **Severity:** Low
- **Location:** `e2e/student-fees.spec.js`
- **Resolution:** Added explicit assertions that the fees heading and "Paid" KPI
  are visible before the `payNow.count()` conditional, so a broken fees page
  causes a hard test failure instead of a silent skip.
- **Resolved date:** 2026-06-09

---

## ISSUE-007 — Test-takers served the FULL question bank (and answer keys) instead of the sampled set

- **Date found:** 2026-06-12
- **Severity:** High (exam integrity — over-serving questions **and** leaking answer keys)
- **Location:** `backend/src/middleware/auth.js` (`optionalAuth` claim drift) +
  `backend/src/modules/tests/tests.routes.js` (`GET /:id` staff-vs-candidate branch).
- **Root cause:** `optionalAuth` resolved `req.user` but never carried the
  test-scoped JWT claims (`test_scope`), unlike `authenticate`. The take-test
  serve route uses `optionalAuth`, so a candidate's `req.user.test_scope` was
  `undefined` → `isStaff = !!req.user && !req.user.test_scope` was `true` →
  candidate fell into the staff/full-bank branch, which also skipped
  `sanitize()`, exposing `correct_answer`.
- **Resolution (code-only — in-progress attempts self-heal, no DB writes):**
  - Extracted a shared `mapTokenToUser(user, payload)` helper in `auth.js`, now
    used by **both** `authenticate` and `optionalAuth`, so the claim mapping
    (`roles`, `scope`, and test-scoped `applicant_id`/`token_id`/`test_scope`)
    can no longer drift. `optionalAuth` now populates `test_scope`/`scope`.
  - `tests.routes.js GET /:id` now derives staff from a **positive** signal —
    `isStaff = !!req.user && req.user.scope !== 'test_only'` — instead of the
    absence of `test_scope`.
  - The staff/full-bank branch now strips `correct_answer` via the shared
    `sanitize()` unless the requester is an **admin** AND passes the explicit
    `?includeAnswers=1` override. Candidates are always sanitized.
- **Tests added:**
  - `backend/tests/auth.middleware.test.js` (6) — `mapTokenToUser` + `optionalAuth`
    now map `test_scope`; parity with `authenticate`.
  - `backend/tests/tests.routes.test.js` (7) — candidate gets exactly the frozen
    sampled set (25/50/25 = 100) with no `correct_answer`; admin gets full bank
    sanitized by default; answer keys only with admin + `?includeAnswers=1`;
    non-admin staff never sees answers; unauthenticated gets counts only.
- **Verification:** backend 23/23 + frontend 27/27 vitest passing. Live E2E on the
  take-test route not run (would require creating an applicant attempt = DB write,
  disallowed); covered by the API integration tests above.
- **Fix commit:** `__COMMIT_SHA__`
- **Resolved date:** 2026-06-12
