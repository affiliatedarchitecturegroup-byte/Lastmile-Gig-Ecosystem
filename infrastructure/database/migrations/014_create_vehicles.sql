-- -------------------------------------------------------------------
-- Lastmile Gig Ecosystem - Vehicles Table
-- Phase: P074 | vehicles table, vehicle_type enum
-- -------------------------------------------------------------------

-- Vehicle type enum
DO $$ BEGIN
  CREATE TYPE vehicle_type AS ENUM (
    'electric_scooter',
    'petrol_scooter',
    'electric_bicycle',
    'bicycle',
    'motorcycle',
    'car',
    'van',
    'truck'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Vehicle status enum
DO $$ BEGIN
  CREATE TYPE vehicle_status AS ENUM (
    'available',
    'assigned',
    'in_use',
    'maintenance',
    'servicing',
    'retired',
    'stolen'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Fuel type enum
DO $$ BEGIN
  CREATE TYPE fuel_type AS ENUM (
    'electric',
    'petrol',
    'diesel',
    'hybrid',
    'human_powered'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_driver_id UUID REFERENCES drivers(id),

  -- Vehicle identity
  registration_number VARCHAR(20),
  vin VARCHAR(17),
  asset_tag VARCHAR(50) UNIQUE NOT NULL,
  vehicle_type vehicle_type NOT NULL,
  fuel_type fuel_type NOT NULL,
  status vehicle_status NOT NULL DEFAULT 'available',

  -- Vehicle details
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER,
  colour VARCHAR(50),
  max_payload_kg DECIMAL(6,2),

  -- IoT
  iot_device_id VARCHAR(100),
  iot_device_type VARCHAR(50),
  last_telemetry_at TIMESTAMPTZ,
  current_location GEOGRAPHY(POINT, 4326),
  current_battery_pct DECIMAL(5,2),
  total_distance_km DECIMAL(10,2) DEFAULT 0.00,

  -- Insurance
  insurance_provider VARCHAR(100),
  insurance_policy_number VARCHAR(100),
  insurance_expiry DATE,

  -- Maintenance
  last_service_date DATE,
  next_service_date DATE,
  total_service_count INTEGER DEFAULT 0,
  service_provider VARCHAR(100),

  -- Rental
  is_rental BOOLEAN DEFAULT TRUE,
  rental_rate_daily_zar DECIMAL(8,2),
  rental_deposit_zar DECIMAL(8,2),

  -- Zone
  home_zone VARCHAR(100),

  -- Timestamps
  acquired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retired_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_battery CHECK (current_battery_pct IS NULL OR (current_battery_pct >= 0 AND current_battery_pct <= 100)),
  CONSTRAINT valid_year CHECK (year IS NULL OR (year >= 2000 AND year <= 2030))
);

-- Indexes
CREATE INDEX idx_vehicles_type ON vehicles(vehicle_type);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_driver ON vehicles(assigned_driver_id) WHERE assigned_driver_id IS NOT NULL;
CREATE INDEX idx_vehicles_iot ON vehicles(iot_device_id) WHERE iot_device_id IS NOT NULL;
CREATE INDEX idx_vehicles_location ON vehicles USING GIST(current_location);
CREATE INDEX idx_vehicles_available ON vehicles(status, vehicle_type) WHERE status = 'available';
CREATE INDEX idx_vehicles_zone ON vehicles(home_zone);

-- Updated_at trigger
CREATE TRIGGER vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE vehicles IS 'Fleet vehicles including scooters, bicycles, and delivery vans with IoT telemetry';
