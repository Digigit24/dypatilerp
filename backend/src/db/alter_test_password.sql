-- Additive, non-destructive migration.
-- Adds per-test credential storage to test_access_tokens so that assigning or
-- resetting one test can never invalidate another test's credentials or the
-- student's global portal password.
--
-- Safe to run multiple times (IF NOT EXISTS). Nullable column → existing rows
-- are untouched; test-auth login falls back to users.password_hash when this
-- column is NULL, so already-issued links keep working during rollout.
--
-- Run with:  node src/db/run-alter.js alter_test_password.sql

ALTER TABLE test_access_tokens
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
