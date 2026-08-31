/**
 * Merge split progress reports into the V2 two-slot model.
 *
 * Before V2 there was no way to file one report carrying two files, so scholars
 * submitted the report and the slides as SEPARATE submissions — and with no
 * duplicate guard, often more than once. This pairs them back together.
 *
 *   node src/db/merge-progress-reports.js            # DRY RUN — proposes only
 *   node src/db/merge-progress-reports.js --apply    # writes the merge
 *
 * NOTHING IS EVER DELETED. The source row is kept, its media and remarks are
 * re-parented to the survivor, and it is flagged:
 *     merged_into_id = <survivor id>
 *     legacy_flag    = 'merged_source'
 * The default UI filters on merged_into_id IS NULL; every original row stays
 * fully queryable, with its approvals and audit history intact.
 *
 * Run the dry run, read it, and only then --apply. See SOP-V2 §3 Step 3.
 */
import { pool } from '../config/database.js';
import '../config/env.js';

const APPLY = process.argv.includes('--apply');
const REQUIRED_SLOTS = ['report', 'presentation'];

/**
 * Classify a row as the report or the presentation. Title checked FIRST:
 * either slot accepts either file type, so a presentation submitted as a
 * PDF (common — several real scholars did exactly this) would otherwise be
 * misclassified as a report by extension alone before the title is ever
 * checked, and two rows would collide into the same slot.
 */
const classify = (row) => {
  if (/present|slide|ppt|deck/i.test(row.title || '')) return 'presentation';
  const files = Array.isArray(row.file_urls) ? row.file_urls : [];
  const exts = files.map((f) => (f.type || '').toLowerCase());
  if (exts.some((e) => e === 'ppt' || e === 'pptx')) return 'presentation';
  return 'report';
};

const main = async () => {
  const { rows } = await pool.query(
    `SELECT s.id, s.title, s.status, s.semester, s.file_urls, s.student_user_id,
            s.batch_id, s.cycle_id, s.submitted_at, s.created_at,
            u.first_name || ' ' || u.last_name AS scholar, u.email,
            (SELECT COUNT(*) FROM approvals a WHERE a.submission_id = s.id)::int AS approvals,
            (SELECT COUNT(*) FROM videos v WHERE v.submission_id = s.id)::int    AS media,
            COALESCE(jsonb_array_length(s.file_urls), 0)::int                    AS files
     FROM submissions s
     JOIN users u ON u.id = s.student_user_id
     WHERE s.submission_type = 'progress_report' AND s.merged_into_id IS NULL
     ORDER BY s.student_user_id, s.semester, s.created_at`
  );

  // Group by scholar + batch + semester — never merge across scholars.
  const groups = new Map();
  for (const r of rows) {
    const key = `${r.student_user_id}|${r.batch_id}|${r.semester}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const plans = [];
  for (const [, group] of groups) {
    if (group.length < 2) continue;

    // Empty drafts are abandoned attempts, not part of a real report.
    const real = group.filter((r) => r.files > 0 || r.media > 0 || r.status !== 'draft');
    const empties = group.filter((r) => !real.includes(r));
    if (real.length < 2) {
      if (empties.length) plans.push({ kind: 'empty-drafts', scholar: group[0].scholar, empties });
      continue;
    }

    // The survivor is the row carrying approvals; ties go to the earliest.
    const survivor = [...real].sort((a, b) =>
      (b.approvals - a.approvals) || (new Date(a.created_at) - new Date(b.created_at))
    )[0];
    const sources = real.filter((r) => r.id !== survivor.id);

    plans.push({
      kind: 'merge',
      scholar: survivor.scholar,
      email: survivor.email,
      semester: survivor.semester,
      survivor,
      sources,
      slots: Object.fromEntries([survivor, ...sources].map((r) => [r.id, classify(r)])),
      empties,
    });
  }

  // ── Report ──────────────────────────────────────────────────────────────
  console.log(`\n  ${APPLY ? 'APPLYING' : 'DRY RUN'} — merge split progress reports\n  ${'─'.repeat(64)}`);
  if (!plans.length) console.log('  Nothing to merge.\n');

  for (const p of plans) {
    if (p.kind === 'empty-drafts') {
      console.log(`\n  ${p.scholar}: ${p.empties.length} empty draft(s) — hidden from the UI, retained in the database`);
      continue;
    }
    console.log(`\n  ${p.scholar} <${p.email}>  ·  Semester ${p.semester}`);
    console.log(`    KEEP    ${p.survivor.id}  [${p.slots[p.survivor.id]}]  "${p.survivor.title}"  (${p.survivor.approvals} approval(s), ${p.survivor.files} file(s))`);
    for (const src of p.sources) {
      console.log(`    MERGE   ${src.id}  [${p.slots[src.id]}]  "${src.title}"  (${src.approvals} approval(s), ${src.files} file(s))`);
    }
    if (p.empties.length) console.log(`    IGNORE  ${p.empties.length} empty draft(s)`);

    // A genuine duplicate upload (same report submitted twice) legitimately
    // classifies into the same slot as another row — that's harmless, it
    // just carries an extra file_urls entry into the merge as retained
    // history. What actually needs a human is a required slot missing
    // entirely: with 3+ rows this can still happen (e.g. three copies of the
    // report and no presentation at all) even though no single PAIR collides.
    const slotsUsed = new Set([p.survivor, ...p.sources].map((r) => p.slots[r.id]));
    const missing = REQUIRED_SLOTS.filter((slot) => !slotsUsed.has(slot));
    if (missing.length) {
      console.log(`    ⚠  no row classified as [${missing.join(', ')}] — needs a human decision, skipping`);
      p.skip = true;
    }
  }

  if (!APPLY) {
    console.log(`\n  ${plans.filter((p) => p.kind === 'merge' && !p.skip).length} merge(s) proposed.`);
    console.log('  Re-run with --apply to write them. Nothing has been changed.\n');
    await pool.end();
    return;
  }

  // ── Apply, one pair per transaction ─────────────────────────────────────
  let merged = 0;
  for (const p of plans) {
    if (p.kind !== 'merge' || p.skip) continue;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [surv] } = await client.query('SELECT file_urls FROM submissions WHERE id=$1', [p.survivor.id]);
      const files = (Array.isArray(surv.file_urls) ? surv.file_urls : [])
        .map((f) => ({ ...f, slot: f.slot || p.slots[p.survivor.id] }));

      for (const src of p.sources) {
        const slot = p.slots[src.id];
        // Move the media rows across, stamped with their slot.
        await client.query(
          `UPDATE videos SET submission_id=$1, slot=$2, updated_at=NOW() WHERE submission_id=$3`,
          [p.survivor.id, slot, src.id]
        );
        const { rows: [srcRow] } = await client.query('SELECT file_urls FROM submissions WHERE id=$1', [src.id]);
        for (const f of (Array.isArray(srcRow.file_urls) ? srcRow.file_urls : [])) {
          files.push({ ...f, slot, merged_from: src.id });
        }
        // Keep the conversation.
        await client.query('UPDATE submission_remarks SET submission_id=$1 WHERE submission_id=$2',
          [p.survivor.id, src.id]).catch(() => {});
        // Flag the source. NOT deleted.
        await client.query(
          `UPDATE submissions SET merged_into_id=$1, legacy_flag='merged_source', updated_at=NOW() WHERE id=$2`,
          [p.survivor.id, src.id]
        );
      }

      // updated_at is deliberately left untouched — bumping it here would make
      // the admin preview's "files changed after this was submitted, re-check
      // before approving" warning fire on every merged row forever, even
      // though nothing changed after the scholar actually submitted; this is
      // a data-consolidation write, not a real post-submission edit.
      await client.query(
        `UPDATE submissions SET file_urls=$1, workflow_kind='chain' WHERE id=$2`,
        [JSON.stringify(files), p.survivor.id]
      );
      await client.query('COMMIT');
      merged++;
      console.log(`  ✓ merged ${p.sources.length} row(s) into ${p.survivor.id} (${p.scholar})`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  ✗ ${p.scholar}: ${err.message}`);
    } finally {
      client.release();
    }
  }

  console.log(`\n  ${merged} report(s) merged. No row was deleted.`);
  console.log('  Now re-run: node src/db/alter.js  — to create uq_sub_cycle.\n');
  await pool.end();
};

main().catch((e) => { console.error(e); process.exit(1); });
