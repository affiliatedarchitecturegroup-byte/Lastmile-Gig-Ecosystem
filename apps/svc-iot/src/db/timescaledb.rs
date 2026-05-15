//! TimescaleDB client for IoT telemetry storage.
//!
//! Stores time-series telemetry data, GPS positions, diagnostics
//! snapshots, and maintenance alerts in TimescaleDB hypertables.
//!
//! See: docs/specs/07_DATABASE_ARCHITECTURE.md
//! See: infrastructure/database/migrations/009_create_timescaledb.sql

use sqlx::postgres::{PgPool, PgPoolOptions};
use tracing::{info, instrument};

use crate::config::AppConfig;
use crate::error::IoTError;
use crate::models::{
    DiagnosticsEvent, GpsPosition, MaintenanceAlert, TelemetryRecord, VehicleSummary,
};

/// TimescaleDB connection pool and query methods.
#[derive(Debug, Clone)]
pub struct TimescaleDb {
    pool: PgPool,
}

impl TimescaleDb {
    /// Create a new database connection pool.
    pub async fn new(config: &AppConfig) -> Result<Self, IoTError> {
        let pool = PgPoolOptions::new()
            .max_connections(config.db_pool_size)
            .connect(&config.database_url)
            .await
            .map_err(|e| IoTError::DatabaseError(e.to_string()))?;

        info!("TimescaleDB pool created with {} max connections", config.db_pool_size);

        Ok(Self { pool })
    }

    /// Insert a telemetry record into the hypertable.
    #[instrument(skip(self, record), fields(vehicle_id = %record.vehicle_id))]
    pub async fn insert_telemetry(&self, record: &TelemetryRecord) -> Result<(), IoTError> {
        sqlx::query(
            r#"
            INSERT INTO iot_telemetry (
                id, vehicle_id, recorded_at, latitude, longitude,
                speed_kmh, heading, altitude_m, engine_temp_c,
                battery_pct, fuel_level_pct, odometer_km, rpm,
                has_errors, error_codes
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
            )
            "#,
        )
        .bind(&record.id)
        .bind(&record.vehicle_id)
        .bind(&record.recorded_at)
        .bind(record.latitude)
        .bind(record.longitude)
        .bind(record.speed_kmh)
        .bind(record.heading)
        .bind(record.altitude_m)
        .bind(record.engine_temp_c)
        .bind(record.battery_pct)
        .bind(record.fuel_level_pct)
        .bind(record.odometer_km)
        .bind(record.rpm as i32)
        .bind(record.has_errors)
        .bind(&record.error_codes)
        .execute(&self.pool)
        .await
        .map_err(|e| IoTError::DatabaseError(e.to_string()))?;

        Ok(())
    }

    /// Insert a GPS position record.
    #[instrument(skip(self, position), fields(vehicle_id = %position.vehicle_id))]
    pub async fn insert_gps_position(&self, position: &GpsPosition) -> Result<(), IoTError> {
        sqlx::query(
            r#"
            INSERT INTO iot_gps_positions (
                vehicle_id, recorded_at, latitude, longitude,
                speed_kmh, heading, accuracy_m
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(&position.vehicle_id)
        .bind(&position.timestamp)
        .bind(position.latitude)
        .bind(position.longitude)
        .bind(position.speed_kmh)
        .bind(position.heading)
        .bind(position.accuracy_m)
        .execute(&self.pool)
        .await
        .map_err(|e| IoTError::DatabaseError(e.to_string()))?;

        Ok(())
    }

    /// Insert a diagnostics event.
    #[instrument(skip(self, event), fields(vehicle_id = %event.vehicle_id))]
    pub async fn insert_diagnostics(&self, event: &DiagnosticsEvent) -> Result<(), IoTError> {
        sqlx::query(
            r#"
            INSERT INTO iot_diagnostics (
                vehicle_id, recorded_at, dtc_codes, mil_status,
                coolant_temp_c, intake_temp_c, fuel_pressure_kpa,
                engine_load_pct, throttle_position_pct, voltage
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            "#,
        )
        .bind(&event.vehicle_id)
        .bind(&event.timestamp)
        .bind(&event.dtc_codes)
        .bind(event.mil_status)
        .bind(event.coolant_temp_c)
        .bind(event.intake_temp_c)
        .bind(event.fuel_pressure_kpa)
        .bind(event.engine_load_pct)
        .bind(event.throttle_position_pct)
        .bind(event.voltage)
        .execute(&self.pool)
        .await
        .map_err(|e| IoTError::DatabaseError(e.to_string()))?;

        Ok(())
    }

    /// Insert a maintenance alert.
    #[instrument(skip(self, alert), fields(vehicle_id = %alert.vehicle_id))]
    pub async fn insert_alert(&self, alert: &MaintenanceAlert) -> Result<(), IoTError> {
        sqlx::query(
            r#"
            INSERT INTO iot_maintenance_alerts (
                id, vehicle_id, alert_type, severity,
                message, value, threshold, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#,
        )
        .bind(&alert.id)
        .bind(&alert.vehicle_id)
        .bind(alert.alert_type.to_string())
        .bind(alert.severity.to_string())
        .bind(&alert.message)
        .bind(alert.value)
        .bind(alert.threshold)
        .bind(&alert.created_at)
        .execute(&self.pool)
        .await
        .map_err(|e| IoTError::DatabaseError(e.to_string()))?;

        Ok(())
    }

    /// Get the latest telemetry summary for all vehicles.
    #[instrument(skip(self))]
    pub async fn get_fleet_summary(&self) -> Result<Vec<VehicleSummary>, IoTError> {
        let rows = sqlx::query_as::<_, (String, chrono::DateTime<chrono::Utc>, f64, f64, f64, f64, Option<f64>, f64, i64)>(
            r#"
            SELECT DISTINCT ON (vehicle_id)
                vehicle_id, recorded_at, latitude, longitude,
                speed_kmh, engine_temp_c, battery_pct, odometer_km,
                0::bigint as active_alerts
            FROM iot_telemetry
            ORDER BY vehicle_id, recorded_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| IoTError::DatabaseError(e.to_string()))?;

        let summaries = rows
            .into_iter()
            .map(|row| VehicleSummary {
                vehicle_id: row.0,
                last_seen: row.1,
                last_latitude: row.2,
                last_longitude: row.3,
                last_speed_kmh: row.4,
                engine_temp_c: row.5,
                battery_pct: row.6,
                total_distance_km: row.7,
                active_alerts: row.8 as u32,
            })
            .collect();

        Ok(summaries)
    }

    /// Get the total count of tracked vehicles.
    pub async fn get_vehicle_count(&self) -> Result<u64, IoTError> {
        let row: (i64,) = sqlx::query_as(
            "SELECT COUNT(DISTINCT vehicle_id) FROM iot_telemetry",
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| IoTError::DatabaseError(e.to_string()))?;

        Ok(row.0 as u64)
    }

    /// Get total events processed.
    pub async fn get_event_count(&self) -> Result<u64, IoTError> {
        let row: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM iot_telemetry",
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| IoTError::DatabaseError(e.to_string()))?;

        Ok(row.0 as u64)
    }

    /// Check if the database connection is healthy.
    pub async fn is_connected(&self) -> bool {
        sqlx::query("SELECT 1")
            .execute(&self.pool)
            .await
            .is_ok()
    }
}
