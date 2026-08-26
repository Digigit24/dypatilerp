/**
 * Repair submissions stuck showing "Submitted" with nothing actually attached.
 *
 * Before the removeFileDescriptor fix (see submissions.service.js), deleting a
 * submission's last file(s) only cleared file_urls — status stayed 'submitted'/
 * 'under_review' forever, so the badge kept claiming it was submitted, the
 * scholar's editable check locked them out of re-uploading, and even an
 * admin's "Replace" silently dead-ended at the final submit call. That fix
 * only stops NEW occurrences; this script finds and repairs rows already
 * broken that way before the fix landed.
 *
 *   node src/db/repair-orphaned-submissions.js            # DRY RUN — reports only
 *   node src/db/repair-orphaned-submissions.js --apply    # writes the repair
 *
 * NOTHING IS EVER DELETED. Affected rows are reverted to status='draft' with
 * submitted_at cleared — exactly what removeFileDescriptor now does live —
 * and any still-pending approvals for them are cleared (they were reviewing
 * content that no longer exists; decided approvals are left untouched).
 */
import { pool } from '../config/database.js';
import '../config/env.js';

const APPLY = process.argv.includes('--apply');
const REQUIRED_SLOTS = ['report', 'presentation'];

const hasSlot = (files, slot) => files.some((f) => f.slot === slot);

const main = async () => {
  const { rows } = await pool.query(
    `SELECT s.id, s.submission_type, s.status, s.semester, s.file_urls,
            s.assignment_id, s.target_id, s.student_user_id, s.batch_id,
            u.first_name || ' ' || u.last_name AS scholar, u.email,
            (SELECT COUNT(*) FROM approvals a WHERE a.submission_id = s.id AND a.status = 'pending')::int AS pending_approvals
     FROM submissions s
     JOIN users u ON u.id = s.student_user_id
     WHERE s.status IN ('submitted', 'under_review') AND s.merged_into_id IS NULL
     ORDER BY u.first_name, u.last_name, s.submission_type, s.semester`
  );

  const broken = rows.filter((s) => {
    const files = Array.isArray(s.file_urls) ? s.file_urls : [];
    const isProgressReport = s.submission_type === 'progress_report' && !s.assignment_id && !s.target_id;
    return isProgressReport
      ? !REQUIRED_SLOTS.every((slot) => hasSlot(files, slot))
      : files.length === 0;
  });

  console.log(`\n  ${APPLY ? 'APPLYING' : 'DRY RUN'} — repair orphaned "submitted" submissions\n  ${'─'.repeat(64)}`);
  if (!broken.length) {
    console.log('  Nothing to repair — every submitted/under_review row has real files behind it.\n');
    await pool.end();
    return;
  }

  for (const s of broken) {
    const files = Array.isArray(s.file_urls) ? s.file_urls : [];
    console.log(`  ${s.scholar} <${s.email}>  ·  ${s.submission_type}  ·  Semester ${s.semester ?? '—'}`);
    console.log(`    ${s.id}  status=${s.status}  files=${files.length}  pending approvals=${s.pending_approvals}`);
  }

  if (!APPLY) {
    console.log(`\n  ${broken.length} submission(s) would be reverted to draft.`);
    console.log('  Re-run with --apply to write the repair. Nothing has been changed.\n');
    await pool.end();
    return;
  }

  let fixed = 0;
  for (const s of broken) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE submissions SET status='draft', submitted_at=NULL, updated_at=NOW() WHERE id=$1`,
        [s.id]
      );
      await client.query(`DELETE FROM approvals WHERE submission_id=$1 AND status='pending'`, [s.id]);
      await client.query('COMMIT');
      fixed++;
      console.log(`  ✓ ${s.scholar} — ${s.id} reverted to draft`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  ✗ ${s.scholar} — ${s.id}: ${err.message}`);
    } finally {
      client.release();
    }
  }

  console.log(`\n  ${fixed} submission(s) repaired. No row was deleted.\n`);
  await pool.end();
};

main().catch((e) => { console.error(e); process.exit(1); });
