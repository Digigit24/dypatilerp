-- Progress-report uploads: audit attribution + media↔submission binding + finalize status.
-- Additive & idempotent. No enum changes. Existing rows/behaviour preserved.

-- 1. Audit attribution on submissions (owner stays student_user_id).
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS created_by_user_id   UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS submitted_by_user_id UUID REFERENCES users(id);

-- 2. Explicit media -> submission binding + upload finalize status on videos.
--    upload_status: 'pending' (presigned, not yet HEAD-verified) | 'ready' (finalized).
--    DEFAULT 'ready' so every existing video (lectures) stays valid & visible unchanged;
--    only new submission uploads are created 'pending' until finalize flips them to 'ready'.
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS upload_status VARCHAR(12) NOT NULL DEFAULT 'ready';

CREATE INDEX IF NOT EXISTS idx_videos_submission
  ON videos(submission_id) WHERE submission_id IS NOT NULL;
