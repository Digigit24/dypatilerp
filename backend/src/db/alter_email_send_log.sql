-- Additive: audit log for the generic "Email Sender" (bulk templated sends).
-- One row per recipient attempt. Backend storage only (history UI is optional).
--
-- Run with: node src/db/run-alter.js alter_email_send_log.sql
CREATE TABLE IF NOT EXISTS email_send_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sent_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  template_key    VARCHAR(80) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_type  VARCHAR(20),                 -- 'applicant' | 'scholar' | null
  status          VARCHAR(12) NOT NULL,        -- 'sent' | 'failed'
  error           TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_send_log_created  ON email_send_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_template ON email_send_log(template_key);
CREATE INDEX IF NOT EXISTS idx_email_send_log_sent_by  ON email_send_log(sent_by);
