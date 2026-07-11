-- Additive: record the stage an applicant was rejected FROM, so the Rejected
-- basket can show e.g. "Shortlisted → Rejected". Nullable; only set when a
-- candidate is moved to 'rejected'. Reuses the existing applicant_status enum.
--
-- Run with: node src/db/run-alter.js alter_applicant_rejected_from_status.sql
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS rejected_from_status applicant_status;
