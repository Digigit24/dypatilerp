/**
 * Backfill folder_id/course_id/batch_id for onboarding documents uploaded
 * before uploadDocument started resolving them (see student-profile.controller.js
 * — this mirrors the query/folder resolution uploadOfficialLetter already had
 * from day one). Onboarding documents (CV, passport, marksheets, etc.)
 * uploaded before that fix have no folder link and are invisible in the
 * Media Manager's Course > Batch > Students > Name tree — this catches up
 * every such row, one folder per scholar, shared with their Official Letters.
 *
 *   node src/db/backfill-document-folders.js            # DRY RUN — proposes only
 *   node src/db/backfill-document-folders.js --apply    # writes the backfill
 *
 * Purely additive: only ever SETS course_id/folder_id/batch_id on rows where
 * folder_id IS NULL. Nothing is deleted, nothing already-linked is touched,
 * no file in storage moves.
 */
import { pool } from '../config/database.js';
import '../config/env.js';
import { getOrCreateStudentDocFolder } from '../modules/videos/videos.service.js';

const APPLY = process.argv.includes('--apply');

// Same 11 onboarding slots as student-profile.service.js#ALL_SLOTS.
const ALL_SLOTS = [
  'cv', 'research_proposal', 'publications_list', 'research_statement',
  'passport', 'aadhar_card', 'pan_card',
  'marksheet_graduation', 'marksheet_postgraduation', 'phd_result', 'photo',
];

const main = async () => {
  const { rows } = await pool.query(
    `SELECT v.id, v.owner_user_id, v.slot, v.title,
            u.first_name, u.last_name,
            be.batch_id, b.code AS batch_code, b.course_id
     FROM videos v
     JOIN users u ON u.id = v.owner_user_id
     LEFT JOIN batch_enrollments be ON be.user_id = v.owner_user_id AND be.status = 'active'
     LEFT JOIN batches b ON b.id = be.batch_id
     WHERE v.owner_user_id IS NOT NULL AND v.slot = ANY($1::text[]) AND v.folder_id IS NULL
     ORDER BY u.last_name, u.first_name, v.slot`,
    [ALL_SLOTS]
  );

  console.log(`\n  ${APPLY ? 'APPLYING' : 'DRY RUN'} — backfill onboarding-document folder links\n  ${'─'.repeat(64)}`);
  if (!rows.length) {
    console.log('  Nothing to backfill — every document already has a folder.\n');
    await pool.end();
    return;
  }

  const withBatch = rows.filter((r) => r.course_id);
  const noBatch = rows.filter((r) => !r.course_id);
  const scholars = new Set(withBatch.map((r) => r.owner_user_id));

  console.log(`  ${withBatch.length} document(s) across ${scholars.size} scholar(s) will be linked into a folder.`);
  if (noBatch.length) {
    console.log(`\n  ${noBatch.length} document(s) SKIPPED — scholar has no active batch enrollment (a folder needs a course):`);
    for (const r of noBatch) console.log(`    ${r.first_name} ${r.last_name} — ${r.slot} — "${r.title}"`);
  }

  if (!APPLY) {
    console.log('\n  Re-run with --apply to write the backfill. Nothing has been changed.\n');
    await pool.end();
    return;
  }

  const folderCache = new Map(); // owner_user_id -> folder_id (one folder per scholar, reused across all their slots)
  let updated = 0;
  for (const r of withBatch) {
    let folderId = folderCache.get(r.owner_user_id);
    if (!folderId) {
      const label = `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.owner_user_id;
      folderId = await getOrCreateStudentDocFolder(r.course_id, r.batch_code, label, null);
      folderCache.set(r.owner_user_id, folderId);
    }
    await pool.query(
      `UPDATE videos SET course_id=$1, folder_id=$2, batch_id=$3, updated_at=NOW() WHERE id=$4`,
      [r.course_id, folderId, r.batch_id, r.id]
    );
    updated++;
  }
  console.log(`\n  ${updated} document(s) linked into their scholar's folder across ${scholars.size} scholar(s).\n`);
  await pool.end();
};

main().catch((e) => { console.error(e); process.exit(1); });
