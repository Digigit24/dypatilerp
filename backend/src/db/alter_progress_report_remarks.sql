-- Progress-report remarks thread + coordinator upload rights.
-- Additive & idempotent. Existing rows/behaviour preserved.

-- 1. Free-form remarks/feedback thread on a submission. Any authorized reviewer
--    (admin / coordinator / academic guide / industry mentor) may post; the
--    owning scholar can read them. Independent of the approval chain so a guide
--    can comment without acting on their approval stage.
CREATE TABLE IF NOT EXISTS submission_remarks (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id  UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES users(id),
  author_role    VARCHAR(50),
  remark         TEXT NOT NULL,
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submission_remarks_submission
  ON submission_remarks(submission_id, created_at DESC);

-- 2. Coordinators upload progress reports on behalf of scholars, so they need
--    submissions:create (they already hold read/update). Batch-scoped, matching
--    the rest of the coordinator grant set. Only ever ADDS the grant.
INSERT INTO role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id, 'batch'
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'coordinator' AND p.module = 'submissions' AND p.action = 'create'
ON CONFLICT (role_id, permission_id) DO NOTHING;
