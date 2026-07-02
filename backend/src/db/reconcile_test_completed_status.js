/**
 * Targeted, standalone reconciliation — safe to run on production in isolation.
 *
 * Fixes the data-consistency bug where a candidate can appear in BOTH
 * "Test Pending" and "Test Completed": an applicant whose status is still
 * 'test_pending' even though they already have a SUBMITTED test attempt.
 *
 * It ONLY moves such applicants from 'test_pending' → 'test_completed'.
 * It never touches any other status, table, schema, or configuration, so it is
 * free of the re-run side effects that the full alter.js has (e.g. re-enabling
 * the lectures module, resetting media permission scopes). Idempotent: a second
 * run is a no-op because the rows it fixed are no longer 'test_pending'.
 *
 * Usage (from backend/):
 *   node src/db/reconcile_test_completed_status.js
 */
import { pool } from '../config/database.js';
import '../config/env.js';

const run = async () => {
  const client = await pool.connect();
  try {
    // Report what would change first (visibility before the write).
    const { rows: preview } = await client.query(`
      SELECT a.id, a.first_name, a.last_name, a.email
        FROM applicants a
       WHERE a.status = 'test_pending'
         AND EXISTS (
           SELECT 1 FROM test_attempts ta
           WHERE ta.applicant_id = a.id AND ta.status = 'submitted'
         )
    `);

    if (!preview.length) {
      console.log('✓  Nothing to reconcile — no applicant is stuck in test_pending with a submitted attempt.');
      return;
    }

    console.log(`Found ${preview.length} applicant(s) stuck in test_pending with a submitted attempt:`);
    for (const a of preview) {
      console.log(`   • ${`${a.first_name || ''} ${a.last_name || ''}`.trim() || '(no name)'} <${a.email}> [${a.id}]`);
    }

    const { rowCount } = await client.query(`
      UPDATE applicants a
         SET status = 'test_completed', updated_at = NOW()
       WHERE a.status = 'test_pending'
         AND EXISTS (
           SELECT 1 FROM test_attempts ta
           WHERE ta.applicant_id = a.id AND ta.status = 'submitted'
         )
    `);

    console.log(`✓  Reconciled ${rowCount} applicant(s): test_pending → test_completed.`);
  } catch (err) {
    console.error('Reconciliation failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

run();
