/**
 * Incremental ALTER migrations — safe to run multiple times (IF NOT EXISTS / ON CONFLICT).
 * Run with: node src/db/alter.js
 */
import { pool } from '../config/database.js';
import '../config/env.js';

const DEFAULT_PREFS = JSON.stringify({
  modules: {
    applicants: true,
    students: true,
    batches: true,
    progress: true,
    approvals: true,
    fees: true,
    'test-builder': true,
    notifications: true,
    users: true,
    settings: true,
    courses: true,
    roles: true,
  },
});

const run = async () => {
  const client = await pool.connect();
  try {
    console.log('Running incremental migrations…');

    // 1. Add preferences column to courses
    await client.query(`
      ALTER TABLE courses
      ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '${DEFAULT_PREFS}'
    `);
    console.log('✓  courses.preferences column added (or already exists)');

    // 2. Back-fill existing rows that have NULL preferences
    const { rowCount } = await client.query(`
      UPDATE courses SET preferences = '${DEFAULT_PREFS}'::jsonb
      WHERE preferences IS NULL
    `);
    console.log(`✓  Back-filled ${rowCount} course row(s) with default preferences`);

    // 3. Videos table
    await client.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        course_id    UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        batch_id     UUID REFERENCES batches(id) ON DELETE CASCADE,
        title        VARCHAR(255) NOT NULL,
        description  TEXT,
        duration_sec INTEGER NOT NULL DEFAULT 0,
        object_key   VARCHAR(500) NOT NULL,
        file_size    BIGINT NOT NULL DEFAULT 0,
        thumbnail_key VARCHAR(500),
        sort_order   INTEGER DEFAULT 0,
        uploaded_by  UUID REFERENCES users(id),
        is_published BOOLEAN DEFAULT FALSE,
        created_at   TIMESTAMP DEFAULT NOW(),
        updated_at   TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓  videos table created (or already exists)');

    // 4. Video sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS video_sessions (
        id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        video_id   UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        ip_address VARCHAR(45),
        user_agent TEXT,
        token      VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓  video_sessions table created (or already exists)');

    // 5. Video watch logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS video_watch_logs (
        id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        video_id       UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        watched_ranges JSONB DEFAULT '[]',
        total_watch_sec INTEGER DEFAULT 0,
        last_position  DECIMAL(10,2) DEFAULT 0.0,
        completed      BOOLEAN DEFAULT FALSE,
        updated_at     TIMESTAMP DEFAULT NOW(),
        UNIQUE (user_id, video_id)
      )
    `);
    console.log('✓  video_watch_logs table created (or already exists)');

    // 6. Dynamic approval workflow — approval_config on batches
    await client.query(`
      ALTER TABLE batches
      ADD COLUMN IF NOT EXISTS approval_config JSONB DEFAULT '{"stages": []}'
    `);
    console.log('✓  batches.approval_config column added (or already exists)');

    // 7. Convert approvals.stage from enum → VARCHAR(100) for custom stage names
    await client.query(`
      ALTER TABLE approvals
      ALTER COLUMN stage TYPE VARCHAR(100) USING stage::VARCHAR(100)
    `);
    console.log('✓  approvals.stage converted to VARCHAR(100)');

    // 8. Add reviewer_role column to approvals
    await client.query(`
      ALTER TABLE approvals
      ADD COLUMN IF NOT EXISTS reviewer_role VARCHAR(100)
    `);
    console.log('✓  approvals.reviewer_role column added (or already exists)');

    // 10. Add lectures module to default course preferences
    await client.query(`
      UPDATE courses
      SET preferences = jsonb_set(
        COALESCE(preferences, '{}'::jsonb),
        '{modules,lectures}',
        'true'::jsonb
      )
      WHERE preferences IS NOT NULL
    `);
    console.log('✓  lectures module added to all course preferences');

    // 11. Add preferences JSONB column to users (theme, dark mode, font, etc.)
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'
    `);
    console.log('✓  users.preferences column added (or already exists)');

    // 12. Global app_settings key-value store (Brevo config, etc.)
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key        VARCHAR(100) PRIMARY KEY,
        value      JSONB        NOT NULL DEFAULT '{}',
        updated_at TIMESTAMP    DEFAULT NOW(),
        updated_by UUID         REFERENCES users(id)
      )
    `);
    console.log('✓  app_settings table created (or already exists)');

    // 13. Seed default Brevo settings row (noop if already present)
    await client.query(`
      INSERT INTO app_settings (key, value)
      VALUES ('brevo', '{"apiKey":"","senderName":"DY Patil ERP","senderEmail":"noreply@example.com","enabled":false}')
      ON CONFLICT (key) DO NOTHING
    `);
    console.log('✓  brevo app_settings seed (or already exists)');

    // 14. Media folders (Media Manager)
    await client.query(`
      CREATE TABLE IF NOT EXISTS media_folders (
        id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        course_id  UUID REFERENCES courses(id) ON DELETE CASCADE,
        parent_id  UUID REFERENCES media_folders(id) ON DELETE CASCADE,
        name       VARCHAR(255) NOT NULL,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('\u2713  media_folders table created (or already exists)');

    // 15. Generic media support on videos table
    await client.query(`
      ALTER TABLE videos
      ADD COLUMN IF NOT EXISTS media_type VARCHAR(20) DEFAULT 'video',
      ADD COLUMN IF NOT EXISTS mime_type  VARCHAR(120),
      ADD COLUMN IF NOT EXISTS folder_id  UUID REFERENCES media_folders(id) ON DELETE SET NULL
    `);
    await client.query(`UPDATE videos SET media_type = 'video' WHERE media_type IS NULL`);
    console.log('\u2713  videos media columns added (media_type, mime_type, folder_id)');

    // 16. Random question sampling per section (Test Builder)
    await client.query(`
      ALTER TABLE test_sections ADD COLUMN IF NOT EXISTS pick_count INTEGER
    `);
    await client.query(`
      ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS question_set JSONB
    `);
    console.log('\u2713  test_sections.pick_count + test_attempts.question_set added');

    // 17. Formats module
    await client.query(`
      CREATE TABLE IF NOT EXISTS formats (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        course_id   UUID REFERENCES courses(id) ON DELETE CASCADE,
        batch_id    UUID REFERENCES batches(id) ON DELETE CASCADE,
        title       VARCHAR(255) NOT NULL,
        description TEXT,
        media_id    UUID REFERENCES videos(id) ON DELETE SET NULL,
        created_by  UUID REFERENCES users(id),
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('\u2713  formats table created (or already exists)');

    // 18. Applicant pipeline: shortlisted_test stage
    await client.query(`ALTER TYPE applicant_status ADD VALUE IF NOT EXISTS 'shortlisted_test'`).catch(() => {});
    console.log('\u2713  applicant_status enum: shortlisted_test added');

    // 19. Assignments module
    await client.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        course_id    UUID REFERENCES courses(id) ON DELETE CASCADE,
        batch_id     UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
        title        VARCHAR(255) NOT NULL,
        description  TEXT,
        semester     INTEGER DEFAULT 1,
        due_date     TIMESTAMP,
        is_mandatory BOOLEAN DEFAULT TRUE,
        is_published BOOLEAN DEFAULT TRUE,
        created_by   UUID REFERENCES users(id),
        created_at   TIMESTAMP DEFAULT NOW(),
        updated_at   TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`
      ALTER TABLE submissions ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_submission_per_assignment
      ON submissions (assignment_id, student_user_id) WHERE assignment_id IS NOT NULL
    `);
    console.log('\u2713  assignments table + submissions.assignment_id + uniqueness');

    // 20. UI labels (e.g. Student -> Scholar)
    await client.query(`
      INSERT INTO app_settings (key, value)
      VALUES ('ui_labels', '{"student":"Scholar","studentPlural":"Scholars"}')
      ON CONFLICT (key) DO NOTHING
    `);
    console.log('\u2713  ui_labels app_settings seed');

    // 21. Scoped RBAC: scope column + full permission catalog + default grants
    await client.query(`ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS scope VARCHAR(10) NOT NULL DEFAULT 'all'`);
    await client.query(`
      INSERT INTO permissions (module, action)
      SELECT m.module, a.action::permission_action
      FROM (VALUES ('applicants'),('approvals'),('batches'),('courses'),('dashboard'),
                   ('dashboard_admin'),('dashboard_student'),('fees'),('notifications'),
                   ('progress_reports'),('settings'),('students'),('submissions'),('tests'),
                   ('users'),('roles'),('assignments'),('formats'),('lectures'),('audit_logs')) AS m(module)
      CROSS JOIN (VALUES ('create'),('read'),('update'),('delete')) AS a(action)
      ON CONFLICT (module, action) DO NOTHING
    `);
    // Default grants — seeded only for roles that have NO grants yet,
    // so admin-customised matrices are never overwritten on re-run.
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id, scope)
      SELECT r.id, p.id, 'all' FROM roles r CROSS JOIN permissions p
      WHERE r.name = 'admin' AND NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = r.id)
    `);
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id, scope)
      SELECT r.id, p.id,
        CASE WHEN p.module IN ('students','fees','submissions','approvals','progress_reports','assignments','formats','lectures','notifications') THEN 'batch' ELSE 'course' END
      FROM roles r CROSS JOIN permissions p
      WHERE r.name = 'coordinator'
        AND NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = r.id)
        AND ((p.module IN ('students','fees','submissions','approvals','progress_reports','assignments','formats','lectures','notifications','applicants','tests') AND p.action IN ('create','read','update'))
          OR (p.module = 'batches' AND p.action = 'read')
          OR (p.module IN ('dashboard','dashboard_admin') AND p.action = 'read'))
    `);
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id, scope)
      SELECT r.id, p.id, CASE WHEN p.module IN ('dashboard','dashboard_admin','batches') THEN 'course' ELSE 'batch' END
      FROM roles r CROSS JOIN permissions p
      WHERE r.name IN ('academic_guide','industry_mentor')
        AND NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = r.id)
        AND ((p.module = 'approvals' AND p.action IN ('read','update'))
          OR (p.module IN ('students','submissions','progress_reports','dashboard','dashboard_admin','batches') AND p.action = 'read'))
    `);
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id, scope)
      SELECT r.id, p.id, CASE WHEN p.module IN ('submissions','fees','progress_reports') THEN 'own' ELSE 'course' END
      FROM roles r CROSS JOIN permissions p
      WHERE r.name = 'student'
        AND NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = r.id)
        AND ((p.module = 'submissions' AND p.action IN ('create','read','update'))
          OR (p.module IN ('fees','progress_reports') AND p.action = 'read')
          OR (p.module = 'progress_reports' AND p.action = 'create')
          OR (p.module IN ('assignments','formats','lectures','dashboard','dashboard_student') AND p.action = 'read'))
    `);
    console.log('\u2713  scoped RBAC: scope column, permission catalog, default grants');

    // 22. Notification queue — durable outbox for automated event emails
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_queue (
        id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_key  VARCHAR(60) NOT NULL,
        course_id  UUID REFERENCES courses(id) ON DELETE CASCADE,
        recipient  JSONB NOT NULL DEFAULT '{}',
        data       JSONB NOT NULL DEFAULT '{}',
        dedupe_key TEXT,
        run_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status     VARCHAR(12) NOT NULL DEFAULT 'pending',
        attempts   INTEGER NOT NULL DEFAULT 0,
        error      TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        sent_at    TIMESTAMPTZ
      )
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_nq_dedupe ON notification_queue(dedupe_key) WHERE dedupe_key IS NOT NULL`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_nq_due ON notification_queue(status, run_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_nq_course ON notification_queue(course_id, created_at DESC)`);
    console.log('\u2713  notification_queue table');


    // 23. Media manager: visibility levels + assignment file tracking
    await client.query(`ALTER TABLE videos ADD COLUMN IF NOT EXISTS visibility VARCHAR(10) NOT NULL DEFAULT 'course'`);
    await client.query(`ALTER TABLE videos ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_videos_visibility ON videos(visibility)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_videos_assignment ON videos(assignment_id) WHERE assignment_id IS NOT NULL`);

    // Seed default "Assignments" and "Lectures" folders per existing course
    await client.query(`
      INSERT INTO media_folders (course_id, name, created_by)
      SELECT c.id, f.name,
        (SELECT id FROM users WHERE is_active=true ORDER BY created_at LIMIT 1)
      FROM courses c
      CROSS JOIN (VALUES ('Assignments'), ('Lectures')) AS f(name)
      WHERE NOT EXISTS (
        SELECT 1 FROM media_folders mf
        WHERE mf.course_id = c.id AND mf.name = f.name AND mf.parent_id IS NULL
      )
    `);

    // Add media module to permissions catalog
    await client.query(`
      INSERT INTO permissions (module, action)
      SELECT 'media', a.action::permission_action
      FROM (VALUES ('create'),('read'),('update'),('delete')) AS a(action)
      ON CONFLICT (module, action) DO NOTHING
    `);

    // Grant media permissions to roles that manage media
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id, scope)
      SELECT r.id, p.id, 'all'
      FROM roles r CROSS JOIN permissions p
      WHERE r.name = 'admin' AND p.module = 'media'
      ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope
    `);
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id, scope)
      SELECT r.id, p.id, 'course'
      FROM roles r CROSS JOIN permissions p
      WHERE r.name IN ('coordinator', 'academic_guide', 'industry_mentor') AND p.module = 'media' AND p.action IN ('create','read','update')
      ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope
    `);
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id, scope)
      SELECT r.id, p.id, 'own'
      FROM roles r CROSS JOIN permissions p
      WHERE r.name = 'student' AND p.module = 'media' AND p.action IN ('create','read')
      ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope
    `);
    console.log('✓  media manager: visibility, assignment_id, default folders, media permissions');

    // 24. Data heal: reconcile applicants stuck in 'test_pending' who already have
    // a submitted test attempt. These rows show up in BOTH "Test Pending" (by
    // status) and "Test Completed" (by submitted attempt). Idempotent — only ever
    // moves test_pending → test_completed for applicants with a submitted attempt.
    const healed = await client.query(`
      UPDATE applicants a
         SET status='test_completed', updated_at=NOW()
       WHERE a.status='test_pending'
         AND EXISTS (
           SELECT 1 FROM test_attempts ta
           WHERE ta.applicant_id = a.id AND ta.status='submitted'
         )
    `);
    console.log(`✓  reconciled ${healed.rowCount} applicant(s) stuck in test_pending with a submitted attempt`);


    // ═══════════════════════════════════════════════════════════════════════
    // 25. V2 SUBMISSION MODEL — additive only, zero deletion.
    //     See documentation/SOP-V2.html §2 and CLAUDE.md before changing.
    //     This block is BEHAVIOUR-NEUTRAL: it only adds structure. No existing
    //     code path reads the new columns until the V2 phases are wired up.
    // ═══════════════════════════════════════════════════════════════════════

    // 25a. Milestones become Targets. Rename in place — no data is moved — and
    //      leave an auto-updatable compatibility view behind so every existing
    //      query, insert and update against progress_reports keeps working
    //      while the application cuts over across several deploys.
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname='progress_reports' AND relkind='r')
           AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname='targets' AND relkind='r') THEN
          ALTER TABLE progress_reports RENAME TO targets;
          CREATE VIEW progress_reports AS SELECT * FROM targets;
        END IF;
      END $$;
    `);
    await client.query(`
      ALTER TABLE targets
        ADD COLUMN IF NOT EXISTS requires_file BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS is_mandatory  BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS order_index   INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS created_by    UUID REFERENCES users(id),
        ADD COLUMN IF NOT EXISTS approved_at   TIMESTAMP,
        ADD COLUMN IF NOT EXISTS approved_by   UUID REFERENCES users(id)
    `);
    await client.query(`COMMENT ON COLUMN targets.module_name IS 'Target name — labelled "Target" in the UI (was milestone/module)'`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_targets_student_sem ON targets(student_user_id, semester)`);
    console.log('✓  targets: renamed from progress_reports (+ compat view) and extended');

    // 25b. Progress-report cycles — one per batch per semester (6-monthly).
    await client.query(`
      CREATE TABLE IF NOT EXISTS progress_report_cycles (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        batch_id    UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
        semester    INTEGER NOT NULL,
        title       VARCHAR(255) NOT NULL,
        description TEXT,
        opens_at    DATE,
        due_date    DATE,
        status      VARCHAR(12) NOT NULL DEFAULT 'open',
        created_by  UUID REFERENCES users(id),
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW(),
        UNIQUE (batch_id, semester)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pr_cycles_batch ON progress_report_cycles(batch_id)`);
    console.log('✓  progress_report_cycles table');

    // 25c. The third submission kind.
    await client.query(`ALTER TYPE submission_type ADD VALUE IF NOT EXISTS 'target'`).catch(() => {});

    // 25d. Submissions: links to the thing being submitted against, a snapshot
    //      of the workflow that applied, and merge bookkeeping.
    await client.query(`
      ALTER TABLE submissions
        ADD COLUMN IF NOT EXISTS cycle_id       UUID REFERENCES progress_report_cycles(id),
        ADD COLUMN IF NOT EXISTS target_id      UUID REFERENCES targets(id),
        ADD COLUMN IF NOT EXISTS workflow_kind  VARCHAR(12),
        ADD COLUMN IF NOT EXISTS merged_into_id UUID REFERENCES submissions(id),
        ADD COLUMN IF NOT EXISTS legacy_flag    VARCHAR(24)
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_submissions_cycle  ON submissions(cycle_id)  WHERE cycle_id IS NOT NULL`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_submissions_target ON submissions(target_id) WHERE target_id IS NOT NULL`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_submissions_merged ON submissions(merged_into_id) WHERE merged_into_id IS NOT NULL`);
    console.log('✓  submissions: cycle_id, target_id, workflow_kind, merge bookkeeping');

    // 25e. Media: named file slots, folder taxonomy keys, storage verification.
    await client.query(`
      ALTER TABLE videos
        ADD COLUMN IF NOT EXISTS slot         VARCHAR(24),
        ADD COLUMN IF NOT EXISTS batch_id_ref UUID REFERENCES batches(id),
        ADD COLUMN IF NOT EXISTS semester     INTEGER,
        ADD COLUMN IF NOT EXISTS preview_key  TEXT,
        ADD COLUMN IF NOT EXISTS checksum     VARCHAR(64),
        ADD COLUMN IF NOT EXISTS verified_at  TIMESTAMP
    `);
    await client.query(`
      ALTER TABLE media_folders
        ADD COLUMN IF NOT EXISTS batch_id  UUID REFERENCES batches(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS semester  INTEGER,
        ADD COLUMN IF NOT EXISTS kind      VARCHAR(24),
        ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE
    `);
    console.log('✓  media: file slots, folder taxonomy, storage verification columns');

    // 25f. Document-style feedback. `comments` stays the plain-text mirror used
    //      by emails, lists and exports; feedback_html is the document view.
    await client.query(`
      ALTER TABLE approvals
        ADD COLUMN IF NOT EXISTS feedback_html       TEXT,
        ADD COLUMN IF NOT EXISTS feedback_updated_at TIMESTAMP
    `);
    console.log('✓  approvals: document-style feedback columns');

    // 25g. Permissions for the new modules.
    //      CRITICAL: every existing progress_reports grant is mirrored onto
    //      targets with the SAME scope. Without this, renaming the module locks
    //      every coordinator, guide and scholar out of targets on deploy.
    await client.query(`
      INSERT INTO permissions (module, action)
      SELECT m.module, a.action::permission_action
      FROM (VALUES ('targets'),('storage')) AS m(module)
      CROSS JOIN (VALUES ('create'),('read'),('update'),('delete')) AS a(action)
      ON CONFLICT (module, action) DO NOTHING
    `);
    const mirrored = await client.query(`
      INSERT INTO role_permissions (role_id, permission_id, scope)
      SELECT rp.role_id, pt.id, rp.scope
      FROM role_permissions rp
      JOIN permissions pp ON pp.id = rp.permission_id AND pp.module = 'progress_reports'
      JOIN permissions pt ON pt.module = 'targets' AND pt.action = pp.action
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `);
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id, scope)
      SELECT r.id, p.id, 'all' FROM roles r CROSS JOIN permissions p
      WHERE r.name = 'admin' AND p.module = 'storage'
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `);
    console.log(`✓  permissions: targets (${mirrored.rowCount} grants mirrored from progress_reports) + storage`);

    // 25h. BACKFILL — classify what already exists so old and new read correctly.

    // Mark every pre-existing submission so the UI can tell V1 rows from V2 rows.
    const flagged = await client.query(`UPDATE submissions SET legacy_flag='pre_v2' WHERE legacy_flag IS NULL`);

    // Stamp the workflow that ACTUALLY applied. Old assignments really did go
    // through an approval chain; recording that keeps their history readable
    // after assignments stop being approved.
    const stamped = await client.query(`
      UPDATE submissions SET workflow_kind =
        CASE WHEN submission_type = 'assignment'
                  AND EXISTS (SELECT 1 FROM approvals a WHERE a.submission_id = submissions.id)
             THEN 'chain'
             WHEN submission_type = 'assignment' THEN 'none'
             ELSE 'chain' END
      WHERE workflow_kind IS NULL
    `);

    // One cycle per batch per semester actually reached, plus semester 1 for
    // every batch that is upcoming or active.
    await client.query(`
      INSERT INTO progress_report_cycles (batch_id, semester, title, status)
      SELECT b.id, s.sem,
             'Progress Report — Semester ' || s.sem,
             CASE WHEN s.sem = mx.max_sem THEN 'open' ELSE 'closed' END
      FROM batches b
      JOIN (SELECT batch_id, GREATEST(MAX(current_semester), 1) AS max_sem
              FROM batch_enrollments WHERE status = 'active' GROUP BY batch_id) mx
        ON mx.batch_id = b.id
      CROSS JOIN LATERAL generate_series(1, mx.max_sem) AS s(sem)
      ON CONFLICT (batch_id, semester) DO NOTHING
    `);
    const cycles = await client.query(`
      INSERT INTO progress_report_cycles (batch_id, semester, title, status)
      SELECT b.id, 1, 'Progress Report — Semester 1', 'open'
      FROM batches b WHERE b.status IN ('upcoming','active')
      ON CONFLICT (batch_id, semester) DO NOTHING
    `);

    // Attach legacy progress reports to their semester's cycle.
    const linked = await client.query(`
      UPDATE submissions s SET cycle_id = c.id
      FROM progress_report_cycles c
      WHERE s.submission_type = 'progress_report'
        AND s.cycle_id IS NULL
        AND c.batch_id = s.batch_id
        AND c.semester = s.semester
    `);
    console.log(`✓  backfill: ${flagged.rowCount} flagged pre_v2, ${stamped.rowCount} workflow_kind stamped, ${linked.rowCount} reports linked to cycles`);

    // 25i. Duplicate guards — created ONLY when the data is already clean.
    //      Namita/Satish-style split reports must be merged first (SOP-V2 §3
    //      Step 3). Attempting this on dirty data would abort the migration, so
    //      we check first and report instead of failing.
    const dupCycle = await client.query(`
      SELECT COUNT(*)::int AS n FROM (
        SELECT cycle_id, student_user_id FROM submissions
        WHERE cycle_id IS NOT NULL AND merged_into_id IS NULL
        GROUP BY cycle_id, student_user_id HAVING COUNT(*) > 1
      ) d
    `);
    if (dupCycle.rows[0].n === 0) {
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_sub_cycle
          ON submissions (cycle_id, student_user_id)
          WHERE cycle_id IS NOT NULL AND merged_into_id IS NULL
      `);
      console.log('✓  uq_sub_cycle created — one progress report per scholar per cycle');
    } else {
      console.log(`⚠  uq_sub_cycle SKIPPED — ${dupCycle.rows[0].n} scholar/cycle pair(s) still have multiple submissions.`);
      console.log('   Run the merge (documentation/SOP-V2.html §3 Step 3), then re-run this migration.');
      console.log('   Inspect with query 2 of documentation/diagnostics/audit-submissions.sql');
    }
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_sub_target
        ON submissions (target_id, student_user_id)
        WHERE target_id IS NOT NULL AND merged_into_id IS NULL
    `);
    console.log('✓  uq_sub_target created — one submission per scholar per target');

    // 26. V4 ONBOARDING — student personal-info fields + profile-scoped file
    //     uploads (CV, research proposal, publications list, research statement,
    //     and identity documents). Additive only. No column is dropped or
    //     renamed anywhere in this block.

    // 26a. Personal-info fields the onboarding flow collects, plus the flag
    //      that gates a scholar's dashboard until it's filled in.
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_profile_details (
        user_id                 UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        father_name             VARCHAR(255),
        mother_name             VARCHAR(255),
        date_of_birth            DATE,
        postal_address          TEXT,
        blood_group             VARCHAR(8),
        onboarding_completed_at TIMESTAMP,
        created_at              TIMESTAMP DEFAULT NOW(),
        updated_at              TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓  student_profile_details table created (or already exists)');

    // 26b. Profile-scoped uploads reuse the existing generic media table
    // (`videos`) instead of a new one — it already has `slot`/`mime_type`/
    // `object_key`/`upload_status`. It just has no way today to hang off a
    // bare user profile (every row requires course/batch/assignment/
    // submission); this adds that one nullable link.
    await client.query(`
      ALTER TABLE videos
        ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id)
    `);
    console.log('✓  videos.owner_user_id column added (or already exists)');

    // 26c. One current file per (owner, slot) — a re-upload replaces, it does
    // not create a second row for the same document type.
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_videos_owner_slot
        ON videos (owner_user_id, slot)
        WHERE owner_user_id IS NOT NULL AND slot IS NOT NULL
    `);
    console.log('✓  uq_videos_owner_slot created — one current file per profile document slot');

    // 26d. `videos.course_id` was NOT NULL from the original schema (every row
    // used to be a course-scoped lecture/media file). Profile documents belong
    // to a bare user, not a course, so a profile-document row needs course_id
    // to be NULL. Relaxing a NOT NULL constraint drops no data and loses no
    // rows — every existing row already has a non-null course_id — so this is
    // safe under the additive-only rule.
    await client.query(`ALTER TABLE videos ALTER COLUMN course_id DROP NOT NULL`);
    console.log('✓  videos.course_id relaxed to nullable — required for profile-scoped documents');

    // 28. TARGETS BECOME BATCH-SCOPED DEFINITIONS (like assignments), not
    // per-scholar rows. `bulk-create` previously inserted one row per
    // (target × every enrolled scholar) -- 6 targets across 30 scholars wrote
    // 180 rows. That's wrong: a target is a definition a coordinator creates
    // once per batch+semester, and scholars submit against it (via
    // submissions.target_id), exactly like assignments already work.
    // student_user_id relaxed to nullable (additive — no column dropped);
    // new rows going forward simply never set it. Completion is derived
    // entirely from submissions from here on, so targets.status /
    // completion_percentage / completed_at / approved_at / approved_by stop
    // being written to (left in place, unused, for the same reason).
    await client.query(`ALTER TABLE targets ALTER COLUMN student_user_id DROP NOT NULL`);
    console.log('✓  targets.student_user_id relaxed to nullable — targets are batch-scoped definitions now');

    console.log('Migrations complete.');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

run();
