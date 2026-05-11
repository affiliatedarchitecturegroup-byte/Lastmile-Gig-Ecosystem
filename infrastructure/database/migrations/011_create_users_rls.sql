-- -------------------------------------------------------------------
-- Lastmile Gig Ecosystem - Users Table + RLS
-- Phase: P071 | users table, roles enum, RLS policies
-- -------------------------------------------------------------------

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Soft delete function
CREATE OR REPLACE FUNCTION soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  NEW.deleted_at = NOW();
  NEW.is_active = FALSE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- User role enum
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'SUPER_ADMIN',
    'ADMIN',
    'OPS_SENIOR',
    'OPS_STAFF',
    'FLEET_MANAGER',
    'FINANCE',
    'ESG_OFFICER',
    'PARTNER_ADMIN',
    'PARTNER_STAFF',
    'INVESTOR',
    'DEVELOPER',
    'DRIVER',
    'CUSTOMER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_id VARCHAR(128) UNIQUE,
  cognito_id VARCHAR(128) UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(200),
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'CUSTOMER',

  -- Account status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,

  -- Profile
  preferred_language VARCHAR(5) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'Africa/Johannesburg',
  address_line_1 VARCHAR(255),
  address_line_2 VARCHAR(255),
  city VARCHAR(100),
  province VARCHAR(100),
  postal_code VARCHAR(10),
  country VARCHAR(2) DEFAULT 'ZA',
  geo_location GEOGRAPHY(POINT, 4326),

  -- Metadata
  last_login_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT phone_format CHECK (phone IS NULL OR phone ~* '^\+?[0-9]{10,15}$')
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_auth0_id ON users(auth0_id) WHERE auth0_id IS NOT NULL;
CREATE INDEX idx_users_cognito_id ON users(cognito_id) WHERE cognito_id IS NOT NULL;
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_geo ON users USING GIST(geo_location);

-- Full-text search index
CREATE INDEX idx_users_search ON users USING GIN(
  to_tsvector('english', coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(email, ''))
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own record
CREATE POLICY users_select_own ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own record
CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin and ops can read all users
CREATE POLICY users_select_admin ON users
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'ADMIN', 'OPS_SENIOR', 'OPS_STAFF')
  );

-- Only admin can create/delete users
CREATE POLICY users_insert_admin ON users
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'ADMIN')
  );

-- Auto-insert policy for new registrations (via service role)
CREATE POLICY users_insert_service ON users
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
  );

-- Updated_at trigger
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE users IS 'Core user accounts for all platform roles';
