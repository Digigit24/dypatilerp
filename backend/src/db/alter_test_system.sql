-- ============================================================
-- Test System Schema Additions
-- Run once: node backend/src/db/run-alter.js alter_test_system.sql
-- ============================================================

-- 1. Test Sections
CREATE TABLE IF NOT EXISTS test_sections (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id          UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  title            VARCHAR(255) NOT NULL,
  description      TEXT,
  order_index      INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- 2. Test Access Tokens (per-applicant unique login tokens)
CREATE TABLE IF NOT EXISTS test_access_tokens (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id        UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  applicant_id   UUID NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  token          VARCHAR(128) UNIQUE NOT NULL,
  username       VARCHAR(255) NOT NULL,
  user_id        UUID REFERENCES users(id),
  password_hash  VARCHAR(255),
  expires_at     TIMESTAMP,
  used_at        TIMESTAMP,
  created_at     TIMESTAMP DEFAULT NOW(),
  UNIQUE (test_id, applicant_id)
);

-- Per-test credential (additive for existing deployments)
ALTER TABLE test_access_tokens
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- 3. Add section_id to test_questions
ALTER TABLE test_questions
  ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES test_sections(id) ON DELETE SET NULL;

-- 4. Add autosave + token tracking to test_attempts
ALTER TABLE test_attempts
  ADD COLUMN IF NOT EXISTS token_id       UUID REFERENCES test_access_tokens(id),
  ADD COLUMN IF NOT EXISTS last_saved_at  TIMESTAMP;

-- 5. Make course_id optional on tests (entrance tests may not belong to a specific course)
ALTER TABLE tests ALTER COLUMN course_id DROP NOT NULL;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_test_sections_test        ON test_sections(test_id);
CREATE INDEX IF NOT EXISTS idx_test_access_tokens_token  ON test_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_test_questions_section    ON test_questions(section_id);
