/**
 * Run a specific SQL file against the database.
 * Usage: node src/db/run-alter.js <filename.sql>
 * Example: node src/db/run-alter.js alter_test_system.sql
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool } from '../config/database.js';
import '../config/env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const file = process.argv[2];
if (!file) {
  console.error('Usage: node src/db/run-alter.js <filename.sql>');
  process.exit(1);
}

const run = async () => {
  const client = await pool.connect();
  try {
    const sql = readFileSync(join(__dirname, file), 'utf-8');
    console.log(`Running ${file}...`);
    await client.query(sql);
    console.log(`✓ ${file} complete.`);
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

run();
