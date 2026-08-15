# CLAUDE.md — DYPERF ERP working agreement

Guidance for Claude Code (and any developer) working in this repository.
Read this before changing anything. It records the decisions that are easy to
break by accident.

---

## 1. What this is

React SPA + Express API + PostgreSQL (Neon) running the **Applied Business
Research / Post-Doctoral Fellowship** programme for Dr. D. Y. Patil Education
and Research Foundation.

| Layer | Where | Notes |
|---|---|---|
| Frontend | `src/` | React 18, Vite, Tailwind v4, React Router v6, Zustand |
| Backend | `backend/src/` | Express ESM, modular `routes / controller / service` |
| Database | `backend/src/db/` | `schema.sql` + incremental `alter.js` |
| Docs | `documentation/` | `SOP.html` (current state), `SOP-V2.html` (roadmap) |

**Start here:**
- `documentation/SOP.html` — how the system works today, per role, plus the V1 gap audit.
- `documentation/SOP-V2.html` — the approved V2 roadmap. Build against this.
- `documentation/diagnostics/audit-submissions.sql` — read-only production audit.

---

## 2. THIS APP IS LIVE

Real scholars are enrolled in **Batch Dec 2025** and have submitted real work.

**Non-negotiable rules:**

1. **Never delete data.** No `DROP TABLE`, no `DROP COLUMN`, no `DELETE FROM`
   in a migration. Hide rows with a flag; never remove them.
2. **Migrations are additive only.** Add columns, add tables, add indexes.
   To retire something, leave a compatibility view behind and remove it a
   release later.
3. **Run the verifier before and after every migration.**

   ```
   cd backend
   npm run db:verify:save   # BEFORE — captures the baseline
   npm run db:alter         # the migration
   npm run db:verify        # AFTER — proves nothing was lost
   ```

   Every count must be equal or higher. A count that DROPS means data was
   destroyed — stop and restore the Neon branch. `documentation/diagnostics/
   audit-submissions.sql` gives the same picture row by row.
4. **Take a Neon branch before any schema change.**
5. **Never `git add -A`.** See §7 — the working tree shows hundreds of phantom
   line-ending modifications. Stage explicit paths only.

---

## 3. Disabled features

### 3.1 Video — DISABLED

Video upload, video streaming and the Lectures module are switched off.
There is no video content and none is expected in the near term. Documents are
completely unaffected — formats, submission attachments and the media library
all still work for PDF / PPT / DOCX / images.

**How it is switched off**

| Layer | Flag | Default | File |
|---|---|---|---|
| Backend | `VIDEO_UPLOADS_ENABLED` | `false` | `backend/src/config/env.js` |
| Frontend | `VITE_FEATURE_VIDEO` | `false` | `src/lib/features.js` |

**What the flags actually do**

- Backend refuses any upload whose content type starts with `video/` with
  `422 VIDEO_DISABLED` — in `proxyUpload`, `requestUploadUrl`, and when
  registering a media row via `POST /videos`. The API is the authority; the UI
  flag is only there so users never see a control that would fail.
- Frontend hides the scholar **Lectures** nav item, redirects
  `/student/lectures/*` to the dashboard and `/admin/lectures/:id` back to the
  library, relabels the staff **Media** item to **Documents**, hides the
  video/audio type filter chips, sets an `accept` list on the file input, and
  refuses video/audio files on both drop targets with a toast.

**What was deliberately left in place**

- `SecureVideoPlayer.jsx`, `LecturePlayerPage.jsx`, `LecturesGalleryPage.jsx`,
  `AdminLectureDetailPage.jsx`, the `videos` table, `video_sessions`,
  `video_watch_logs`, and the streaming/session endpoints.
- Nothing was deleted. The `videos` table remains the media table for **all**
  file types — the name is historical, it is not video-only.

**To revive video later**

1. Set `VIDEO_UPLOADS_ENABLED=true` in the backend env.
2. Set `VITE_FEATURE_VIDEO=true` in the frontend env and rebuild.
3. Verify ffmpeg is available on the host (thumbnails and duration probing).
4. Re-test the streaming path — it now reads from Zata first (see §4).

Both flags are required. Setting only the frontend one produces a UI that
fails with 422 on upload.

---

## 4. Storage — Zata is the single source of truth

**Rule: a media row must never exist without a verified object behind it.**

Uploads go to Zata synchronously, are HEAD-verified, and only then reported as
successful. If Zata fails, the request fails with `502` and nothing is written
to the database.

Local disk (`backend/storage/`) is an **optional read cache**, controlled by
`STORAGE_LOCAL_CACHE` (default `false`). It can be wiped at any moment with no
consequence. Do not reintroduce a local-first write path.

> **History — why this rule exists.** The original `proxyUpload` wrote to local
> disk first and pushed to Zata as unawaited background work whose failure was
> only a `console.warn`. Reads checked local disk first. On a host with an
> ephemeral filesystem the file disappeared on the next deploy while the
> database row still claimed it existed. That is the "it stores but it won't
> fetch" bug. `uploadSubmissionAttachment` always did it correctly — awaiting
> the upload and rolling back the object on a DB failure — which is why
> submission attachments worked while the media library did not.

**Also fixed:** `videos.controller.js` used `crypto.randomUUID()` without
importing `crypto`. Global Web Crypto is only unflagged from Node 19, and
`package.json` declares `"node": ">=18"` — on Node 18 that threw a
`ReferenceError` on **every** submission attachment upload, surfacing in the UI
as "Upload failed". `crypto` is now imported explicitly. Keep it that way.

**Still to build** (see `SOP-V2.html` §M7): course/batch/semester folder
taxonomy, nightly reconciliation job, orphan sweep, and the per-course storage
usage dashboard that backs client billing.

---

## 5. The V2 submission model

There are **three** kinds of submission. They behave differently. Do not
collapse them back into one code path.

| | Assignment | Progress Report | Target |
|---|---|---|---|
| Approval | **None** — submit is terminal | **3-layer chain** | **Single approver** |
| Files | Many, mixed types | Exactly 2 named slots: PDF + PPT | One or more |
| Feedback | None | Document-style, per stage | Short, on approve/reject |
| Cadence | Many per semester | One per semester (6-monthly) | Several per semester |
| Drives | Pending/submitted/overdue counts | Semester review record | Completion percentage |

**Naming:** "Milestone" is retired. It is **Target** everywhere — labels,
routes, emails, column headings, permission modules.

**Workflow selection** comes from `batches.approval_config`, which is per-kind
in v2. Production batches still carry the v1 shape (`{ stages: [...] }`) —
always read it through `readWorkflow()` in
`backend/src/modules/submissions/workflow.js`, never directly.

**The default target approver is the COORDINATOR** (decided 2026-08-15). A
guide-typed stage would silently stall for any scholar without a guide assigned.
Override per batch via `approval_config.target.approver`.

**`V2_SUBMISSIONS` (default false)** gates ONE thing: whether assignments stop
creating an approval chain. Targets always use their own single-approval flow
regardless. Turn the flag on in Phase 3, not before.

**`workflow_kind` is snapshotted onto the submission at submit time.** Changing
a batch's config must never rewrite the rules of a submission already in flight.

---

## 6. Conventions

**Backend**
- Route files declare permissions via `requirePermission(module, action)`.
  RBAC is scoped: `all` / `course` / `batch` / `own`. Use the `scopeBatchSQL`
  and `scopeCourseSQL` helpers on any list endpoint.
- Services return plain data. Controllers shape responses via `utils/response.js`.
- Every successful create/update/delete is audit-logged globally — don't
  hand-roll audit writes.
- Validation with Zod in `*.schema.js`, applied via the `validate` middleware.

**Frontend**
- Permissions are mirrored in `permStore` and **fail closed** — nothing renders
  until grants load. Never add a fallback that shows restricted UI while loading.
- Use design-system classes (`.card`, `.btn-primary`, `.input`, `.soft-panel`),
  not inline layout styles.
- Feature flags live in `src/lib/features.js`. Add new ones there, not inline.
- User-facing wording goes through `labelStore` so it stays configurable
  (this is how Student → Scholar works).

**When adding a permission module:** seed it in `backend/src/db/seed.js` **and**
grant it to the existing roles in the same migration. Renaming a module without
copying its `role_permissions` rows locks every coordinator out of that screen —
this is the single easiest thing to break.

---

## 7. Repository gotchas

- **Line endings.** The working tree reports ~270 files as modified purely from
  CRLF/LF differences. `git add -A` would commit a repo-wide churn that buries
  every real change. **Always stage explicit paths.**
- **Branch.** Active work is on `codex/newui`.
- **`schema.sql` has drifted.** Assignments, formats, media folders,
  `app_settings`, `notification_queue`, `submission_remarks` and several enum
  values exist only via `alter.js`. A fresh install from `schema.sql` alone is
  incomplete. Run `npm run db:migrate && npm run db:alter && npm run db:seed`.
- **Node version.** Use Node 20 or newer on the backend host. `package.json`
  now declares `>=20` — Node 18 lacks the unflagged global Web Crypto that this
  codebase relies on.
- **`targets` vs `progress_reports`.** After migration `targets` is the real
  table and `progress_reports` is a compatibility **view** over it, created with
  `SELECT *` at rename time — so it deliberately exposes only the legacy columns.
  New code must query `targets`. The view is removed in Phase 7.
- **`uq_sub_cycle` may be skipped.** The migration refuses to create the
  duplicate guard while split/duplicate progress reports still exist, and says
  so in its output rather than aborting. Merge first, then re-run `db:alter`.

---

## 8. Roadmap position

Phases are defined in `documentation/SOP-V2.html` §7.

- [x] **Phase 0 — Stop the bleeding.** `crypto` import fixed; uploads now block
      on Zata and fail loudly; read path reads Zata first; video disabled behind
      flags; diagnostics SQL published.
- [x] **Phase 1 — Schema.** Additive DDL + backfill landed in `alter.js` block 25:
      `progress_reports` renamed to `targets` behind a compatibility view,
      `progress_report_cycles` created, `submissions` gained `cycle_id` /
      `target_id` / `workflow_kind` / merge bookkeeping, media gained file slots
      and taxonomy keys, approvals gained document-style feedback, `targets` and
      `storage` permission modules seeded with every `progress_reports` grant
      mirrored across. Behaviour-neutral — nothing reads the new columns yet.
- [~] **Phase 2 — Targets.** Backend complete: `/api/targets` (list, get, create,
      bulk-create-across-batch, update, delete, progress-summary), single-approval
      flow wired through `workflow.js`, target decision applied from the approvals
      service, derived completion percentage. Frontend service layer shipped;
      **admin + scholar UI still to build.**
- [ ] **Phase 3 — Assignments.** Remove approval, multi-file, preview, full page.
- [ ] **Phase 4 — Progress reports.** Cycles, two slots, document feedback, merge.
- [ ] **Phase 5 — Storage platform.** Taxonomy, reconciliation, usage dashboard.
- [ ] **Phase 6 — IA / UX.** Scholar hub, sidebar reduction, drawers.
- [ ] **Phase 7 — Cleanup.** Retire compatibility shims.

Open questions blocking Phase 4 are listed in `SOP-V2.html` §11.
