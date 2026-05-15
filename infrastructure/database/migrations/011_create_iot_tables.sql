-- Migration: 011_create_iot_tables
-- Description: IoT telemetry hypertables for TimescaleDB
-- Author: Lastmile Gig Development Team
-- Date: 2026-05-15
--
-- These tables store real-time vehicle telemetry data from OBD-II devices
-- and GPS trackers. Uses TimescaleDB hypertables for efficient time-series
-- querying, automatic data partitioning, and retention policies.
--
-- See: POLYGLOT_ARCHITECTURE.md - Section 2.4
-- See: docs/specs/07_DATABASE_ARCHITECTURE.md

-- Ensure TimescaleDB extension is enabled
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Vehicle telemetry hypertable (primary time-series data)
CREATE TABLE IF NOT EXISTS iot_telemetry (
    id              UUID NOT NULL,
    vehicle_id      VARCHAR(36) NOT NULL,
    recorded_at     TIMESTAMPTZ NOT NULL,
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    speed_kmh       DOUBLE PRECISION NOT NULL DEFAULT 0,
    heading         DOUBLE PRECISION NOT NULL DEFAULT 0,
    altitude_m      DOUBLE PRECISION NOT NULL DEFAULT 0,
    engine_temp_c   DOUBLE PRECISION NOT NULL DEFAULT 0,
    battery_pct     DOUBLE PRECISION,
    fuel_level_pct  DOUBLE PRECISION,
    odometer_km     DOUBLE PRECISION NOT NULL DEFAULT 0,
    rpm             INTEGER NOT NULL DEFAULT 0,
    has_errors      BOOLEAN NOT NULL DEFAULT FALSE,
    error_codes     TEXT[] NOT NULL DEFAULT '{}',
    PRIMARY KEY (id, recorded_at)
);

-- Convert to TimescaleDB hypertable (partitioned by recorded_at)
SELECT create_hypertable('iot_telemetry', 'recorded_at',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Indexes for common query patterns
CREATE INDEX idx_iot_telemetry_vehicle ON iot_telemetry (vehicle_id, recorded_at DESC);
CREATE INDEX idx_iot_telemetry_errors ON iot_telemetry (has_errors, recorded_at DESC) WHERE has_errors = TRUE;
CREATE INDEX idx_iot_telemetry_speed ON iot_telemetry (speed_kmh, recorded_at DESC);

-- GPS position tracking hypertable
CREATE TABLE IF NOT EXISTS iot_gps_positions (
    vehicle_id      VARCHAR(36) NOT NULL,
    recorded_at     TIMESTAMPTZ NOT NULL,
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    speed_kmh       DOUBLE PRECISION NOT NULL DEFAULT 0,
    heading         DOUBLE PRECISION NOT NULL DEFAULT 0,
    accuracy_m      DOUBLE PRECISION NOT NULL DEFAULT 0,
    PRIMARY KEY (vehicle_id, recorded_at)
);

SELECT create_hypertable('iot_gps_positions', 'recorded_at',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

CREATE INDEX idx_gps_positions_vehicle ON iot_gps_positions (vehicle_id, recorded_at DESC);

-- OBD-II diagnostics snapshots hypertable
CREATE TABLE IF NOT EXISTS iot_diagnostics (
    vehicle_id          VARCHAR(36) NOT NULL,
    recorded_at         TIMESTAMPTZ NOT NULL,
    dtc_codes           TEXT[] NOT NULL DEFAULT '{}',
    mil_status          BOOLEAN NOT NULL DEFAULT FALSE,
    coolant_temp_c      DOUBLE PRECISION NOT NULL DEFAULT 0,
    intake_temp_c       DOUBLE PRECISION NOT NULL DEFAULT 0,
    fuel_pressure_kpa   DOUBLE PRECISION NOT NULL DEFAULT 0,
    engine_load_pct     DOUBLE PRECISION NOT NULL DEFAULT 0,
    throttle_position_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
    voltage             DOUBLE PRECISION NOT NULL DEFAULT 0,
    PRIMARY KEY (vehicle_id, recorded_at)
);

SELECT create_hypertable('iot_diagnostics', 'recorded_at',
    chunk_time_interval => INTERVAL '7 days',
    if_not_exists => TRUE
);

CREATE INDEX idx_diagnostics_vehicle ON iot_diagnostics (vehicle_id, recorded_at DESC);
CREATE INDEX idx_diagnostics_mil ON iot_diagnostics (mil_status, recorded_at DESC) WHERE mil_status = TRUE;

-- Maintenance alerts table
CREATE TABLE IF NOT EXISTS iot_maintenance_alerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id      VARCHAR(36) NOT NULL,
    alert_type      VARCHAR(30) NOT NULL,
    severity        VARCHAR(15) NOT NULL,
    message         TEXT NOT NULL,
    value           DOUBLE PRECISION NOT NULL,
    threshold       DOUBLE PRECISION NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged    BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledged_by UUID,
    acknowledged_at TIMESTAMPTZ,
    resolved        BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at     TIMESTAMPTZ,
    CONSTRAINT chk_alert_severity CHECK (severity IN ('info', 'warning', 'critical', 'emergency')),
    CONSTRAINT chk_alert_type CHECK (alert_type IN (
        'engine_overheating', 'low_battery', 'excessive_speed',
        'dtc_error', 'low_fuel', 'geofence_violation', 'maintenance_due'
    ))
);

CREATE INDEX idx_alerts_vehicle ON iot_maintenance_alerts (vehicle_id, created_at DESC);
CREATE INDEX idx_alerts_severity ON iot_maintenance_alerts (severity, created_at DESC);
CREATE INDEX idx_alerts_unacknowledged ON iot_maintenance_alerts (acknowledged, created_at DESC)
    WHERE acknowledged = FALSE;

-- Geofence definitions
CREATE TABLE IF NOT EXISTS iot_geofences (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    center_latitude DOUBLE PRECISION NOT NULL,
    center_longitude DOUBLE PRECISION NOT NULL,
    radius_km       DOUBLE PRECISION NOT NULL,
    vehicle_ids     TEXT[] NOT NULL DEFAULT '{}',
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Continuous aggregate for hourly vehicle stats
CREATE MATERIALIZED VIEW IF NOT EXISTS iot_vehicle_hourly_stats
WITH (timescaledb.continuous) AS
SELECT
    vehicle_id,
    time_bucket('1 hour', recorded_at) AS bucket,
    AVG(speed_kmh) AS avg_speed_kmh,
    MAX(speed_kmh) AS max_speed_kmh,
    AVG(engine_temp_c) AS avg_engine_temp_c,
    MAX(engine_temp_c) AS max_engine_temp_c,
    AVG(battery_pct) AS avg_battery_pct,
    MAX(odometer_km) - MIN(odometer_km) AS distance_km,
    COUNT(*) AS sample_count
FROM iot_telemetry
GROUP BY vehicle_id, bucket
WITH NO DATA;

-- Retention policy: drop telemetry data older than 90 days
SELECT add_retention_policy('iot_telemetry', INTERVAL '90 days', if_not_exists => TRUE);
SELECT add_retention_policy('iot_gps_positions', INTERVAL '90 days', if_not_exists => TRUE);
SELECT add_retention_policy('iot_diagnostics', INTERVAL '180 days', if_not_exists => TRUE);

-- Continuous aggregate refresh policy
SELECT add_continuous_aggregate_policy('iot_vehicle_hourly_stats',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- RLS policies
ALTER TABLE iot_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_gps_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_maintenance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_geofences ENABLE ROW LEVEL SECURITY;

CREATE POLICY iot_svc_all ON iot_telemetry FOR ALL
    USING (current_setting('app.role', true) IN ('service', 'admin', 'super_admin', 'fleet_manager'));

CREATE POLICY gps_svc_all ON iot_gps_positions FOR ALL
    USING (current_setting('app.role', true) IN ('service', 'admin', 'super_admin', 'fleet_manager'));

CREATE POLICY diag_svc_all ON iot_diagnostics FOR ALL
    USING (current_setting('app.role', true) IN ('service', 'admin', 'super_admin', 'fleet_manager'));

CREATE POLICY alert_svc_all ON iot_maintenance_alerts FOR ALL
    USING (current_setting('app.role', true) IN ('service', 'admin', 'super_admin', 'fleet_manager', 'ops_staff'));

CREATE POLICY geofence_svc_all ON iot_geofences FOR ALL
    USING (current_setting('app.role', true) IN ('service', 'admin', 'super_admin', 'fleet_manager'));
