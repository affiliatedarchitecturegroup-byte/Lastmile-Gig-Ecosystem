-- -------------------------------------------------------------------
-- Lastmile Gig Ecosystem - TimescaleDB Hypertables
-- Phase: P085-P086 | vehicle_telemetry + carbon_events hypertables
-- -------------------------------------------------------------------

-- Ensure TimescaleDB extension is enabled (P030)
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ============================================================
-- P085: Vehicle Telemetry Hypertable
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_telemetry (
  time TIMESTAMPTZ NOT NULL,
  vehicle_id UUID NOT NULL,
  driver_id UUID,
  device_id VARCHAR(100) NOT NULL,

  -- Position
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  altitude DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  speed_kmh DOUBLE PRECISION,
  accuracy_meters DOUBLE PRECISION,

  -- Vehicle metrics
  battery_pct DOUBLE PRECISION,
  fuel_level_pct DOUBLE PRECISION,
  odometer_km DOUBLE PRECISION,
  engine_rpm INTEGER,
  engine_temp_c DOUBLE PRECISION,
  tire_pressure_kpa JSONB,

  -- Diagnostics
  dtc_codes TEXT[],
  is_ignition_on BOOLEAN,
  is_moving BOOLEAN,
  is_charging BOOLEAN,

  -- Environmental
  ambient_temp_c DOUBLE PRECISION,

  -- Metadata
  raw_payload JSONB
);

-- Convert to hypertable with time partitioning
SELECT create_hypertable('vehicle_telemetry', 'time',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- Compression policy (compress chunks older than 7 days)
ALTER TABLE vehicle_telemetry SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'vehicle_id',
  timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('vehicle_telemetry', INTERVAL '7 days', if_not_exists => TRUE);

-- Retention policy (drop data older than 180 days)
SELECT add_retention_policy('vehicle_telemetry', INTERVAL '180 days', if_not_exists => TRUE);

-- Indexes
CREATE INDEX idx_telemetry_vehicle ON vehicle_telemetry(vehicle_id, time DESC);
CREATE INDEX idx_telemetry_device ON vehicle_telemetry(device_id, time DESC);
CREATE INDEX idx_telemetry_driver ON vehicle_telemetry(driver_id, time DESC) WHERE driver_id IS NOT NULL;

-- Continuous aggregate: hourly vehicle summary
CREATE MATERIALIZED VIEW vehicle_telemetry_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time) AS bucket,
  vehicle_id,
  AVG(speed_kmh) AS avg_speed_kmh,
  MAX(speed_kmh) AS max_speed_kmh,
  AVG(battery_pct) AS avg_battery_pct,
  MIN(battery_pct) AS min_battery_pct,
  MAX(odometer_km) - MIN(odometer_km) AS distance_km,
  COUNT(*) AS data_points,
  SUM(CASE WHEN is_moving THEN 1 ELSE 0 END) AS moving_count,
  SUM(CASE WHEN is_charging THEN 1 ELSE 0 END) AS charging_count
FROM vehicle_telemetry
GROUP BY bucket, vehicle_id
WITH NO DATA;

SELECT add_continuous_aggregate_policy('vehicle_telemetry_hourly',
  start_offset => INTERVAL '3 hours',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists => TRUE
);

-- ============================================================
-- P086: Carbon Events Hypertable
-- ============================================================
CREATE TABLE IF NOT EXISTS carbon_events (
  time TIMESTAMPTZ NOT NULL,
  vehicle_id UUID NOT NULL,
  driver_id UUID,
  order_id UUID,

  -- Carbon metrics
  distance_km DOUBLE PRECISION NOT NULL,
  fuel_type VARCHAR(20) NOT NULL,
  carbon_emission_kg DOUBLE PRECISION NOT NULL,
  carbon_saved_vs_ice_kg DOUBLE PRECISION DEFAULT 0.00,

  -- Energy
  energy_consumed_kwh DOUBLE PRECISION,
  solar_energy_kwh DOUBLE PRECISION DEFAULT 0.00,
  grid_energy_kwh DOUBLE PRECISION DEFAULT 0.00,

  -- Context
  zone VARCHAR(100),
  trip_type VARCHAR(30),

  -- Metadata
  calculation_method VARCHAR(50) DEFAULT 'standard_emission_factor',
  emission_factor DOUBLE PRECISION
);

-- Convert to hypertable
SELECT create_hypertable('carbon_events', 'time',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- Compression
ALTER TABLE carbon_events SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'fuel_type',
  timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('carbon_events', INTERVAL '7 days', if_not_exists => TRUE);
SELECT add_retention_policy('carbon_events', INTERVAL '730 days', if_not_exists => TRUE);

-- Indexes
CREATE INDEX idx_carbon_vehicle ON carbon_events(vehicle_id, time DESC);
CREATE INDEX idx_carbon_fuel ON carbon_events(fuel_type, time DESC);
CREATE INDEX idx_carbon_zone ON carbon_events(zone, time DESC);

-- Continuous aggregate: daily carbon summary
CREATE MATERIALIZED VIEW carbon_daily_summary
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', time) AS bucket,
  fuel_type,
  zone,
  SUM(distance_km) AS total_distance_km,
  SUM(carbon_emission_kg) AS total_emission_kg,
  SUM(carbon_saved_vs_ice_kg) AS total_saved_kg,
  SUM(solar_energy_kwh) AS total_solar_kwh,
  COUNT(*) AS trip_count
FROM carbon_events
GROUP BY bucket, fuel_type, zone
WITH NO DATA;

SELECT add_continuous_aggregate_policy('carbon_daily_summary',
  start_offset => INTERVAL '2 days',
  end_offset => INTERVAL '1 day',
  schedule_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

COMMENT ON TABLE vehicle_telemetry IS 'IoT telemetry from fleet vehicles (TimescaleDB hypertable)';
COMMENT ON TABLE carbon_events IS 'Per-delivery carbon emission tracking for ESG reporting';
