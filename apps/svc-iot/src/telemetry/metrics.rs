//! IoT Metrics - Prometheus metrics for telemetry operations.
//!
//! Tracks event ingestion rates, alert counts, batch processing stats,
//! and geofence violations.
//!
//! See: docs/specs/09_OBSERVABILITY.md

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

/// IoT telemetry service metrics.
#[derive(Debug, Clone)]
pub struct IoTMetrics {
    inner: Arc<IoTMetricsInner>,
}

#[derive(Debug)]
struct IoTMetricsInner {
    // Ingestion
    telemetry_events_received: AtomicU64,
    gps_events_received: AtomicU64,
    diagnostics_events_received: AtomicU64,
    mqtt_messages_total: AtomicU64,
    http_ingestions_total: AtomicU64,

    // Processing
    events_processed: AtomicU64,
    events_failed: AtomicU64,
    batch_flushes: AtomicU64,
    batch_records_written: AtomicU64,

    // Alerts
    alerts_generated: AtomicU64,
    alerts_engine_overheating: AtomicU64,
    alerts_low_battery: AtomicU64,
    alerts_excessive_speed: AtomicU64,
    alerts_dtc_error: AtomicU64,
    alerts_geofence_violation: AtomicU64,

    // Vehicles
    active_vehicles: AtomicU64,
}

impl IoTMetrics {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(IoTMetricsInner {
                telemetry_events_received: AtomicU64::new(0),
                gps_events_received: AtomicU64::new(0),
                diagnostics_events_received: AtomicU64::new(0),
                mqtt_messages_total: AtomicU64::new(0),
                http_ingestions_total: AtomicU64::new(0),
                events_processed: AtomicU64::new(0),
                events_failed: AtomicU64::new(0),
                batch_flushes: AtomicU64::new(0),
                batch_records_written: AtomicU64::new(0),
                alerts_generated: AtomicU64::new(0),
                alerts_engine_overheating: AtomicU64::new(0),
                alerts_low_battery: AtomicU64::new(0),
                alerts_excessive_speed: AtomicU64::new(0),
                alerts_dtc_error: AtomicU64::new(0),
                alerts_geofence_violation: AtomicU64::new(0),
                active_vehicles: AtomicU64::new(0),
            }),
        }
    }

    pub fn inc_telemetry_received(&self) {
        self.inner.telemetry_events_received.fetch_add(1, Ordering::Relaxed);
    }

    pub fn inc_gps_received(&self) {
        self.inner.gps_events_received.fetch_add(1, Ordering::Relaxed);
    }

    pub fn inc_diagnostics_received(&self) {
        self.inner.diagnostics_events_received.fetch_add(1, Ordering::Relaxed);
    }

    pub fn inc_mqtt_messages(&self) {
        self.inner.mqtt_messages_total.fetch_add(1, Ordering::Relaxed);
    }

    pub fn inc_events_processed(&self) {
        self.inner.events_processed.fetch_add(1, Ordering::Relaxed);
    }

    pub fn inc_events_failed(&self) {
        self.inner.events_failed.fetch_add(1, Ordering::Relaxed);
    }

    pub fn inc_batch_flush(&self, records: u64) {
        self.inner.batch_flushes.fetch_add(1, Ordering::Relaxed);
        self.inner.batch_records_written.fetch_add(records, Ordering::Relaxed);
    }

    pub fn inc_alert(&self, alert_type: &str) {
        self.inner.alerts_generated.fetch_add(1, Ordering::Relaxed);
        match alert_type {
            "engine_overheating" => {
                self.inner.alerts_engine_overheating.fetch_add(1, Ordering::Relaxed);
            }
            "low_battery" => {
                self.inner.alerts_low_battery.fetch_add(1, Ordering::Relaxed);
            }
            "excessive_speed" => {
                self.inner.alerts_excessive_speed.fetch_add(1, Ordering::Relaxed);
            }
            "dtc_error" => {
                self.inner.alerts_dtc_error.fetch_add(1, Ordering::Relaxed);
            }
            "geofence_violation" => {
                self.inner.alerts_geofence_violation.fetch_add(1, Ordering::Relaxed);
            }
            _ => {}
        }
    }

    pub fn set_active_vehicles(&self, count: u64) {
        self.inner.active_vehicles.store(count, Ordering::Relaxed);
    }

    /// Get a snapshot of all metrics.
    pub fn snapshot(&self) -> IoTMetricsSnapshot {
        IoTMetricsSnapshot {
            telemetry_events_received: self.inner.telemetry_events_received.load(Ordering::Relaxed),
            gps_events_received: self.inner.gps_events_received.load(Ordering::Relaxed),
            diagnostics_events_received: self.inner.diagnostics_events_received.load(Ordering::Relaxed),
            mqtt_messages_total: self.inner.mqtt_messages_total.load(Ordering::Relaxed),
            events_processed: self.inner.events_processed.load(Ordering::Relaxed),
            events_failed: self.inner.events_failed.load(Ordering::Relaxed),
            batch_flushes: self.inner.batch_flushes.load(Ordering::Relaxed),
            batch_records_written: self.inner.batch_records_written.load(Ordering::Relaxed),
            alerts_generated: self.inner.alerts_generated.load(Ordering::Relaxed),
            geofence_violations: self.inner.alerts_geofence_violation.load(Ordering::Relaxed),
            active_vehicles: self.inner.active_vehicles.load(Ordering::Relaxed),
        }
    }
}

impl Default for IoTMetrics {
    fn default() -> Self {
        Self::new()
    }
}

/// Point-in-time snapshot of IoT metrics.
#[derive(Debug, Clone, serde::Serialize)]
pub struct IoTMetricsSnapshot {
    pub telemetry_events_received: u64,
    pub gps_events_received: u64,
    pub diagnostics_events_received: u64,
    pub mqtt_messages_total: u64,
    pub events_processed: u64,
    pub events_failed: u64,
    pub batch_flushes: u64,
    pub batch_records_written: u64,
    pub alerts_generated: u64,
    pub geofence_violations: u64,
    pub active_vehicles: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metrics_increment() {
        let metrics = IoTMetrics::new();
        metrics.inc_telemetry_received();
        metrics.inc_telemetry_received();
        metrics.inc_gps_received();
        metrics.inc_alert("engine_overheating");

        let snap = metrics.snapshot();
        assert_eq!(snap.telemetry_events_received, 2);
        assert_eq!(snap.gps_events_received, 1);
        assert_eq!(snap.alerts_generated, 1);
    }

    #[test]
    fn test_batch_metrics() {
        let metrics = IoTMetrics::new();
        metrics.inc_batch_flush(50);
        metrics.inc_batch_flush(100);

        let snap = metrics.snapshot();
        assert_eq!(snap.batch_flushes, 2);
        assert_eq!(snap.batch_records_written, 150);
    }
}
