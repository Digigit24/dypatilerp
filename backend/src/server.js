import app from './app.js';
import { env } from './config/env.js';
import { pool } from './config/database.js';

const start = async () => {
  try {
    // Verify DB connection
    await pool.query('SELECT 1');
    console.log('✓ Database connected (Neon)');

    app.listen(env.PORT, () => {
      console.log(`✓ Server running on http://localhost:${env.PORT}`);
      console.log(`✓ API docs: http://localhost:${env.PORT}/api-docs`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

start();

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing DB pool...');
  await pool.end();
  process.exit(0);
});
