import app from './app.js';
import { env } from './config/env.js';
import { pool } from './config/database.js';
import { startNotificationWorker } from './modules/notifications/notify.service.js';

const start = async () => {
  try {
    // Verify DB connection
    await pool.query('SELECT 1');
    console.log('✓ Database connected (Neon)');

    app.listen(env.PORT, () => {
      console.log(`✓ Server running on http://localhost:${env.PORT}`);
      console.log(`✓ API docs: http://localhost:${env.PORT}/api-docs`);
    });

    // Notification worker: delivers queued event emails + runs daily
    // fee-due / deadline-overdue scans per course config
    startNotificationWorker();
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
