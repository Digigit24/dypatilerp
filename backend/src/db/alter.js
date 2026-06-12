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
