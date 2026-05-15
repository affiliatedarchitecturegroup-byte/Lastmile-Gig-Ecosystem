//! Batch Processor - Buffers and batch-inserts telemetry records.
//!
//! Accumulates telemetry events in memory and flushes them to TimescaleDB
//! in batches for improved write throughput. Flushes occur when either
//! the batch size limit or the time interval is reached.
//!
//! See: POLYGLOT_ARCHITECTURE.md - Section 2.4

use std::sync::Arc;
use std::time::Duration;

use tokio::sync::Mutex;
use tokio::time::interval;
use tracing::{debug, error, info, instrument, warn};

use crate::config::AppConfig;
use crate::db::timescaledb::TimescaleDb;
use crate::error::IoTError;
use crate::models::TelemetryRecord;

/// Telemetry batch processor with configurable batch size and flush interval.
pub struct BatchProcessor {
    buffer: Arc<Mutex<Vec<TelemetryRecord>>>,
    batch_size: usize,
    flush_interval_ms: u64,
    total_flushed: Arc<Mutex<u64>>,
    total_dropped: Arc<Mutex<u64>>,
}

impl BatchProcessor {
    /// Create a new batch processor.
    pub fn new(config: &AppConfig) -> Self {
        info!(
            "Batch processor initialized: batch_size={}, flush_interval={}ms",
            config.batch_size, config.flush_interval_ms
        );

        Self {
            buffer: Arc::new(Mutex::new(Vec::with_capacity(config.batch_size))),
            batch_size: config.batch_size,
            flush_interval_ms: config.flush_interval_ms,
            total_flushed: Arc::new(Mutex::new(0)),
            total_dropped: Arc::new(Mutex::new(0)),
        }
    }

    /// Add a telemetry record to the batch buffer.
    ///
    /// If the buffer reaches the batch size, triggers an immediate flush.
    #[instrument(skip(self, record), fields(vehicle_id = %record.vehicle_id))]
    pub async fn add(&self, record: TelemetryRecord) -> Result<bool, IoTError> {
        let mut buffer = self.buffer.lock().await;
        buffer.push(record);

        if buffer.len() >= self.batch_size {
            debug!("Batch size reached ({}), flush needed", buffer.len());
            return Ok(true); // Signal that flush is needed
        }

        Ok(false)
    }

    /// Flush all buffered records to the database.
    #[instrument(skip(self, db))]
    pub async fn flush(&self, db: &TimescaleDb) -> Result<usize, IoTError> {
        let records = {
            let mut buffer = self.buffer.lock().await;
            if buffer.is_empty() {
                return Ok(0);
            }
            std::mem::take(&mut *buffer)
        };

        let count = records.len();
        debug!("Flushing {} telemetry records", count);

        let mut success_count = 0;
        let mut error_count = 0;

        for record in &records {
            match db.insert_telemetry(record).await {
                Ok(_) => success_count += 1,
                Err(e) => {
                    error_count += 1;
                    error!(
                        "Failed to insert telemetry for vehicle {}: {}",
                        record.vehicle_id, e
                    );
                }
            }
        }

        // Update counters
        {
            let mut flushed = self.total_flushed.lock().await;
            *flushed += success_count as u64;
        }

        if error_count > 0 {
            let mut dropped = self.total_dropped.lock().await;
            *dropped += error_count as u64;
            warn!(
                "Batch flush: {}/{} succeeded, {} failed",
                success_count, count, error_count
            );
        } else {
            info!("Batch flush: {} records written", success_count);
        }

        Ok(success_count)
    }

    /// Start the periodic flush task.
    ///
    /// Runs in the background and flushes the buffer at the configured interval.
    pub async fn start_periodic_flush(self: Arc<Self>, db: TimescaleDb) {
        let mut tick = interval(Duration::from_millis(self.flush_interval_ms));

        loop {
            tick.tick().await;

            match self.flush(&db).await {
                Ok(count) => {
                    if count > 0 {
                        debug!("Periodic flush: {} records", count);
                    }
                }
                Err(e) => {
                    error!("Periodic flush error: {}", e);
                }
            }
        }
    }

    /// Get the current buffer size.
    pub async fn buffer_size(&self) -> usize {
        self.buffer.lock().await.len()
    }

    /// Get total records flushed.
    pub async fn total_flushed(&self) -> u64 {
        *self.total_flushed.lock().await
    }

    /// Get total records dropped due to errors.
    pub async fn total_dropped(&self) -> u64 {
        *self.total_dropped.lock().await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use uuid::Uuid;

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
            batch_size: 5,
            flush_interval_ms: 1000,
            retention_days: 90,
            log_level: "info".into(),
        }
    }

    fn test_record(vehicle_id: &str) -> TelemetryRecord {
        TelemetryRecord {
            id: Uuid::new_v4(),
            vehicle_id: vehicle_id.into(),
            recorded_at: Utc::now(),
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
            has_errors: false,
            error_codes: vec![],
        }
    }

    #[tokio::test]
    async fn test_add_below_batch_size() {
        let processor = BatchProcessor::new(&test_config());
        let needs_flush = processor.add(test_record("VEH-001")).await.unwrap();
        assert!(!needs_flush);
        assert_eq!(processor.buffer_size().await, 1);
    }

    #[tokio::test]
    async fn test_add_at_batch_size() {
        let config = test_config();
        let processor = BatchProcessor::new(&config);

        for i in 0..4 {
            let result = processor
                .add(test_record(&format!("VEH-{:03}", i)))
                .await
                .unwrap();
            assert!(!result);
        }

        let needs_flush = processor.add(test_record("VEH-004")).await.unwrap();
        assert!(needs_flush);
        assert_eq!(processor.buffer_size().await, 5);
    }
}
