-- Migration 003: Drivers Table
-- @see docs/specs/07_DATABASE_ARCHITECTURE.md - Section 2.2
-- @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md

CREATE TABLE drivers (
  id                UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  licence_number    TEXT,
  licence_expiry    DATE,
  biometric_ref     TEXT,
  vehicle_type      vehicle_type,
  status            driver_status DEFAULT 'onboarding',
  performance_score DECIMAL(5,2),
  zone              TEXT,
  wallet_address    TEXT,
  onboarded_at      TIMESTAMPTZ,
  insurance_tier    insurance_tier DEFAULT 'basic',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_drivers_zone ON drivers(zone);
CREATE INDEX idx_drivers_vehicle_type ON drivers(vehicle_type);
CREATE INDEX idx_drivers_performance ON drivers(performance_score);

-- Trigger: auto-update updated_at
CREATE TRIGGER tr_drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Drivers can read their own record
CREATE POLICY "drivers_read_own" ON drivers
  FOR SELECT USING (id = auth.uid());

-- Ops can read all drivers
CREATE POLICY "ops_read_all_drivers" ON drivers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin', 'ops_staff', 'ops_senior', 'fleet_manager')
    )
  );
