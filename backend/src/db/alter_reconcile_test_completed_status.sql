-- Targeted reconciliation — safe to run on production in isolation.
--
-- Fixes applicants stuck in 'test_pending' who already have a SUBMITTED test
-- attempt (they otherwise appear in BOTH "Test Pending" and "Test Completed").
-- Only moves test_pending -> test_completed; touches nothing else. Idempotent.
--
-- Run with either:
--   node src/db/run-alter.js alter_reconcile_test_completed_status.sql
-- or:
--   psql "$DATABASE_URL" -f src/db/alter_reconcile_test_completed_status.sql

UPDATE applicants a
   SET status = 'test_completed', updated_at = NOW()
 WHERE a.status = 'test_pending'
   AND EXISTS (
     SELECT 1 FROM test_attempts ta
     WHERE ta.applicant_id = a.id AND ta.status = 'submitted'
   );
