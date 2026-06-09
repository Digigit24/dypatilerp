/**
 * Creates a folder prefix in the Zata bucket for every active course.
 * Run once after adding courses: node src/db/init-zata-folders.js
 */
import { query, pool } from '../config/database.js';
import { createCourseFolder, isConfigured } from '../services/s3.js';
import '../config/env.js';

const run = async () => {
  if (!isConfigured()) {
    console.error('✗  Zata is not configured — set ZATA_ACCESS_KEY, ZATA_SECRET_KEY, ZATA_ENDPOINT, ZATA_VIDEOS_BUCKET in .env');
    process.exit(1);
  }

  const { rows: courses } = await query('SELECT id, code, name FROM courses WHERE is_active = true ORDER BY code');
  console.log(`Creating Zata folders for ${courses.length} course(s)…\n`);

  for (const course of courses) {
    try {
      const key = await createCourseFolder(course.code);
      console.log(`✓  ${key}  (${course.name})`);
    } catch (err) {
      console.error(`✗  ${course.code}: ${err.message}`);
    }
  }

  console.log('\nDone. Folders are now visible in the Zata bucket.');
  await pool.end();
};

run().catch((err) => { console.error(err); process.exit(1); });
