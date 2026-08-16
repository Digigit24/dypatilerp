# V4 feature plan — submissions restructure, onboarding, semester/milestone controls

Planning doc only — nothing here is implemented yet. Grounded in an actual audit of the current
frontend (`src/pages/admin/*`, `src/layouts/StudentLayout.jsx`, `src/components/shared/StudentProfileView.jsx`)
and backend (`backend/src/db/schema.sql`, `backend/src/db/alter.js`, `backend/src/modules/{targets,batches,notifications}/*`),
cross-checked against the live Neon `development` branch.

## 0. Two things the audit found that change the plan

1. **The current "Milestones" tab is wired to the wrong backend.** `StudentProfileView.jsx`'s
   `progress` tab calls `progressReportService.js` → `GET /progress-reports`, which is the
   *legacy* compatibility view left behind when `progress_reports` was renamed to `targets`
   (per `documentation/SOP-V2.html` §2.1). The real, current, fully-built targets module
   (`backend/src/modules/targets/*` — list/get/create/bulk-create/progress-summary, semester-scoped,
   **not** flag-gated, `V2_SUBMISSIONS` doesn't exist anywhere in the codebase) is never called from
   this tab. Rebuilding the Milestones subtab means rewiring it to `/api/targets`, not just
   relabeling it.
2. **The semester-advance and bulk-milestone-create backend already exist and work.**
   `POST /batches/:id/advance-semester` and `POST /targets/bulk` are both real, tested endpoints
   with no frontend caller anywhere (`batchService.js` has no `advanceSemester` function at all).
   The Admin Wizard asks (#2, #3 below) are **frontend-only** work, not full-stack builds.

## 1. Tabs restructure — admin student detail + student "My Profile"

**Where**: single shared component `src/components/shared/StudentProfileView.jsx` (used by both
`StudentProfilePage.jsx` admin view and `student/ProfilePage.jsx`, via `isAdminView` prop) — one
change covers both surfaces.

**Change**: collapse the current `reports` / `submissions` / `progress` tabs into one `submissions`
tab with three subtabs:
- **Progress Reports** — same as today's `reports` tab (`submissions` where `type=progress_report`).
- **Assignments** — new; today this data is only visible mixed into the generic `submissions` tab.
  Filter to `type=assignment`.
- **Milestones** — rewired to `/api/targets` + `/api/targets/progress-summary` (see §0.1), not the
  legacy endpoint.

No migration needed — this is a frontend restructure plus one backend rewire (point the Milestones
subtab at the right, already-existing API).

## 2. Admin Wizard — milestones per semester

**Backend**: none needed. `POST /targets/bulk` already accepts a semester + batch and creates
targets across all (or a subset of) active scholars in one call.

**Frontend**: new Wizard step or section — pick batch → pick semester → add N target rows
(name, description, due date, mandatory y/n, order) → submit via `bulk-create`. `targets.schema.js`
requires `semester` on every create, so the UI must always know which semester it's creating for.

## 3. Admin Wizard — current semester + advance semester

**Backend**: none needed, `POST /batches/:id/advance-semester` already does the right thing —
bumps `batch_enrollments.current_semester` (whole batch or a given subset), warns (never blocks) on
open targets/unpaid fees for the semester being left, and opens the next progress-report cycle.

**Frontend**: add `advanceSemester()` to `src/api/services/batchService.js` (currently missing
entirely), then a small UI (Wizard or `BatchesPage.jsx`) that: shows the batch's current semester
(read as the enrollments' semester — in practice uniform across a batch), and a "Start next
semester" action that calls the endpoint and surfaces the warnings it returns (open
targets/unpaid fees) before confirming.

*Note*: semester lives per-enrollment, not per-batch — there's no single "batch.current_semester"
column. If you want batches to ever have genuinely mixed semesters (e.g. one late scholar), the UI
should say "23 of 23 scholars on Semester 1" rather than assume a single number; if you want it to
always be uniform, the endpoint already enforces that by default (bumps everyone together).

## 4. Milestones subtab — progress against the batch's *current-semester* milestone count

**Backend check needed**: confirm whether `GET /targets/progress-summary` already scopes to the
scholar's current semester, or returns an all-time count. If it's all-time, this needs a small
service change to filter targets by `semester = batch_enrollments.current_semester` for that
scholar's batch before computing the fraction. Small, isolated backend change — not a migration.

## 5. Student profile — personal info + uploads + documents (biggest item, needs a migration)

**Confirmed via audit: none of this exists today.** `users` has only `first_name, last_name, phone,
avatar_url` (plus `email`). `research_profiles` holds bio/publications/skills, nothing like
father's/mother's name or documents. The generic file table (`videos`) has no way to attach a file
to a bare user profile — every row requires a `course_id`/`batch_id`/`assignment_id`/`submission_id`.
This is genuinely new, not an extension of a partial feature.

**Proposed migration** (additive-only, matching the rest of this codebase's migration philosophy):

```sql
-- New table: one row per student, holds the fields that don't belong on `users`
-- (auth/account identity) or `research_profiles` (research content).
CREATE TABLE student_profile_details (
  user_id            UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  father_name        VARCHAR(255),
  mother_name        VARCHAR(255),
  date_of_birth      DATE,
  postal_address     TEXT,
  blood_group        VARCHAR(8),
  onboarding_completed_at TIMESTAMP,   -- NULL = not yet onboarded; drives the gate (§7) and the
                                        -- admin scholar-list flag (§8)
  created_at         TIMESTAMP DEFAULT NOW(),
  updated_at         TIMESTAMP DEFAULT NOW()
);

-- Reuse `videos` for the file uploads/documents instead of a new table — it already has
-- `slot`, `mime_type`, `object_key`, `upload_status`. Just needs a way to hang off a bare user.
ALTER TABLE videos ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id);
-- slot values to add to the app-layer enum (no DB enum change needed, `slot` is already varchar):
--   uploads:   cv, research_proposal, publications_list, research_statement
--   documents: passport, aadhar_card, pan_card, marksheet_graduation,
--              marksheet_postgraduation, phd_result, photo
```

Each slot is "current file for this user" (upload replaces, doesn't version) — matches how the
existing generic `CERT_TYPES` block in `StudentProfileView.jsx` already behaves, just with a real
API behind it instead of local-only state (the audit found the current Certificates & Documents
block has no real upload/API wiring — it needs to be built for real, not just relabeled).

**New endpoints needed**: `PUT /students/:userId/profile-details` (the info fields),
`POST /students/:userId/documents/:slot` (upload, replaces existing), `GET /students/:userId/documents`
(list current state of all slots, for both the profile page and the onboarding gate to check
completeness).

## 6. Student sidenav reorder

Current (`StudentLayout.jsx`, 9-10 flat items): Dashboard → Assignments → My Submissions → Formats
→ Progress Reports → Fees → My Profile → Research Profile → (Lectures) → Notifications.

Requested: Dashboard, Submissions, Formats, My Profile, Notifications — 5 items. This drops
Assignments/My Submissions/Progress Reports (correctly, they fold into Submissions per §1).

**Decided**: Fees and Research Profile fold into **My Profile** as subsections/tabs rather than
disappearing or keeping their own top-level nav slot — so `StudentProfileView.jsx` gains two more
tabs (or a "Fees" and "Research" section within the existing profile tabs) alongside the personal
info/uploads/documents from §5.

## 7. Onboarding gate

Depends on §5 existing first (the gate checks exactly those fields/documents). Proposed logic:
- On login, if `student_profile_details.onboarding_completed_at IS NULL`, redirect to a
  profile-completion flow; hide the rest of the sidenav (route guard, not just UI hiding — a
  direct URL hit to `/student/dashboard` must also redirect).
- Required set = all 8 info fields + all 4 uploads + all 7 documents from §5, unless you want some
  optional (worth deciding explicitly rather than guessing).
- On save, validate completeness server-side too (don't trust the client), stamp
  `onboarding_completed_at = NOW()`, unlock.

**Decided**: require it from everyone, including the 23 already-enrolled Dec 2025 scholars — no
backfill of `onboarding_completed_at`. They will be gated on next login until they complete the
full profile + upload all documents. Give them a heads-up (email/notification) before this ships
so it isn't a surprise mid-semester lockout.

## 8. Scholar list + drawer metadata (admin)

`StudentsPage.jsx` already returns `submissions_count` and `progress_reports_count` per scholar
(seen in this session's earlier work on that page). Add: `assignments_count`, `milestones_count`
(scoped to current semester per §4), and `onboarding_completed` (boolean, from §5's new column) —
surfaced both as a column/badge in the list and in the row's detail drawer.

## 9. Notifications — separate track

A dedicated audit + replacement plan is running as its own Orca task
(`documentation/NOTIFICATIONS-AUDIT-PLAN.md`, branch `feature/notifications-audit`) — confirmed via
this session's own investigation that delivery is a 60-second `setInterval` poll
(`notify.service.js` `startNotificationWorker`), and mark-all-read's handler looks correct on
inspection (properly scoped, no obvious bug) — so that part may just need frontend verification
once the full audit lands.

## 10. Merged Assignments/Submissions/Approvals page — pitch given in chat, not planned here in detail

## 11. Submissions preview page — plan given in chat (react-pdf + server-side PPTX→PDF conversion,
document-left/feedback-right layout, one route reused from all three subtabs)

---

## Suggested dependency order (not a mandate — you're picking the actual order)

```
§5 (profile migration) ──┬──> §7 (onboarding gate)
                          └──> §8 (scholar metadata: onboarding_completed)
§1 (tabs restructure) ──────> depends on §0.1 fix (rewire Milestones to /api/targets)
§4 (milestone progress) ────> depends on §1 (needs the Milestones subtab to exist) + §0.1
§2, §3 ─────────────────────> fully independent, lowest effort (frontend-only, backend exists)
§6 (sidenav) ────────────────> depends on §1 landing first, and the Fees/Research Profile decision
```
