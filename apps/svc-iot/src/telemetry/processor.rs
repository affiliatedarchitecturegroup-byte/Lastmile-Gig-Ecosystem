//! Telemetry Processor - Analyzes incoming telemetry data for alerts.
//!
//! Applies threshold-based rules to detect anomalies in vehicle telemetry
//! and generates maintenance alerts for the fleet management system.
//!
//! See: docs/specs/06_BLOCKCHAIN_LAYER.md (IoT section)

use chrono::Utc;
use tracing::debug;
use uuid::Uuid;

use crate::config::AppConfig;
use crate::models::{AlertSeverity, AlertType, MaintenanceAlert, TelemetryEvent};

/// Processes telemetry events and generates maintenance alerts.
pub struct TelemetryProcessor {
    engine_temp_threshold: f64,
    battery_threshold: f64,
    speed_threshold: f64,
}

impl TelemetryProcessor {
    /// Create a new processor with thresholds from configuration.
    pub fn new(config: &AppConfig) -> Self {
        Self {
            engine_temp_threshold: config.engine_temp_threshold_c,
            battery_threshold: config.battery_threshold_pct,
            speed_threshold: config.speed_threshold_kmh,
        }
    }

    /// Check a telemetry event for alert conditions.
    ///
    /// Returns a list of alerts generated from the event. May return
    /// multiple alerts if several thresholds are breached simultaneously.
    pub fn check_alerts(&self, event: &TelemetryEvent) -> Vec<MaintenanceAlert> {
        let mut alerts = Vec::new();

        // Engine overheating check
        if event.engine_temp_c > self.engine_temp_threshold {
            let severity = if event.engine_temp_c > self.engine_temp_threshold + 20.0 {
                AlertSeverity::Emergency
            } else if event.engine_temp_c > self.engine_temp_threshold + 10.0 {
                AlertSeverity::Critical
            } else {
                AlertSeverity::Warning
            };

            alerts.push(MaintenanceAlert {
                id: Uuid::new_v4(),
                vehicle_id: event.vehicle_id.clone(),
                alert_type: AlertType::EngineOverheating,
                severity,
                message: format!(
                    "Engine temperature {:.1}C exceeds threshold of {:.1}C",
                    event.engine_temp_c, self.engine_temp_threshold
                ),
                value: event.engine_temp_c,
                threshold: self.engine_temp_threshold,
                created_at: Utc::now(),
            });
        }

        // Low battery check
        if let Some(battery_pct) = event.battery_pct {
            if battery_pct < self.battery_threshold {
                let severity = if battery_pct < 5.0 {
                    AlertSeverity::Critical
                } else {
                    AlertSeverity::Warning
                };

                alerts.push(MaintenanceAlert {
                    id: Uuid::new_v4(),
                    vehicle_id: event.vehicle_id.clone(),
                    alert_type: AlertType::LowBattery,
                    severity,
                    message: format!(
                        "Battery at {:.1}% below threshold of {:.1}%",
                        battery_pct, self.battery_threshold
                    ),
                    value: battery_pct,
                    threshold: self.battery_threshold,
                    created_at: Utc::now(),
                });
            }
        }

        // Excessive speed check
        if event.speed_kmh > self.speed_threshold {
            let severity = if event.speed_kmh > self.speed_threshold + 40.0 {
                AlertSeverity::Emergency
            } else if event.speed_kmh > self.speed_threshold + 20.0 {
                AlertSeverity::Critical
            } else {
                AlertSeverity::Warning
            };

            alerts.push(MaintenanceAlert {
                id: Uuid::new_v4(),
                vehicle_id: event.vehicle_id.clone(),
                alert_type: AlertType::ExcessiveSpeed,
                severity,
                message: format!(
                    "Speed {:.1}km/h exceeds threshold of {:.1}km/h",
                    event.speed_kmh, self.speed_threshold
                ),
                value: event.speed_kmh,
                threshold: self.speed_threshold,
                created_at: Utc::now(),
            });
        }

        // DTC error code check
        if !event.error_codes.is_empty() {
            alerts.push(MaintenanceAlert {
                id: Uuid::new_v4(),
                vehicle_id: event.vehicle_id.clone(),
                alert_type: AlertType::DtcError,
                severity: AlertSeverity::Warning,
                message: format!(
                    "Vehicle reporting {} DTC error codes: {}",
                    event.error_codes.len(),
                    event.error_codes.join(", ")
                ),
                value: event.error_codes.len() as f64,
                threshold: 0.0,
                created_at: Utc::now(),
            });
        }

        // Low fuel check
        if let Some(fuel_pct) = event.fuel_level_pct {
            if fuel_pct < 10.0 {
                alerts.push(MaintenanceAlert {
                    id: Uuid::new_v4(),
                    vehicle_id: event.vehicle_id.clone(),
                    alert_type: AlertType::LowFuel,
                    severity: AlertSeverity::Info,
                    message: format!("Fuel level at {:.1}%", fuel_pct),
                    value: fuel_pct,
                    threshold: 10.0,
                    created_at: Utc::now(),
                });
            }
        }

        if !alerts.is_empty() {
            debug!(
                "Generated {} alerts for vehicle {}",
                alerts.len(),
                event.vehicle_id
            );
        }

        alerts
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::AppConfig;

    fn test_config() -> AppConfig {
        AppConfig {
            port: 5001,
            database_url: "".into(),
            db_pool_size: 1,
            mqtt_broker_url: "".into(),
            mqtt_port: 1883,
            mqtt_client_id: "".into(),
            mqtt_telemetry_topic: "".into(),
            mqtt_diagnostics_topic: "".into(),
            mqtt_gps_topic: "".into(),
            kafka_brokers: "".into(),
            kafka_telemetry_topic: "".into(),
            kafka_maintenance_topic: "".into(),
            engine_temp_threshold_c: 110.0,
            battery_threshold_pct: 15.0,
            speed_threshold_kmh: 140.0,
            batch_size: 100,
            flush_interval_ms: 5000,
            retention_days: 90,
            log_level: "info".into(),
        }
    }

    fn test_event() -> TelemetryEvent {
        TelemetryEvent {
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
            error_codes: vec![],
        }
    }

    #[test]
    fn test_no_alerts_for_normal_values() {
        let processor = TelemetryProcessor::new(&test_config());
        let alerts = processor.check_alerts(&test_event());
        assert!(alerts.is_empty());
    }

    #[test]
    fn test_engine_overheating_alert() {
        let processor = TelemetryProcessor::new(&test_config());
        let mut event = test_event();
        event.engine_temp_c = 120.0;

        let alerts = processor.check_alerts(&event);
        assert_eq!(alerts.len(), 1);
        assert!(matches!(alerts[0].alert_type, AlertType::EngineOverheating));
        assert_eq!(alerts[0].severity, AlertSeverity::Warning);
    }

    #[test]
    fn test_critical_engine_overheating() {
        let processor = TelemetryProcessor::new(&test_config());
        let mut event = test_event();
        event.engine_temp_c = 125.0;

        let alerts = processor.check_alerts(&event);
        assert_eq!(alerts[0].severity, AlertSeverity::Critical);
    }

    #[test]
    fn test_low_battery_alert() {
        let processor = TelemetryProcessor::new(&test_config());
        let mut event = test_event();
        event.battery_pct = Some(10.0);

        let alerts = processor.check_alerts(&event);
        assert_eq!(alerts.len(), 1);
        assert!(matches!(alerts[0].alert_type, AlertType::LowBattery));
    }

    #[test]
    fn test_excessive_speed_alert() {
        let processor = TelemetryProcessor::new(&test_config());
        let mut event = test_event();
        event.speed_kmh = 160.0;

        let alerts = processor.check_alerts(&event);
        assert_eq!(alerts.len(), 1);
        assert!(matches!(alerts[0].alert_type, AlertType::ExcessiveSpeed));
    }

    #[test]
    fn test_dtc_error_alert() {
        let processor = TelemetryProcessor::new(&test_config());
        let mut event = test_event();
        event.error_codes = vec!["P0301".into(), "P0420".into()];

        let alerts = processor.check_alerts(&event);
        assert_eq!(alerts.len(), 1);
        assert!(matches!(alerts[0].alert_type, AlertType::DtcError));
    }

    #[test]
    fn test_multiple_alerts() {
        let processor = TelemetryProcessor::new(&test_config());
        let mut event = test_event();
        event.engine_temp_c = 120.0;
        event.battery_pct = Some(5.0);
        event.speed_kmh = 180.0;

        let alerts = processor.check_alerts(&event);
        assert_eq!(alerts.len(), 3);
    }
}
