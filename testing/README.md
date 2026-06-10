# QA / Testing

QA orchestration artifacts and how to run the suites.

## Layout

```
testing/
  progress/test-progress.md        # cumulative coverage tracker
  vulnerabilities/open-issues.md    # active findings
  vulnerabilities/resolved-issues.md
  reports/latest-report.md          # latest QA cycle report
```

Tests themselves live next to the code they cover:

```
backend/tests/                      # API tests (Vitest + Supertest)
src/**/__tests__/                   # component tests (Vitest + Testing Library)
e2e/                                # Playwright E2E specs
```

## Running

```bash
# Frontend component tests
npm test
npm run test:coverage

# Backend API tests
cd backend && npm test
cd backend && npm run test:coverage

# E2E (auto-starts the vite dev server; needs backend for authed journeys)
npm run test:e2e
```

### E2E credentials

Authenticated journeys read credentials from env (no secrets committed):

```bash
E2E_STUDENT_EMAIL=...  E2E_STUDENT_PASSWORD=...  npm run test:e2e
```

Requires the backend (`http://localhost:5000`) and a seeded database to be
running. Without them, only the frontend-only specs pass.
