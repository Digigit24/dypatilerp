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
