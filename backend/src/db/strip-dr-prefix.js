/**
 * Strip a "Dr"/"Dr." prefix baked into users.first_name.
 *
 * Some scholars were onboarded with "Dr" typed directly into their first
 * name field ("Dr Shuchi", "Dr.Hemantha") in inconsistent formats. The app
 * is moving to a single consistent "Dr. " display prefix applied uniformly
 * at render time (see src/lib/formatters.js#scholarDisplayName) — so the raw
 * first_name needs to be clean, or the display prefix would double up
 * ("Dr. Dr Shuchi").
 *
 * Only strips a leading Dr/Dr. token (any casing, with or without a period,
 * with or without a following space) and trims whitespace. Nothing else
 * about the name is touched or restructured — e.g. a first_name that also
 * happens to duplicate the surname is left exactly as-is; that's a separate,
 * unrelated data-entry issue this script does not attempt to fix.
 *
 *   node src/db/strip-dr-prefix.js            # DRY RUN — reports only
 *   node src/db/strip-dr-prefix.js --apply    # writes the change
 *
 * Nothing is deleted — this only rewrites users.first_name for the affected
 * rows, each in its own statement.
 */
import { pool } from '../config/database.js';
import '../config/env.js';

const APPLY = process.argv.includes('--apply');
const strip = (name) => name.replace(/^dr\.?\s*/i, '').trim();

const main = async () => {
  const { rows } = await pool.query(`
    SELECT DISTINCT u.id, u.first_name, u.last_name
    FROM users u JOIN batch_enrollments be ON be.user_id = u.id
    WHERE u.first_name ~* '^dr\\.?\\s*'
    ORDER BY u.first_name
  `);

  console.log(`\n  ${APPLY ? 'APPLYING' : 'DRY RUN'} — strip Dr prefix from first_name\n  ${'─'.repeat(64)}`);
  if (!rows.length) {
    console.log('  Nothing to strip — no first_name currently starts with Dr.\n');
    await pool.end();
    return;
  }

  for (const r of rows) {
    const after = strip(r.first_name);
    console.log(`  ${r.id}\n    "${r.first_name}" -> "${after}"  (last_name: ${r.last_name})`);
  }

  if (!APPLY) {
    console.log(`\n  ${rows.length} row(s) would be updated.`);
    console.log('  Re-run with --apply to write them. Nothing has been changed.\n');
    await pool.end();
    return;
  }

  let fixed = 0;
  for (const r of rows) {
    const after = strip(r.first_name);
    await pool.query(`UPDATE users SET first_name=$1, updated_at=NOW() WHERE id=$2`, [after, r.id]);
    fixed++;
  }
  console.log(`\n  ${fixed} row(s) updated.\n`);
  await pool.end();
};

main().catch((e) => { console.error(e); process.exit(1); });
