-- Migration 009: TimescaleDB Hypertables for IoT & ESG
-- @see docs/specs/07_DATABASE_ARCHITECTURE.md - Section 5

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Vehicle telemetry hypertable
CREATE TABLE vehicle_telemetry (
  time            TIMESTAMPTZ NOT NULL,
  vehicle_id      UUID NOT NULL,
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  speed_kmh       REAL,
  battery_pct     REAL,
  engine_temp_c   REAL,
  fuel_pct        REAL,
  odometer_km     REAL,
  error_codes     TEXT[]
);

SELECT create_hypertable('vehicle_telemetry', 'time');

-- Retention policy: 90 days hot
SELECT add_retention_policy('vehicle_telemetry', INTERVAL '90 days');

-- Continuous aggregate: hourly averages for dashboard
CREATE MATERIALIZED VIEW vehicle_hourly_avg
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time) AS bucket,
  vehicle_id,
  AVG(speed_kmh) AS avg_speed,
  AVG(battery_pct) AS avg_battery,
  AVG(engine_temp_c) AS avg_temp,
  COUNT(*) AS sample_count
FROM vehicle_telemetry
GROUP BY bucket, vehicle_id;

-- Carbon footprint tracking hypertable
CREATE TABLE carbon_events (
  time        TIMESTAMPTZ NOT NULL,
  vehicle_id  UUID NOT NULL,
  order_id    UUID,
  route_km    REAL,
  is_ev       BOOLEAN,
  co2_kg      REAL,
  zone        TEXT
);

SELECT create_hypertable('carbon_events', 'time');

-- Daily carbon aggregate
CREATE MATERIALIZED VIEW carbon_daily
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', time) AS day,
  zone,
  is_ev,
  SUM(co2_kg) AS total_co2_kg,
  SUM(route_km) AS total_km,
  COUNT(*) AS delivery_count
FROM carbon_events
GROUP BY day, zone, is_ev;
