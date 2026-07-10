-- Additive: add a "Registration Fee Paid" pipeline stage between Final Shortlist
-- (shortlisted) and Enrolled.
--
-- Run with: node src/db/run-alter.js alter_applicant_status_payment_received.sql
--
-- IMPORTANT: this file contains ONLY the ADD VALUE. Postgres requires a new enum
-- value to be committed before it can be USED, so no query that references
-- 'payment_received' may live in the same migration/transaction.
ALTER TYPE applicant_status ADD VALUE IF NOT EXISTS 'payment_received' AFTER 'shortlisted';
