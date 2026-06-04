# Backend Agents

---

## Code Reviewer Agent

**Role:** Senior backend engineer specialising in Node.js / PostgreSQL APIs.

**Activation:** Invoke this agent when reviewing any backend PR or before marking a task done.

### Review Checklist

**Security**
- [ ] JWT tokens verified on every protected route (`authenticate` middleware present)
- [ ] RBAC guard (`requirePermission` or `requireRole`) on every route that mutates data
- [ ] No raw user input passed directly into SQL — use parameterised queries (`$1, $2, ...`)
- [ ] No secrets hardcoded; all config via `env.js`
- [ ] Passwords hashed with bcrypt (cost ≥ 12); never returned in responses

**Data Integrity**
- [ ] Transactions used for multi-step DB writes (use `getClient()` + BEGIN/COMMIT/ROLLBACK)
- [ ] Foreign key constraints respected; no orphaned records
- [ ] Unique constraint violations (`23505`) handled gracefully
- [ ] `updated_at = NOW()` set on all UPDATE queries

**API Design**
- [ ] Route follows REST conventions (nouns, correct HTTP verbs)
- [ ] Zod schema validates request body on all POST/PUT routes (`validate(schema)`)
- [ ] Paginated list endpoints use `getPagination` + `buildPaginationMeta`
- [ ] Response shape consistent: `{ success, data, message?, pagination? }`
- [ ] Appropriate HTTP status codes (201 for create, 204 for delete, 409 for conflict)

**Swagger Docs**
- [ ] Every route has a `@swagger` JSDoc block
- [ ] `tags`, `summary`, `parameters`, `requestBody`, `responses` all present
- [ ] Schema reflects actual payload (not just `type: object`)

**Code Quality**
- [ ] `asyncHandler` wraps every async controller (no unhandled promise rejections)
- [ ] No `console.log` left in production paths (use `console.error` for errors only)
- [ ] Services contain DB logic; controllers only call services + send responses
- [ ] No N+1 queries — use JOINs or aggregations

**Business Rules**
- [ ] Submission flow: only `draft` or `needs_revision` can be submitted
- [ ] Approval chain: approve must advance to next stage; final approve sets submission `approved`
- [ ] Convert-to-student: wrapped in DB transaction; idempotent (ON CONFLICT DO NOTHING)
- [ ] Fee payment: auto-marks fee `paid` when total_paid ≥ amount

---

## API Tester Agent

**Role:** QA engineer who tests all REST API endpoints systematically.

**Activation:** After any Phase 2/3 module is implemented, run this agent.

### Test Environment Setup
```bash
BASE_URL=http://localhost:5000/api
ADMIN_EMAIL=admin@dypatil.edu
ADMIN_PASS=Admin@1234
```

### Test Script Order (run sequentially)

#### 1. Auth Flow
```
POST /auth/login       { email, password }          → 200, tokens
POST /auth/register    { email, password, ... }     → 201, tokens
GET  /auth/me                                       → 200, user with roles
POST /auth/refresh     { refresh_token }            → 200, new tokens
POST /auth/logout                                   → 200
GET  /auth/me (expired token)                       → 401
```

#### 2. Courses
```
GET  /courses                   → 200, paginated
POST /courses { name, code }    → 201
GET  /courses/:id               → 200
GET  /courses/:id/dashboard     → 200, { batches, students, applicants, ... }
PUT  /courses/:id               → 200
DELETE /courses/:id (admin)     → 204
```

#### 3. Batches
```
POST /batches { course_id, name, code, start_date, end_date } → 201
GET  /batches?course_id=xxx     → 200, filtered
GET  /batches/:id/students      → 200
GET  /batches/:id/stats         → 200, { students, submissions, fees, avg_progress }
```

#### 4. Applicant Pipeline
```
POST /applicants (public)       → 201
GET  /applicants?status=submitted → 200
PUT  /applicants/:id/status { status: 'shortlisted' } → 200
POST /applicants/:id/convert { batch_id } → 200, { user_id, enrollment_number }
POST /applicants/bulk-convert { applicant_ids: [], batch_id } → 200, results[]
```

#### 5. Tests
```
POST /tests { course_id, title, type, duration_minutes } → 201
POST /tests/:id/questions { question_type: 'mcq', question_text, marks, config: { options: [], correct_answer: 0 } } → 201
POST /tests/:id/publish  → 200
POST /tests/:id/start    → 201, attempt
POST /tests/:id/submit { responses: [{ question_id, response_data }] } → 200
```

#### 6. Submissions & Approvals
```
POST /submissions { batch_id, title, submission_type, semester } → 201, draft
PUT  /submissions/:id { content, file_urls } → 200
POST /submissions/:id/submit → 200, creates 3 approvals
GET  /approvals/pending (as coordinator) → list
POST /approvals/:id/action { action: 'approve' } → 200, advances chain
POST /approvals/:id/action { action: 'request_revision', comments: '...' } → 200
```

#### 7. Fees
```
POST /fees { batch_id, student_user_id, semester, amount, due_date } → 201
GET  /fees?student_user_id=xxx → 200
POST /fees/:id/payments { amount, payment_method: 'bank_transfer', transaction_id } → 201
GET  /fees/:id → 200, includes payments[], auto-status 'paid'
```

#### 8. Notifications
```
POST /notifications { type: 'announcement', title, message, recipient_ids: [uuid] } → 201
GET  /notifications → 200 (own notifications)
PUT  /notifications/:id/read → 200
PUT  /notifications/mark-all-read → 200
```

#### 9. Dashboard
```
GET /dashboard/admin             → 200, KPIs
GET /dashboard/student           → 200, personal KPIs
GET /dashboard/courses/:courseId → 200, course-level aggregated
```

#### 10. RBAC Tests
```
Login as student → try POST /courses → 403
Login as coordinator → try DELETE /users/:id → 403
Login as admin → all routes → 200/201/204
```

### Error Cases to Verify
- `401` on protected route with no token
- `401` on expired/invalid token
- `400` on Zod validation failure (body missing required field)
- `404` on non-existent resource ID
- `409` on duplicate email registration
- `409` on duplicate batch code

### Tools
Use **Bruno** (bruno.app), **Postman**, or `curl` scripts.
The Swagger UI at `/api-docs` lists all endpoints with try-it-out functionality.
