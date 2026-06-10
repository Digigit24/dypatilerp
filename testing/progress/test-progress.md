# Test Progress

_Last updated: 2026-06-09_

Tracks cumulative QA coverage across the DY Patil ERP. Coverage must never
regress (see `../reports/latest-report.md` for per-cycle deltas).

## Test infrastructure (established this cycle)

| Layer | Framework | Location | Run command |
|-------|-----------|----------|-------------|
| Backend API (unit/integration) | Vitest + Supertest | `backend/tests/` | `cd backend && npm test` |
| Frontend components | Vitest + Testing Library + jsdom | `src/**/__tests__/` | `npm test` |
| E2E | Playwright (chromium) | `e2e/` | `npm run test:e2e` |

Coverage: `npm run test:coverage` (frontend) / `cd backend && npm run test:coverage`.

## Features Tested

| Feature | Layer | Status |
|---------|-------|--------|
| Fees listing — auth scoping + UUID validation | API + Component + E2E | ✅ Covered |
| Student profile — auth-scoped load | Component + E2E | ✅ Covered |
| Progress reports — auth-scoped load + PDF action | Component + E2E | ✅ Covered |
| Research profile — auth-scoped load | Component + E2E | ✅ Covered |
| Submissions list — auth-scoped load + detail drawer | Component + E2E | ✅ Covered |
| Submit flow — auth-scoped create | Component + E2E | ✅ Covered |
| Authentication (login/redirect) | E2E | ⚠️ Needs live backend |

## APIs Covered

| Endpoint | Cases | Status |
|----------|-------|--------|
| `GET /api/fees` | auth (401), authz (403), student scoping, spoof-protection, UUID 400, valid UUID, no-filter, response schema, pagination, 500 | ✅ 10 tests |
| `GET /api/fees/:id` | — | ⛔ Not yet (not in current diff) |
| `POST /api/fees` | — | ⛔ Not yet (not in current diff) |
| `POST /api/fees/:id/payments` | — | ⛔ Not yet (not in current diff) |

## Components Covered

| Component | Tests | Status |
|-----------|-------|--------|
| `src/pages/student/FeesPage.jsx` | 6 | ✅ 100% stmts |
| `src/pages/student/ProfilePage.jsx` | 3 | ✅ 100% stmts |
| `src/pages/student/ProgressPage.jsx` | 5 | ✅ 100% stmts |
| `src/pages/student/ResearchProfilePage.jsx` | 4 | ✅ render/load paths |
| `src/pages/student/SubmissionsPage.jsx` | 6 | ✅ render/load/detail |
| `src/pages/student/SubmitPage.jsx` | 4 | ✅ 100% stmts |

## E2E Flows Covered

Executed 2026-06-09 against live backend (:5000, seeded Neon DB) as student
`rahul.verma@student.dypatil.edu`. **6 passed / 4 failed** (pre-fix).

After fixes applied on 2026-06-09 — re-seed required for E2E to go green:

| Flow | Spec | Status |
|------|------|--------|
| Login form renders | `e2e/auth.spec.js` | ✅ Pass |
| Invalid credentials rejected | `e2e/auth.spec.js` | ✅ Pass |
| Student login → dashboard | `e2e/auth.spec.js` | ✅ Pass |
| Fees page KPIs | `e2e/student-fees.spec.js` | ✅ Fixed (ISSUE-004 resolved) |
| Fees payment preview | `e2e/student-fees.spec.js` | ✅ Fixed (ISSUE-006 resolved) |
| Profile page renders | `e2e/student-journeys.spec.js` | ✅ Pass |
| Progress page renders | `e2e/student-journeys.spec.js` | ✅ Fixed (ISSUE-004 resolved) |
| Submissions page renders | `e2e/student-journeys.spec.js` | ✅ Fixed (ISSUE-004 resolved) |
| Research profile renders | `e2e/student-journeys.spec.js` | ✅ Fixed (ISSUE-005 resolved) |
| Submit page renders | `e2e/student-journeys.spec.js` | ✅ Pass |

## Outstanding Work

- Add API tests for the other fees endpoints (`/:id`, POST, payments) and the
  `fees.service.js` data layer (needs a test DB or `pg` mock).
- Extend component coverage to non-student admin pages (out of current diff scope).
- Add coverage thresholds to CI once a baseline is agreed.
- VULN-001/002/003, DEP-001 — tracked in `open-issues.md` for follow-up.
