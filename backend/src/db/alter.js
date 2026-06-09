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
