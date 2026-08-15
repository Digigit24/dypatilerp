-- ═══════════════════════════════════════════════════════════════════════════
--  DYPERF ERP — Submission placement audit  (100% READ-ONLY)
--  Purpose: answer "where did each student actually submit, and is it correct?"
--  Safety : contains ONLY SELECT statements. Nothing is created, updated or
--           deleted. Safe to run against production. Paste into the Neon SQL
--           editor and run block by block.
--  Run before ANY V2 migration and keep the output as the pre-migration record.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. THE MASTER PICTURE ─────────────────────────────────────────────────
-- Every submission, what type it claims to be, whether it is actually linked
-- to an assignment, how many files it carries, and where it sits in approval.
SELECT
  u.first_name || ' ' || u.last_name          AS student,
  u.email,
  b.name                                       AS batch,
  s.semester,
  s.submission_type,
  s.title,
  s.status,
  s.assignment_id,
  a.title                                      AS linked_assignment_title,
  CASE
    WHEN s.submission_type = 'assignment'      AND s.assignment_id IS NOT NULL THEN 'OK — assignment, properly linked'
    WHEN s.submission_type = 'assignment'      AND s.assignment_id IS NULL     THEN 'MISPLACED — typed assignment but linked to nothing'
    WHEN s.submission_type = 'progress_report' AND s.assignment_id IS NOT NULL THEN 'MISPLACED — progress report filed against an assignment'
    WHEN s.submission_type = 'progress_report' AND s.assignment_id IS NULL     THEN 'OK — free-standing progress report'
    ELSE 'REVIEW — other type: ' || s.submission_type
  END                                          AS placement_verdict,
  jsonb_array_length(COALESCE(s.file_urls,'[]'::jsonb)) AS files_in_descriptor,
  (SELECT COUNT(*) FROM videos v
     WHERE v.submission_id = s.id AND v.upload_status = 'ready')::int AS files_in_storage,
  (SELECT COUNT(*) FROM approvals ap WHERE ap.submission_id = s.id)::int AS approval_stages,
  (SELECT COUNT(*) FROM approvals ap WHERE ap.submission_id = s.id AND ap.status='pending')::int AS stages_pending,
  s.submitted_at,
  s.created_at
FROM submissions s
JOIN users   u ON u.id = s.student_user_id
JOIN batches b ON b.id = s.batch_id
LEFT JOIN assignments a ON a.id = s.assignment_id
ORDER BY b.name, u.last_name, s.submission_type, s.created_at;


-- ─── 2. THE SPLIT-REPORT PROBLEM ───────────────────────────────────────────
-- V2 says ONE progress report = ONE submission holding TWO files (PDF + PPT).
-- Today students filed the report and the slides as two separate submissions.
-- This groups them so you can see exactly which rows must be merged.
SELECT
  u.first_name || ' ' || u.last_name AS student,
  b.name                              AS batch,
  s.semester,
  COUNT(*)                            AS progress_report_rows,
  STRING_AGG(s.title, '  ||  ' ORDER BY s.created_at) AS titles,
  STRING_AGG(s.id::text, ',' ORDER BY s.created_at)   AS submission_ids,
  CASE WHEN COUNT(*) > 1
       THEN 'MERGE CANDIDATE — these rows are one report split across ' || COUNT(*) || ' submissions'
       ELSE 'single row' END          AS action
FROM submissions s
JOIN users   u ON u.id = s.student_user_id
JOIN batches b ON b.id = s.batch_id
WHERE s.submission_type = 'progress_report'
GROUP BY u.id, u.first_name, u.last_name, b.name, s.semester
ORDER BY COUNT(*) DESC, student;


-- ─── 3. TRUE DUPLICATES ────────────────────────────────────────────────────
-- Same student, same batch, same semester, same title, more than once.
-- These are re-submits caused by the missing one-per-cycle guard.
SELECT
  u.first_name || ' ' || u.last_name AS student,
  b.name AS batch, s.semester, s.title, s.submission_type,
  COUNT(*)                                            AS copies,
  STRING_AGG(s.id::text || ' [' || s.status || ' ' ||
             COALESCE(to_char(s.submitted_at,'DD Mon YYYY'),'not submitted') || ']',
             '  |  ' ORDER BY s.created_at)           AS each_copy,
  'KEEP the latest with files + approvals; ARCHIVE the rest (never DELETE)' AS recommendation
FROM submissions s
JOIN users   u ON u.id = s.student_user_id
JOIN batches b ON b.id = s.batch_id
GROUP BY u.id, u.first_name, u.last_name, b.name, s.semester, s.title, s.submission_type
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;


-- ─── 4. EMPTY / ABANDONED DRAFTS ───────────────────────────────────────────
-- Drafts with no file attached. A progress report can never be submitted
-- without a file, so these are dead rows a student left behind.
SELECT
  u.first_name || ' ' || u.last_name AS student, u.email,
  b.name AS batch, s.submission_type, s.title, s.status, s.created_at,
  'Safe to hide from the student UI; retain in DB for audit' AS recommendation
FROM submissions s
JOIN users   u ON u.id = s.student_user_id
JOIN batches b ON b.id = s.batch_id
WHERE s.status = 'draft'
  AND jsonb_array_length(COALESCE(s.file_urls,'[]'::jsonb)) = 0
  AND NOT EXISTS (SELECT 1 FROM videos v WHERE v.submission_id = s.id)
ORDER BY s.created_at;


-- ─── 5. STALLED APPROVALS (the V1 G-03 failure mode) ───────────────────────
-- Submissions sitting in a stage nobody can act on, because the stage has no
-- resolved reviewer AND no role fallback — usually a missing guide assignment.
SELECT
  u.first_name || ' ' || u.last_name AS student,
  s.title, s.submission_type, s.status AS submission_status,
  ap.stage, ap.order_index, ap.status AS stage_status,
  ap.reviewer_user_id, ap.reviewer_role,
  CASE WHEN ap.reviewer_user_id IS NULL AND ap.reviewer_role IS NULL
       THEN 'STALLED — no reviewer and no role fallback; invisible to every queue'
       WHEN ap.reviewer_user_id IS NULL
       THEN 'OPEN TO ROLE — any holder of ' || ap.reviewer_role || ' can act'
       ELSE 'ASSIGNED' END AS diagnosis,
  ap.created_at,
  NOW()::date - ap.created_at::date AS days_open
FROM approvals ap
JOIN submissions s ON s.id = ap.submission_id
JOIN users u ON u.id = s.student_user_id
WHERE ap.status = 'pending'
ORDER BY days_open DESC;


-- ─── 6. GUIDE COVERAGE ─────────────────────────────────────────────────────
-- Which enrolled scholars have no academic guide / no industry mentor. These
-- are the accounts whose next submission WILL stall.
SELECT
  u.first_name || ' ' || u.last_name AS scholar, u.email,
  b.name AS batch, be.enrollment_number, be.current_semester, be.status,
  COUNT(*) FILTER (WHERE sg.guide_type = 'academic' AND sg.is_active)::int AS academic_guides,
  COUNT(*) FILTER (WHERE sg.guide_type = 'industry' AND sg.is_active)::int AS industry_mentors,
  CASE WHEN COUNT(*) FILTER (WHERE sg.guide_type='academic' AND sg.is_active) = 0
         OR COUNT(*) FILTER (WHERE sg.guide_type='industry' AND sg.is_active) = 0
       THEN 'AT RISK — assign guides before the next submission'
       ELSE 'covered' END AS verdict
FROM batch_enrollments be
JOIN users u   ON u.id = be.user_id
JOIN batches b ON b.id = be.batch_id
LEFT JOIN student_guides sg ON sg.student_user_id = be.user_id AND sg.batch_id = be.batch_id
WHERE be.status = 'active'
GROUP BY u.id, u.first_name, u.last_name, u.email, b.name,
         be.enrollment_number, be.current_semester, be.status
ORDER BY verdict, scholar;


-- ─── 7. STORAGE INTEGRITY ──────────────────────────────────────────────────
-- Every media row, whether it is bound to a submission, and whether the
-- submission's file_urls descriptor agrees with it. Mismatches here are the
-- "stored but won't fetch" class of bug.
SELECT
  v.id AS media_id, v.title, v.media_type, v.mime_type, v.upload_status,
  v.visibility, v.object_key, v.file_size,
  v.submission_id,
  CASE
    WHEN v.object_key IS NULL THEN 'BROKEN — media row with no object key'
    WHEN v.upload_status IS DISTINCT FROM 'ready' THEN 'PENDING — never confirmed ready'
    WHEN v.submission_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM submissions s2
      WHERE s2.id = v.submission_id
        AND s2.file_urls @> jsonb_build_array(jsonb_build_object('media_id', v.id::text))
    ) THEN 'ORPHAN — file in storage but not listed on its submission'
    ELSE 'ok'
  END AS integrity,
  v.created_at
FROM videos v
ORDER BY (v.upload_status IS DISTINCT FROM 'ready') DESC, v.created_at DESC;


-- ─── 8. STORAGE USAGE BY COURSE (the number you bill on) ──────────────────
SELECT
  COALESCE(c.name,'— unassigned —')                 AS course,
  c.code,
  COUNT(*)                                           AS files,
  COUNT(*) FILTER (WHERE v.media_type = 'video')     AS videos,
  COUNT(*) FILTER (WHERE v.media_type = 'document')  AS documents,
  COUNT(*) FILTER (WHERE v.submission_id IS NOT NULL) AS submission_files,
  pg_size_pretty(COALESCE(SUM(v.file_size),0))       AS total_size,
  COALESCE(SUM(v.file_size),0)                       AS total_bytes
FROM videos v
LEFT JOIN courses c ON c.id = v.course_id
GROUP BY c.id, c.name, c.code
ORDER BY total_bytes DESC;


-- ─── 9. ASSIGNMENT COMPLETION (drives the new scholar-list columns) ───────
SELECT
  u.first_name || ' ' || u.last_name AS scholar,
  b.name AS batch, be.current_semester,
  (SELECT COUNT(*) FROM assignments a
     WHERE a.batch_id = be.batch_id AND a.is_published)::int              AS assignments_published,
  (SELECT COUNT(*) FROM submissions s
     JOIN assignments a2 ON a2.id = s.assignment_id
     WHERE s.student_user_id = be.user_id AND a2.batch_id = be.batch_id
       AND s.status <> 'draft')::int                                       AS submitted,
  (SELECT COUNT(*) FROM assignments a
     WHERE a.batch_id = be.batch_id AND a.is_published
       AND NOT EXISTS (SELECT 1 FROM submissions s3
                       WHERE s3.assignment_id = a.id
                         AND s3.student_user_id = be.user_id
                         AND s3.status <> 'draft'))::int                   AS pending,
  (SELECT COUNT(*) FROM assignments a
     WHERE a.batch_id = be.batch_id AND a.is_published
       AND a.due_date < CURRENT_DATE
       AND NOT EXISTS (SELECT 1 FROM submissions s4
                       WHERE s4.assignment_id = a.id
                         AND s4.student_user_id = be.user_id
                         AND s4.status <> 'draft'))::int                   AS overdue
FROM batch_enrollments be
JOIN users u   ON u.id = be.user_id
JOIN batches b ON b.id = be.batch_id
WHERE be.status = 'active'
ORDER BY overdue DESC, pending DESC, scholar;


-- ─── 10. PRE-MIGRATION SNAPSHOT COUNTS ────────────────────────────────────
-- Record these numbers before migrating. Re-run after; every number must
-- match or increase. None may ever decrease.
SELECT 'submissions'            AS entity, COUNT(*) FROM submissions
UNION ALL SELECT 'submissions:assignment',      COUNT(*) FROM submissions WHERE submission_type='assignment'
UNION ALL SELECT 'submissions:progress_report', COUNT(*) FROM submissions WHERE submission_type='progress_report'
UNION ALL SELECT 'approvals',                   COUNT(*) FROM approvals
UNION ALL SELECT 'submission_remarks',          COUNT(*) FROM submission_remarks
UNION ALL SELECT 'progress_reports (old table)',COUNT(*) FROM progress_reports
UNION ALL SELECT 'assignments',                 COUNT(*) FROM assignments
UNION ALL SELECT 'videos (media rows)',         COUNT(*) FROM videos
UNION ALL SELECT 'batch_enrollments',           COUNT(*) FROM batch_enrollments
ORDER BY 1;
