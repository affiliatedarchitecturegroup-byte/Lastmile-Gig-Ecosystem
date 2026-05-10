-- Migration 005: Vehicles (Fleet) Table
-- @see docs/specs/07_DATABASE_ARCHITECTURE.md - Section 2.2

CREATE TABLE vehicles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration        TEXT UNIQUE,
  type                vehicle_type,
  make                TEXT,
  model               TEXT,
  year                INTEGER,
  is_ev               BOOLEAN DEFAULT FALSE,
  status              vehicle_status DEFAULT 'available',
  current_driver_id   UUID REFERENCES drivers(id),
  odometer_km         DECIMAL(10,2),
  last_service_date   DATE,
  next_service_km     DECIMAL(10,2),
  iot_device_id       TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_type ON vehicles(type);
CREATE INDEX idx_vehicles_current_driver ON vehicles(current_driver_id);
CREATE INDEX idx_vehicles_is_ev ON vehicles(is_ev);

CREATE TRIGGER tr_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
