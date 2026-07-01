-- ═══════════════════════════════════════════════════════════
--  DY Patil ERP  –  Complete Database Schema
--  Engine: PostgreSQL (Neon serverless)
-- ═══════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUMS ──────────────────────────────────────────────────

CREATE TYPE user_role_name AS ENUM (
  'admin', 'coordinator', 'academic_guide', 'industry_mentor', 'student', 'applicant'
);

CREATE TYPE applicant_status AS ENUM (
  'submitted', 'test_pending', 'test_completed', 'shortlisted', 'rejected', 'enrolled'
);

CREATE TYPE batch_status AS ENUM ('upcoming', 'active', 'completed');

CREATE TYPE enrollment_status AS ENUM ('active', 'withdrawn', 'completed', 'suspended');

CREATE TYPE test_type AS ENUM ('entrance', 'assessment', 'quiz');

CREATE TYPE test_status AS ENUM ('draft', 'published', 'closed');

CREATE TYPE question_type AS ENUM (
  'mcq', 'short_answer', 'long_answer', 'true_false', 'file_upload'
);

CREATE TYPE attempt_status AS ENUM ('in_progress', 'submitted', 'evaluated', 'timed_out');

CREATE TYPE submission_type AS ENUM (
  'research_paper', 'progress_report', 'thesis_chapter', 'assignment', 'other'
);

CREATE TYPE submission_status AS ENUM (
  'draft', 'submitted', 'under_review', 'approved', 'needs_revision', 'rejected'
);

CREATE TYPE approval_stage AS ENUM ('coordinator', 'academic_guide', 'industry_mentor');

CREATE TYPE approval_status AS ENUM (
  'pending', 'approved', 'rejected', 'needs_revision', 'skipped'
);

CREATE TYPE progress_status AS ENUM ('not_started', 'in_progress', 'completed');

CREATE TYPE fee_status AS ENUM ('pending', 'paid', 'overdue', 'waived');

CREATE TYPE guide_type AS ENUM ('academic', 'industry');

CREATE TYPE notification_type AS ENUM (
  'approval', 'revision', 'zoom_link', 'announcement', 'report_due', 'fee_due', 'test_scheduled'
);

CREATE TYPE permission_action AS ENUM ('create', 'read', 'update', 'delete');

-- ─── USERS & AUTH ────────────────────────────────────────────

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  phone           VARCHAR(20),
  avatar_url      TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  email_verified  BOOLEAN DEFAULT FALSE,
  last_login_at   TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─── RBAC ────────────────────────────────────────────────────

CREATE TABLE roles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         user_role_name UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description  TEXT,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE permissions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module      VARCHAR(100) NOT NULL,  -- e.g. students, batches, fees
  action      permission_action NOT NULL,
  description VARCHAR(255),
  UNIQUE (module, action)
);

CREATE TABLE role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- user_roles links a user to a role, optionally scoped to course/batch
CREATE TABLE user_roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  course_id   UUID,                     -- FK added after courses table
  batch_id    UUID,                     -- FK added after batches table
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, role_id, course_id, batch_id)
);

-- ─── COURSES ─────────────────────────────────────────────────

CREATE TABLE courses (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                    VARCHAR(255) NOT NULL,
  code                    VARCHAR(50) UNIQUE NOT NULL,
  description             TEXT,
  duration_months         INTEGER NOT NULL DEFAULT 24,
  max_students_per_batch  INTEGER NOT NULL DEFAULT 30,
  fee_structure           JSONB DEFAULT '{}',  -- { "1": 50000, "2": 50000 }
  is_active               BOOLEAN DEFAULT TRUE,
  created_by              UUID REFERENCES users(id),
  created_at              TIMESTAMP DEFAULT NOW(),
  updated_at              TIMESTAMP DEFAULT NOW()
);

-- ─── BATCHES ─────────────────────────────────────────────────

CREATE TABLE batches (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id    UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  name         VARCHAR(255) NOT NULL,
  code         VARCHAR(50) UNIQUE NOT NULL,
  status       batch_status DEFAULT 'upcoming',
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  max_students INTEGER NOT NULL DEFAULT 30,
  description  TEXT,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);

-- Add FK constraints deferred until after tables exist
ALTER TABLE user_roles
  ADD CONSTRAINT fk_user_roles_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_user_roles_batch  FOREIGN KEY (batch_id)  REFERENCES batches(id) ON DELETE CASCADE;

-- ─── APPLICANTS ──────────────────────────────────────────────

CREATE TABLE applicants (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES users(id),           -- set after onboarding
  course_id         UUID NOT NULL REFERENCES courses(id),
  batch_id          UUID REFERENCES batches(id),         -- assigned batch
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100) NOT NULL,
  email             VARCHAR(255) NOT NULL,
  phone             VARCHAR(20),
  status            applicant_status DEFAULT 'submitted',
  rejection_remark  TEXT,                -- free-text reason recorded when rejected
  phd_details       JSONB DEFAULT '{}',  -- { university, year_awarded, subject, thesis_title }
  application_data  JSONB DEFAULT '{}',  -- full multi-step form payload
  applied_at        TIMESTAMP DEFAULT NOW(),
  reviewed_at       TIMESTAMP,
  reviewed_by       UUID REFERENCES users(id),
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

-- ─── BATCH ENROLLMENTS ───────────────────────────────────────

CREATE TABLE batch_enrollments (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id           UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  applicant_id       UUID REFERENCES applicants(id),
  enrollment_number  VARCHAR(100) UNIQUE NOT NULL,
  status             enrollment_status DEFAULT 'active',
  current_semester   INTEGER DEFAULT 1,
  enrolled_at        TIMESTAMP DEFAULT NOW(),
  enrolled_by        UUID REFERENCES users(id),
  UNIQUE (batch_id, user_id)
);

-- ─── STUDENT GUIDES ──────────────────────────────────────────

CREATE TABLE student_guides (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guide_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  batch_id        UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  guide_type      guide_type NOT NULL,
  assigned_at     TIMESTAMP DEFAULT NOW(),
  assigned_by     UUID REFERENCES users(id),
  is_active       BOOLEAN DEFAULT TRUE,
  UNIQUE (student_user_id, guide_user_id, batch_id, guide_type)
);

-- ─── TESTS ───────────────────────────────────────────────────

CREATE TABLE tests (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id        UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  batch_id         UUID REFERENCES batches(id),  -- null = course-wide
  title            VARCHAR(255) NOT NULL,
  description      TEXT,
  type             test_type DEFAULT 'entrance',
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  total_marks      INTEGER NOT NULL DEFAULT 100,
  passing_marks    INTEGER,
  instructions     TEXT,
  status           test_status DEFAULT 'draft',
  start_time       TIMESTAMP,
  end_time         TIMESTAMP,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE test_questions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id       UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question_type question_type NOT NULL,
  question_text TEXT NOT NULL,
  marks         INTEGER NOT NULL DEFAULT 1,
  order_index   INTEGER NOT NULL DEFAULT 0,
  is_required   BOOLEAN DEFAULT TRUE,
  config        JSONB DEFAULT '{}',  -- { options, correct_answer, word_limit }
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE test_attempts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id          UUID NOT NULL REFERENCES tests(id) ON DELETE RESTRICT,
  user_id          UUID NOT NULL REFERENCES users(id),
  applicant_id     UUID REFERENCES applicants(id),
  started_at       TIMESTAMP DEFAULT NOW(),
  submitted_at     TIMESTAMP,
  status           attempt_status DEFAULT 'in_progress',
  score            DECIMAL(6,2),
  time_taken_secs  INTEGER,
  evaluator_id     UUID REFERENCES users(id),
  evaluated_at     TIMESTAMP,
  UNIQUE (test_id, user_id)
);

CREATE TABLE test_responses (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id     UUID NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
  question_id    UUID NOT NULL REFERENCES test_questions(id),
  response_data  JSONB DEFAULT '{}',  -- { selected_option, text_answer, file_url }
  marks_awarded  DECIMAL(5,2),
  feedback       TEXT,
  created_at     TIMESTAMP DEFAULT NOW(),
  UNIQUE (attempt_id, question_id)
);

-- ─── SUBMISSIONS ─────────────────────────────────────────────

CREATE TABLE submissions (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id               UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
  student_user_id        UUID NOT NULL REFERENCES users(id),
  title                  VARCHAR(500) NOT NULL,
  submission_type        submission_type NOT NULL,
  semester               INTEGER NOT NULL DEFAULT 1,
  status                 submission_status DEFAULT 'draft',
  content                TEXT,               -- rich text / HTML
  file_urls              JSONB DEFAULT '[]', -- [{ name, url, type, size }]
  version                INTEGER DEFAULT 1,
  parent_submission_id   UUID REFERENCES submissions(id),  -- for revisions
  submitted_at           TIMESTAMP,
  created_at             TIMESTAMP DEFAULT NOW(),
  updated_at             TIMESTAMP DEFAULT NOW()
);

-- ─── APPROVALS ───────────────────────────────────────────────

CREATE TABLE approvals (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id    UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  stage            approval_stage NOT NULL,
  status           approval_status DEFAULT 'pending',
  reviewer_user_id UUID REFERENCES users(id),
  order_index      INTEGER NOT NULL,  -- 1=coordinator, 2=academic_guide, 3=industry_mentor
  action_at        TIMESTAMP,
  comments         TEXT,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- ─── PROGRESS REPORTS ────────────────────────────────────────

CREATE TABLE progress_reports (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id              UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
  student_user_id       UUID NOT NULL REFERENCES users(id),
  semester              INTEGER NOT NULL DEFAULT 1,
  module_name           VARCHAR(255) NOT NULL,
  description           TEXT,
  status                progress_status DEFAULT 'not_started',
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  due_date              DATE,
  completed_at          TIMESTAMP,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

-- ─── FEES ────────────────────────────────────────────────────

CREATE TABLE fees (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id        UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
  student_user_id UUID NOT NULL REFERENCES users(id),
  semester        INTEGER NOT NULL,
  amount          DECIMAL(12,2) NOT NULL,
  due_date        DATE NOT NULL,
  status          fee_status DEFAULT 'pending',
  description     VARCHAR(500),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE fee_payments (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fee_id         UUID NOT NULL REFERENCES fees(id) ON DELETE RESTRICT,
  amount         DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,  -- cash, bank_transfer, online, upi
  transaction_id VARCHAR(255),
  receipt_url    TEXT,
  paid_at        TIMESTAMP DEFAULT NOW(),
  recorded_by    UUID REFERENCES users(id),
  notes          TEXT,
  created_at     TIMESTAMP DEFAULT NOW()
);

-- ─── RESEARCH PROFILES ───────────────────────────────────────

CREATE TABLE research_profiles (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug                VARCHAR(255) UNIQUE,  -- for public profile URL
  bio                 TEXT,
  research_interests  JSONB DEFAULT '[]',   -- ["AI", "Finance", ...]
  phd_details         JSONB DEFAULT '{}',
  current_institution VARCHAR(255),
  department          VARCHAR(255),
  designation         VARCHAR(255),
  linkedin_url        TEXT,
  orcid               VARCHAR(50),
  google_scholar_url  TEXT,
  is_public           BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE publications (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            VARCHAR(500) NOT NULL,
  authors          JSONB DEFAULT '[]',    -- ["Author 1", "Author 2"]
  journal          VARCHAR(255),
  year             INTEGER,
  doi              VARCHAR(255),
  url              TEXT,
  publication_type VARCHAR(50) DEFAULT 'journal',  -- journal, conference, book_chapter, patent, other
  created_at       TIMESTAMP DEFAULT NOW()
);

-- ─── NOTIFICATIONS ───────────────────────────────────────────

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type        notification_type NOT NULL,
  title       VARCHAR(500) NOT NULL,
  message     TEXT NOT NULL,
  course_id   UUID REFERENCES courses(id),
  batch_id    UUID REFERENCES batches(id),
  data        JSONB DEFAULT '{}',  -- extra metadata (zoom link, submission id, etc.)
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notification_recipients (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_read         BOOLEAN DEFAULT FALSE,
  read_at         TIMESTAMP,
  UNIQUE (notification_id, user_id)
);

-- ─── AUDIT LOG ───────────────────────────────────────────────

CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id),
  action        VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id   UUID,
  changes       JSONB,
  ip_address    VARCHAR(45),
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────────────

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
CREATE INDEX idx_batches_course ON batches(course_id);
CREATE INDEX idx_applicants_course ON applicants(course_id);
CREATE INDEX idx_applicants_status ON applicants(status);
CREATE INDEX idx_applicants_email ON applicants(email);
CREATE INDEX idx_batch_enrollments_batch ON batch_enrollments(batch_id);
CREATE INDEX idx_batch_enrollments_user ON batch_enrollments(user_id);
CREATE INDEX idx_submissions_batch ON submissions(batch_id);
CREATE INDEX idx_submissions_student ON submissions(student_user_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_approvals_submission ON approvals(submission_id);
CREATE INDEX idx_approvals_reviewer ON approvals(reviewer_user_id);
CREATE INDEX idx_progress_reports_student ON progress_reports(student_user_id);
CREATE INDEX idx_fees_student ON fees(student_user_id);
CREATE INDEX idx_fees_status ON fees(status);
CREATE INDEX idx_notification_recipients_user ON notification_recipients(user_id);
CREATE INDEX idx_notification_recipients_read ON notification_recipients(user_id, is_read);
CREATE INDEX idx_test_attempts_test ON test_attempts(test_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
