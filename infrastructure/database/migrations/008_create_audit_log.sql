-- Migration 008: Audit Log Table (POPIA + GDPR Compliance)
-- @see docs/specs/07_DATABASE_ARCHITECTURE.md - Section 2.2

CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        UUID,
  action          TEXT NOT NULL,
  resource_type   TEXT,
  resource_id     UUID,
  old_value       JSONB,
  new_value       JSONB,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_created_at ON audit_log(created_at);

-- POPIA consent records
CREATE TABLE consent_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),
  consent_type    TEXT NOT NULL,
  granted         BOOLEAN NOT NULL,
  ip_address      INET,
  user_agent      TEXT,
  plain_language   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  revoked_at      TIMESTAMPTZ
);

CREATE INDEX idx_consent_user ON consent_records(user_id);
CREATE INDEX idx_consent_type ON consent_records(consent_type);

-- Data deletion requests (POPIA right to erasure)
CREATE TABLE data_deletion_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),
  requested_at    TIMESTAMPTZ DEFAULT NOW(),
  processed_at    TIMESTAMPTZ,
  status          TEXT DEFAULT 'pending',
  notes           TEXT
);

CREATE INDEX idx_deletion_user ON data_deletion_requests(user_id);
CREATE INDEX idx_deletion_status ON data_deletion_requests(status);
