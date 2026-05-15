//! Data models for the IoT telemetry service.
//!
//! Represents vehicle telemetry events, diagnostics data,
//! GPS tracking points, and maintenance alerts.
//!
//! See: POLYGLOT_ARCHITECTURE.md - Section 2.4

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// --- Telemetry Event ---

/// Raw telemetry event received from a vehicle OBD-II device via MQTT.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelemetryEvent {
    pub vehicle_id: String,
    pub timestamp: DateTime<Utc>,
    pub latitude: f64,
    pub longitude: f64,
    pub speed_kmh: f64,
    pub heading: f64,
    pub altitude_m: f64,
    pub engine_temp_c: f64,
    pub battery_pct: Option<f64>,
    pub fuel_level_pct: Option<f64>,
    pub odometer_km: f64,
    pub rpm: u32,
    pub error_codes: Vec<String>,
}

/// Processed telemetry record ready for database insertion.
#[derive(Debug, Clone, Serialize)]
pub struct TelemetryRecord {
    pub id: Uuid,
    pub vehicle_id: String,
    pub recorded_at: DateTime<Utc>,
    pub latitude: f64,
    pub longitude: f64,
    pub speed_kmh: f64,
    pub heading: f64,
    pub altitude_m: f64,
    pub engine_temp_c: f64,
    pub battery_pct: Option<f64>,
    pub fuel_level_pct: Option<f64>,
    pub odometer_km: f64,
    pub rpm: u32,
    pub has_errors: bool,
    pub error_codes: Vec<String>,
}

impl TelemetryRecord {
    /// Create a record from a raw telemetry event.
    pub fn from_event(event: TelemetryEvent) -> Self {
        Self {
            id: Uuid::new_v4(),
            vehicle_id: event.vehicle_id,
            recorded_at: event.timestamp,
            latitude: event.latitude,
            longitude: event.longitude,
            speed_kmh: event.speed_kmh,
            heading: event.heading,
            altitude_m: event.altitude_m,
            engine_temp_c: event.engine_temp_c,
            battery_pct: event.battery_pct,
            fuel_level_pct: event.fuel_level_pct,
            odometer_km: event.odometer_km,
            rpm: event.rpm,
            has_errors: !event.error_codes.is_empty(),
            error_codes: event.error_codes,
        }
    }
}

// --- GPS Tracking ---

/// GPS position update from a vehicle tracker.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpsPosition {
    pub vehicle_id: String,
    pub timestamp: DateTime<Utc>,
    pub latitude: f64,
    pub longitude: f64,
    pub speed_kmh: f64,
    pub heading: f64,
    pub accuracy_m: f64,
}

// --- Diagnostics ---

/// OBD-II diagnostics snapshot from a vehicle.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagnosticsEvent {
    pub vehicle_id: String,
    pub timestamp: DateTime<Utc>,
    pub dtc_codes: Vec<String>,
    pub mil_status: bool,
    pub coolant_temp_c: f64,
    pub intake_temp_c: f64,
    pub fuel_pressure_kpa: f64,
    pub engine_load_pct: f64,
    pub throttle_position_pct: f64,
    pub voltage: f64,
}

// --- Maintenance Alert ---

/// Severity levels for maintenance alerts.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AlertSeverity {
    #[serde(rename = "info")]
    Info,
    #[serde(rename = "warning")]
    Warning,
    #[serde(rename = "critical")]
    Critical,
    #[serde(rename = "emergency")]
    Emergency,
}

impl std::fmt::Display for AlertSeverity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AlertSeverity::Info => write!(f, "info"),
            AlertSeverity::Warning => write!(f, "warning"),
            AlertSeverity::Critical => write!(f, "critical"),
            AlertSeverity::Emergency => write!(f, "emergency"),
        }
    }
}

/// Alert type enumeration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AlertType {
    #[serde(rename = "engine_overheating")]
    EngineOverheating,
    #[serde(rename = "low_battery")]
    LowBattery,
    #[serde(rename = "excessive_speed")]
    ExcessiveSpeed,
    #[serde(rename = "dtc_error")]
    DtcError,
    #[serde(rename = "low_fuel")]
    LowFuel,
    #[serde(rename = "geofence_violation")]
    GeofenceViolation,
    #[serde(rename = "maintenance_due")]
    MaintenanceDue,
}

impl std::fmt::Display for AlertType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AlertType::EngineOverheating => write!(f, "engine_overheating"),
            AlertType::LowBattery => write!(f, "low_battery"),
            AlertType::ExcessiveSpeed => write!(f, "excessive_speed"),
            AlertType::DtcError => write!(f, "dtc_error"),
            AlertType::LowFuel => write!(f, "low_fuel"),
            AlertType::GeofenceViolation => write!(f, "geofence_violation"),
            AlertType::MaintenanceDue => write!(f, "maintenance_due"),
        }
    }
}

/// Maintenance alert generated from telemetry analysis.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaintenanceAlert {
    pub id: Uuid,
    pub vehicle_id: String,
    pub alert_type: AlertType,
    pub severity: AlertSeverity,
    pub message: String,
    pub value: f64,
    pub threshold: f64,
    pub created_at: DateTime<Utc>,
}

// --- API Response Models ---

/// Telemetry query parameters.
#[derive(Debug, Deserialize)]
pub struct TelemetryQuery {
    pub vehicle_id: Option<String>,
    pub from: Option<DateTime<Utc>>,
    pub to: Option<DateTime<Utc>>,
    pub limit: Option<u32>,
}

/// Vehicle summary for fleet overview.
#[derive(Debug, Serialize)]
pub struct VehicleSummary {
    pub vehicle_id: String,
    pub last_seen: DateTime<Utc>,
    pub last_latitude: f64,
    pub last_longitude: f64,
    pub last_speed_kmh: f64,
    pub engine_temp_c: f64,
    pub battery_pct: Option<f64>,
    pub total_distance_km: f64,
    pub active_alerts: u32,
}

/// Health check response for the IoT service.
#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub service: String,
    pub version: String,
    pub database_connected: bool,
    pub mqtt_connected: bool,
    pub vehicles_tracked: u64,
    pub events_processed: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_telemetry_record_from_event() {
        let event = TelemetryEvent {
            vehicle_id: "VEH-001".into(),
            timestamp: Utc::now(),
            latitude: -29.858681,
            longitude: 31.021839,
            speed_kmh: 60.0,
            heading: 180.0,
            altitude_m: 25.0,
            engine_temp_c: 92.0,
            battery_pct: Some(85.0),
            fuel_level_pct: Some(45.0),
            odometer_km: 12500.0,
            rpm: 2500,
            error_codes: vec!["P0301".into()],
        };

        let record = TelemetryRecord::from_event(event);
        assert_eq!(record.vehicle_id, "VEH-001");
        assert!(record.has_errors);
        assert_eq!(record.error_codes.len(), 1);
    }

    #[test]
    fn test_alert_severity_display() {
        assert_eq!(AlertSeverity::Critical.to_string(), "critical");
        assert_eq!(AlertSeverity::Warning.to_string(), "warning");
    }
}
