-- Additive, non-destructive migration.
-- Adds a free-text rejection remark to applicants so admins can record WHY an
-- applicant was rejected (e.g. "Not interested", "Will pursue next batch").
--
-- Safe to run multiple times (IF NOT EXISTS). Nullable column → existing rows
-- are untouched.
--
-- Run with:  node src/db/run-alter.js alter_applicant_rejection_remark.sql

ALTER TABLE applicants
  ADD COLUMN IF NOT EXISTS rejection_remark TEXT;
