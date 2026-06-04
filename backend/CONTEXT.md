# Backend Context — DY Patil ERP

## Project Overview
REST API for the **Applied Business Research Fellowship Program** ERP system.
Multi-course, multi-batch fellowship management with RBAC, multi-stage approvals, fee tracking, and research profiles.

## Tech Stack
| Layer | Choice |
|---|---|
| Runtime | Node.js 18+ (ESM) |
| Framework | Express 4.x |
| Database | PostgreSQL via Neon (serverless) |
| Auth | JWT (access 7d + refresh 30d) |
| Validation | Zod |
| API Docs | swagger-jsdoc + swagger-ui-express |
| DB Driver | pg (node-postgres) |

## Folder Structure
```
backend/src/
├── app.js               # Express app (middleware + routes)
├── server.js            # Entry point (DB check + listen)
├── config/
│   ├── env.js           # Env validation
│   ├── database.js      # pg Pool (Neon)
│   └── swagger.js       # OpenAPI spec config
├── middleware/
│   ├── auth.js          # JWT authenticate + optionalAuth
│   ├── rbac.js          # requirePermission(module,action) + requireRole(...names)
│   ├── validate.js      # validate(zodSchema)
│   └── errorHandler.js  # Global error + 404
├── utils/
│   ├── response.js      # ok/created/paginated/notFound/etc helpers
│   ├── asyncHandler.js  # asyncHandler(fn) wrapper
│   └── pagination.js    # getPagination / buildPaginationMeta
├── db/
│   ├── schema.sql       # FULL database DDL (all tables, enums, indexes)
│   ├── migrate.js       # Run schema.sql against Neon
│   └── seed.js          # Seed roles, permissions, admin user, sample course
└── modules/             # Feature modules (routes + controller + service + schema)
    ├── auth/
    ├── users/
    ├── roles/
    ├── courses/
    ├── batches/
    ├── applicants/
    ├── students/
    ├── tests/
    ├── submissions/
    ├── approvals/
    ├── progress-reports/
    ├── fees/
    ├── notifications/
    ├── research-profiles/
    └── dashboard/
```

## Database Schema — Key Tables
| Table | Purpose |
|---|---|
| `users` | All user accounts |
| `roles` | admin, coordinator, academic_guide, industry_mentor, student, applicant |
| `permissions` | module × action matrix (create/read/update/delete per module) |
| `role_permissions` | many-to-many role ↔ permission |
| `user_roles` | user ↔ role, optionally scoped to course_id / batch_id |
| `courses` | Program/course catalog (one course = many batches) |
| `batches` | Cohorts per course (upcoming/active/completed) |
| `batch_enrollments` | Students enrolled in a batch |
| `applicants` | Application pipeline (submitted → shortlisted → enrolled) |
| `tests` | Entrance & assessment tests |
| `test_questions` | Questions (mcq, short_answer, long_answer, true_false, file_upload) |
| `test_attempts` | Test sessions per user |
| `test_responses` | Per-question answers |
| `submissions` | Research submissions (draft → submitted → approved) |
| `approvals` | Multi-stage chain: coordinator → academic_guide → industry_mentor |
| `progress_reports` | Module-level progress tracking per semester |
| `fees` | Semester fee records per student |
| `fee_payments` | Payment entries against a fee |
| `research_profiles` | Academic profile, slug for public URL |
| `publications` | Research publications per user |
| `notifications` | Broadcast notifications |
| `notification_recipients` | Per-user delivery + read status |
| `audit_logs` | Action audit trail |

## API Structure
Base URL: `/api`
Swagger UI: `/api-docs`

| Prefix | Module |
|---|---|
| `/api/auth` | Login, register, refresh, logout, me |
| `/api/users` | CRUD + role assignment |
| `/api/roles` | Roles + permissions management |
| `/api/courses` | Course CRUD + centralised dashboard |
| `/api/batches` | Batch CRUD + students/stats sub-routes |
| `/api/applicants` | Application pipeline + convert-to-student |
| `/api/students` | Enrolled students + guide assignment |
| `/api/tests` | Test builder, questions, attempt, submit |
| `/api/submissions` | Create draft, update, submit for review |
| `/api/approvals` | Action on pending approvals |
| `/api/progress-reports` | Module progress CRUD |
| `/api/fees` | Fee records + payment recording |
| `/api/notifications` | Send + mark-read |
| `/api/research-profiles` | Profile upsert + publications |
| `/api/dashboard` | Admin, student, per-course dashboards |

## RBAC System
- `requirePermission(module, action)` — checks `user_roles → role_permissions → permissions`
- `requireRole(...names)` — quick role name check from JWT payload
- Roles scoped optionally to `course_id` or `batch_id` in `user_roles`
- Admin has ALL permissions (seeded in `seed.js`)

## Key Business Rules
1. **Applicant → Student**: `POST /api/applicants/:id/convert` creates user (if not exists), enrollment record, assigns student role
2. **Submission flow**: draft → submitted (creates 3 approval records) → under_review → approved/needs_revision/rejected
3. **Approval chain**: coordinator (order 1) → academic_guide (order 2) → industry_mentor (order 3). Each `approve` advances; final approve sets submission to `approved`
4. **Multi-batch per course**: One course has many batches; course dashboard aggregates all batch data
5. **Fee payment**: Payment recorded → sum checked against fee amount → auto-mark `paid` if fully paid

## Setup Commands
```bash
cd backend
cp .env.example .env          # Fill in DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
npm install
npm run db:migrate             # Run schema.sql against Neon
npm run db:seed                # Seed roles, permissions, admin user
npm run dev                    # Start with nodemon
```

## Environment Variables
See `.env.example`. Required: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`

---

## Task List

### Phase 1 — Foundation ✅ DONE
- [x] Project scaffold (ESM, package.json)
- [x] Database config (pg Pool → Neon)
- [x] Auth middleware (JWT verify)
- [x] RBAC middleware (permission + role guards)
- [x] Zod validation middleware
- [x] Global error handler
- [x] Response helpers
- [x] Pagination utilities
- [x] Complete DB schema (schema.sql)
- [x] DB migration script
- [x] DB seed script (roles, permissions, admin)
- [x] Swagger config

### Phase 2 — Core Modules ✅ DONE
- [x] Auth module (login, register, refresh, logout, me)
- [x] Users module (CRUD + role assignment)
- [x] Roles module (list, permission management)
- [x] Courses module (CRUD + course dashboard)
- [x] Batches module (CRUD + students + stats)
- [x] Applicants module (pipeline + bulk convert)
- [x] Students module (list + profile + guide assignment)
- [x] Tests module (builder + questions + attempt + submit)
- [x] Submissions module (draft/submit/review cycle)
- [x] Approvals module (pending + action)
- [x] Progress Reports module
- [x] Fees module (create + payment recording)
- [x] Notifications module (send + mark read)
- [x] Research Profiles module (upsert + publications)
- [x] Dashboard module (admin + student + per-course)

### Phase 3 — Polish & Integration ⬜ TODO
- [ ] Wire frontend `src/api/config.js` to use `USE_MOCK = false` + set `BASE_URL = http://localhost:5000/api`
- [ ] Update all `src/api/services/*.js` to use real REST endpoints
- [ ] File upload support (multer or presigned S3/Cloudinary URLs)
- [ ] Email notifications (Nodemailer or Resend) for status changes
- [ ] Password reset flow (forgot-password / reset-password endpoints)
- [ ] Audit log middleware (auto-log create/update/delete)
- [ ] Input sanitization (strip HTML from content fields)
- [ ] Tests (Vitest or Jest unit tests for services)
- [ ] API integration tests (Supertest)
- [ ] Docker Compose setup (optional, Neon is serverless)
- [ ] Deploy to Railway / Render / Heroku

### Phase 4 — Advanced Features ⬜ TODO
- [ ] WebSocket / SSE for real-time notification delivery
- [ ] Bulk notification by batch (notify all students in a batch)
- [ ] CSV export for students, fees, applicants
- [ ] Analytics: monthly submission trends, cohort progress charts
- [ ] Test auto-grading for MCQ/true-false question types
- [ ] Multi-tenancy: isolate data per institution
