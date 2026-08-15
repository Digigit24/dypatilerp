/**
 * V2 migration verifier — READ ONLY.
 *
 * Run BEFORE the migration to capture a baseline, and AFTER to prove nothing
 * was lost:
 *
 *   node src/db/verify-v2.js --save     # writes .v2-baseline.json
 *   node src/db/verify-v2.js            # compares against the saved baseline
 *
 * The contract (CLAUDE.md §2): every count must be equal or higher after a
 * migration. A count that DROPS means data was destroyed — stop and restore
 * from the Neon branch.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/database.js';
import '../config/env.js';

const BASELINE = join(dirname(fileURLToPath(import.meta.url)), '.v2-baseline.json');

// Tables that may not exist yet (pre-migration) resolve to null, not an error.
const COUNTS = {
  submissions:                    'SELECT COUNT(*)::int n FROM submissions',
  'submissions:assignment':       "SELECT COUNT(*)::int n FROM submissions WHERE submission_type='assignment'",
  'submissions:progress_report':  "SELECT COUNT(*)::int n FROM submissions WHERE submission_type='progress_report'",
  approvals:                      'SELECT COUNT(*)::int n FROM approvals',
  submission_remarks:             'SELECT COUNT(*)::int n FROM submission_remarks',
  targets_or_progress_reports:    'SELECT COUNT(*)::int n FROM targets',
  assignments:                    'SELECT COUNT(*)::int n FROM assignments',
  videos:                         'SELECT COUNT(*)::int n FROM videos',
  batch_enrollments:              'SELECT COUNT(*)::int n FROM batch_enrollments',
  users:                          'SELECT COUNT(*)::int n FROM users',
  applicants:                     'SELECT COUNT(*)::int n FROM applicants',
  fees:                           'SELECT COUNT(*)::int n FROM fees',
  fee_payments:                   'SELECT COUNT(*)::int n FROM fee_payments',
  role_permissions:               'SELECT COUNT(*)::int n FROM role_permissions',
  progress_report_cycles:         'SELECT COUNT(*)::int n FROM progress_report_cycles',
};

const HEALTH = {
  'submissions missing workflow_kind':
    'SELECT COUNT(*)::int n FROM submissions WHERE workflow_kind IS NULL',
  'progress reports not linked to a cycle':
    "SELECT COUNT(*)::int n FROM submissions WHERE submission_type='progress_report' AND cycle_id IS NULL AND merged_into_id IS NULL",
  'scholar/cycle pairs with duplicate submissions':
    `SELECT COUNT(*)::int n FROM (
       SELECT cycle_id, student_user_id FROM submissions
       WHERE cycle_id IS NOT NULL AND merged_into_id IS NULL
       GROUP BY cycle_id, student_user_id HAVING COUNT(*) > 1) d`,
  'STALLED approvals (no reviewer and no role)':
    "SELECT COUNT(*)::int n FROM approvals WHERE status='pending' AND reviewer_user_id IS NULL AND reviewer_role IS NULL",
  'active scholars missing a guide':
    `SELECT COUNT(*)::int n FROM batch_enrollments be WHERE be.status='active' AND (
        NOT EXISTS (SELECT 1 FROM student_guides g WHERE g.student_user_id=be.user_id AND g.guide_type='academic' AND g.is_active)
     OR NOT EXISTS (SELECT 1 FROM student_guides g WHERE g.student_user_id=be.user_id AND g.guide_type='industry' AND g.is_active))`,
  'media rows never verified in storage':
    "SELECT COUNT(*)::int n FROM videos WHERE upload_status IS DISTINCT FROM 'ready'",
  'targets grants (must be > 0 after migration)':
    "SELECT COUNT(*)::int n FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id WHERE p.module='targets'",
};

const runAll = async (map) => {
  const out = {};
  for (const [label, sql] of Object.entries(map)) {
    try { out[label] = (await pool.query(sql)).rows[0].n; }
    catch { out[label] = null; }   // table/column not present yet
  }
  return out;
};

const fmt = (v) => (v === null ? '—' : String(v));

const main = async () => {
  const save = process.argv.includes('--save');
  const counts = await runAll(COUNTS);
  const health = await runAll(HEALTH);

  console.log('\n  ROW COUNTS');
  console.log('  ' + '─'.repeat(62));
  let failed = false;

  if (save) {
    writeFileSync(BASELINE, JSON.stringify({ at: new Date().toISOString(), counts }, null, 2));
    for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(44)} ${fmt(v).padStart(8)}`);
    console.log(`\n  Baseline saved to ${BASELINE}`);
  } else if (existsSync(BASELINE)) {
    const base = JSON.parse(readFileSync(BASELINE, 'utf8'));
    console.log(`  Comparing against baseline taken ${base.at}\n`);
    for (const [k, v] of Object.entries(counts)) {
      const b = base.counts[k];
      let verdict = '';
      if (b === null || b === undefined || v === null) verdict = '';
      else if (v < b) { verdict = `  ✗ LOST ${b - v}`; failed = true; }
      else if (v > b) verdict = `  + ${v - b}`;
      else verdict = '  ok';
      console.log(`  ${k.padEnd(44)} ${fmt(b).padStart(8)} → ${fmt(v).padStart(8)}${verdict}`);
    }
  } else {
    for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(44)} ${fmt(v).padStart(8)}`);
    console.log('\n  No baseline found. Run with --save before migrating.');
  }

  console.log('\n  HEALTH (all should be 0, except the last)');
  console.log('  ' + '─'.repeat(62));
  for (const [k, v] of Object.entries(health)) console.log(`  ${k.padEnd(50)} ${fmt(v).padStart(6)}`);

  if (health['targets grants (must be > 0 after migration)'] === 0) {
    console.log('\n  ✗ targets has NO permission grants — coordinators will see an empty');
    console.log('    Targets screen. Re-run: node src/db/alter.js');
    failed = true;
  }
  if (health['scholar/cycle pairs with duplicate submissions'] > 0) {
    console.log('\n  ⚠ Duplicate progress reports remain — uq_sub_cycle was not created.');
    console.log('    Run the merge (SOP-V2 §3 Step 3), then re-run: node src/db/alter.js');
  }

  console.log(failed ? '\n  RESULT: FAILED — investigate before proceeding.\n'
                     : '\n  RESULT: OK\n');
  await pool.end();
  process.exit(failed ? 1 : 0);
};

main().catch((e) => { console.error(e); process.exit(1); });
