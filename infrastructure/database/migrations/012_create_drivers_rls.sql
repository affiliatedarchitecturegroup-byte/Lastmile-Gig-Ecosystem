-- -------------------------------------------------------------------
-- Lastmile Gig Ecosystem - Drivers Table + RLS
-- Phase: P072 | drivers table, driver_status enum, RLS
-- -------------------------------------------------------------------

-- Driver status enum
DO $$ BEGIN
  CREATE TYPE driver_status AS ENUM (
    'pending_verification',
    'document_review',
    'background_check',
    'training',
    'active',
    'on_delivery',
    'offline',
    'suspended',
    'deactivated',
    'terminated'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Driver tier enum
DO $$ BEGIN
  CREATE TYPE driver_tier AS ENUM (
    'bronze',
    'silver',
    'gold',
    'platinum',
    'diamond'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Driver fleet type enum
DO $$ BEGIN
  CREATE TYPE fleet_type AS ENUM (
    'rental',
    'contracted',
    'branded',
    'owner'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Driver profile
  licence_number VARCHAR(50) NOT NULL,
  licence_expiry DATE NOT NULL,
  licence_type VARCHAR(20) NOT NULL,
  id_number VARCHAR(20),
  prdp_number VARCHAR(50),
  prdp_expiry DATE,

  -- Status and tier
  status driver_status NOT NULL DEFAULT 'pending_verification',
  tier driver_tier NOT NULL DEFAULT 'bronze',
  fleet_type fleet_type NOT NULL DEFAULT 'rental',
  performance_score DECIMAL(5,2) DEFAULT 0.00,

  -- Zone assignment
  primary_zone VARCHAR(100) NOT NULL,
  secondary_zones TEXT[] DEFAULT '{}',
  current_location GEOGRAPHY(POINT, 4326),

  -- Financial
  bank_name VARCHAR(100),
  bank_account_number VARCHAR(30),
  bank_branch_code VARCHAR(10),
  bank_verified BOOLEAN DEFAULT FALSE,
  paystack_recipient_code VARCHAR(100),
  ozow_payout_id VARCHAR(100),

  -- Biometric
  biometric_enrolled BOOLEAN DEFAULT FALSE,
  biometric_vault_ref VARCHAR(255),
  last_biometric_check TIMESTAMPTZ,

  -- Metrics
  total_deliveries INTEGER DEFAULT 0,
  total_earnings_zar DECIMAL(12,2) DEFAULT 0.00,
  avg_rating DECIMAL(3,2) DEFAULT 0.00,
  total_ratings INTEGER DEFAULT 0,
  acceptance_rate DECIMAL(5,2) DEFAULT 0.00,
  completion_rate DECIMAL(5,2) DEFAULT 0.00,
  avg_delivery_time_minutes DECIMAL(6,2) DEFAULT 0.00,

  -- Vehicle assignment
  assigned_vehicle_id UUID,
  has_own_vehicle BOOLEAN DEFAULT FALSE,

  -- Compliance
  popia_consent_granted BOOLEAN DEFAULT FALSE,
  background_check_status VARCHAR(30) DEFAULT 'pending',
  background_check_date DATE,

  -- Timestamps
  onboarded_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT driver_user_unique UNIQUE (user_id),
  CONSTRAINT valid_performance_score CHECK (performance_score >= 0 AND performance_score <= 100),
  CONSTRAINT valid_rating CHECK (avg_rating >= 0 AND avg_rating <= 5)
);

-- Indexes
CREATE INDEX idx_drivers_user_id ON drivers(user_id);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_drivers_tier ON drivers(tier);
CREATE INDEX idx_drivers_zone ON drivers(primary_zone);
CREATE INDEX idx_drivers_fleet_type ON drivers(fleet_type);
CREATE INDEX idx_drivers_location ON drivers USING GIST(current_location);
CREATE INDEX idx_drivers_active ON drivers(status) WHERE status IN ('active', 'on_delivery');
CREATE INDEX idx_drivers_performance ON drivers(performance_score DESC);

-- Enable RLS
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Drivers can view their own record
CREATE POLICY drivers_select_own ON drivers
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- Drivers can update their own profile fields
CREATE POLICY drivers_update_own ON drivers
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Ops and admin can view all drivers
CREATE POLICY drivers_select_ops ON drivers
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'ADMIN', 'OPS_SENIOR', 'OPS_STAFF', 'FLEET_MANAGER')
  );

-- Only admin/ops can insert drivers
CREATE POLICY drivers_insert_admin ON drivers
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'ADMIN', 'OPS_SENIOR')
    OR auth.role() = 'service_role'
  );

-- Updated_at trigger
CREATE TRIGGER drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE drivers IS 'Driver profiles with performance metrics, zone assignments, and financial details';
