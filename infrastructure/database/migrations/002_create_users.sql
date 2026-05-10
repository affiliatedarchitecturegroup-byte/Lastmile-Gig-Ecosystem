-- Migration 002: Users & Identity Tables
-- @see docs/specs/07_DATABASE_ARCHITECTURE.md - Section 2.2

-- Users table
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  phone           TEXT,
  role            user_role NOT NULL,
  auth0_id        TEXT UNIQUE,
  display_name    TEXT,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  popia_consent   BOOLEAN DEFAULT FALSE,
  popia_consent_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_auth0_id ON users(auth0_id);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: Enable row level security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own record
CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (id = auth.uid());

-- RLS Policy: Admins can read all users
CREATE POLICY "admins_read_all_users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin', 'ops_staff', 'ops_senior')
    )
  );
