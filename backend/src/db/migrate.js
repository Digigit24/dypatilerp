import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool } from '../config/database.js';
import '../config/env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const migrate = async () => {
  const client = await pool.connect();
  try {
    const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    console.log('Running migrations...');
    await client.query(sql);
    console.log('Migrations complete.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

migrate();
