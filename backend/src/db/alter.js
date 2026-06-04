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
