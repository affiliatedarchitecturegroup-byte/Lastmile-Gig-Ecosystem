//! Blockchain Metrics - Prometheus metrics for blockchain operations.
//!
//! Tracks transaction counts, gas usage, latency, and error rates
//! for all blockchain interactions.
//!
//! See: docs/specs/09_OBSERVABILITY.md

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

/// Blockchain operation metrics.
#[derive(Debug, Clone)]
pub struct BlockchainMetrics {
    inner: Arc<MetricsInner>,
}

#[derive(Debug)]
struct MetricsInner {
    // Transaction counters
    tx_submitted: AtomicU64,
    tx_confirmed: AtomicU64,
    tx_failed: AtomicU64,
    tx_timed_out: AtomicU64,

    // Gas tracking
    total_gas_used: AtomicU64,
    gas_price_samples: AtomicU64,

    // Operation counters
    deliveries_recorded: AtomicU64,
    escrows_created: AtomicU64,
    payouts_released: AtomicU64,
    credentials_issued: AtomicU64,
    sla_breaches_recorded: AtomicU64,
    sla_settlements_executed: AtomicU64,

    // Error counters
    provider_errors: AtomicU64,
    gas_too_high_errors: AtomicU64,

    // Kafka counters
    kafka_events_received: AtomicU64,
    kafka_events_processed: AtomicU64,
    kafka_events_failed: AtomicU64,
}

impl BlockchainMetrics {
    /// Create a new metrics instance.
    pub fn new() -> Self {
        Self {
            inner: Arc::new(MetricsInner {
                tx_submitted: AtomicU64::new(0),
                tx_confirmed: AtomicU64::new(0),
                tx_failed: AtomicU64::new(0),
                tx_timed_out: AtomicU64::new(0),
                total_gas_used: AtomicU64::new(0),
                gas_price_samples: AtomicU64::new(0),
                deliveries_recorded: AtomicU64::new(0),
                escrows_created: AtomicU64::new(0),
                payouts_released: AtomicU64::new(0),
                credentials_issued: AtomicU64::new(0),
                sla_breaches_recorded: AtomicU64::new(0),
                sla_settlements_executed: AtomicU64::new(0),
                provider_errors: AtomicU64::new(0),
                gas_too_high_errors: AtomicU64::new(0),
                kafka_events_received: AtomicU64::new(0),
                kafka_events_processed: AtomicU64::new(0),
                kafka_events_failed: AtomicU64::new(0),
            }),
        }
    }

    // --- Transaction Metrics ---

    pub fn inc_tx_submitted(&self) {
        self.inner.tx_submitted.fetch_add(1, Ordering::Relaxed);
    }

    pub fn inc_tx_confirmed(&self) {
        self.inner.tx_confirmed.fetch_add(1, Ordering::Relaxed);
    }

    pub fn inc_tx_failed(&self) {
        self.inner.tx_failed.fetch_add(1, Ordering::Relaxed);
    }

    pub fn inc_tx_timed_out(&self) {
        self.inner.tx_timed_out.fetch_add(1, Ordering::Relaxed);
    }

    pub fn add_gas_used(&self, gas: u64) {
        self.inner.total_gas_used.fetch_add(gas, Ordering::Relaxed);
    }

    // --- Operation Metrics ---

    pub fn inc_deliveries_recorded(&self) {
        self.inner
            .deliveries_recorded
            .fetch_add(1, Ordering::Relaxed);
    }

    pub fn inc_escrows_created(&self) {
        self.inner.escrows_created.fetch_add(1, Ordering::Relaxed);
    }

    pub fn inc_payouts_released(&self) {
        self.inner.payouts_released.fetch_add(1, Ordering::Relaxed);
    }

    pub fn inc_credentials_issued(&self) {
        self.inner
            .credentials_issued
            .fetch_add(1, Ordering::Relaxed);
    }

    pub fn inc_sla_breaches(&self) {
        self.inner
            .sla_breaches_recorded
            .fetch_add(1, Ordering::Relaxed);
    }

    // --- Error Metrics ---

    pub fn inc_provider_errors(&self) {
        self.inner.provider_errors.fetch_add(1, Ordering::Relaxed);
    }

    pub fn inc_gas_too_high(&self) {
        self.inner
            .gas_too_high_errors
            .fetch_add(1, Ordering::Relaxed);
    }

    // --- Kafka Metrics ---

    pub fn inc_kafka_received(&self) {
        self.inner
            .kafka_events_received
            .fetch_add(1, Ordering::Relaxed);
    }

    pub fn inc_kafka_processed(&self) {
        self.inner
            .kafka_events_processed
            .fetch_add(1, Ordering::Relaxed);
    }

    pub fn inc_kafka_failed(&self) {
        self.inner
            .kafka_events_failed
            .fetch_add(1, Ordering::Relaxed);
    }

    // --- Snapshot ---

    /// Get a snapshot of all current metric values.
    pub fn snapshot(&self) -> MetricsSnapshot {
        MetricsSnapshot {
            tx_submitted: self.inner.tx_submitted.load(Ordering::Relaxed),
            tx_confirmed: self.inner.tx_confirmed.load(Ordering::Relaxed),
            tx_failed: self.inner.tx_failed.load(Ordering::Relaxed),
            tx_timed_out: self.inner.tx_timed_out.load(Ordering::Relaxed),
            total_gas_used: self.inner.total_gas_used.load(Ordering::Relaxed),
            deliveries_recorded: self.inner.deliveries_recorded.load(Ordering::Relaxed),
            escrows_created: self.inner.escrows_created.load(Ordering::Relaxed),
            payouts_released: self.inner.payouts_released.load(Ordering::Relaxed),
            credentials_issued: self.inner.credentials_issued.load(Ordering::Relaxed),
            sla_breaches_recorded: self.inner.sla_breaches_recorded.load(Ordering::Relaxed),
            provider_errors: self.inner.provider_errors.load(Ordering::Relaxed),
            kafka_events_received: self.inner.kafka_events_received.load(Ordering::Relaxed),
            kafka_events_processed: self.inner.kafka_events_processed.load(Ordering::Relaxed),
        }
    }
}

impl Default for BlockchainMetrics {
    fn default() -> Self {
        Self::new()
    }
}

/// Point-in-time snapshot of metrics for API responses.
#[derive(Debug, Clone, serde::Serialize)]
pub struct MetricsSnapshot {
    pub tx_submitted: u64,
    pub tx_confirmed: u64,
    pub tx_failed: u64,
    pub tx_timed_out: u64,
    pub total_gas_used: u64,
    pub deliveries_recorded: u64,
    pub escrows_created: u64,
    pub payouts_released: u64,
    pub credentials_issued: u64,
    pub sla_breaches_recorded: u64,
    pub provider_errors: u64,
    pub kafka_events_received: u64,
    pub kafka_events_processed: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metrics_increment() {
        let metrics = BlockchainMetrics::new();
        metrics.inc_tx_submitted();
        metrics.inc_tx_submitted();
        metrics.inc_tx_confirmed();
        metrics.inc_deliveries_recorded();

        let snap = metrics.snapshot();
        assert_eq!(snap.tx_submitted, 2);
        assert_eq!(snap.tx_confirmed, 1);
        assert_eq!(snap.deliveries_recorded, 1);
    }

    #[test]
    fn test_metrics_clone_shared() {
        let metrics = BlockchainMetrics::new();
        let clone = metrics.clone();

        metrics.inc_tx_submitted();
        let snap = clone.snapshot();
        assert_eq!(snap.tx_submitted, 1);
    }

    #[test]
    fn test_gas_tracking() {
        let metrics = BlockchainMetrics::new();
        metrics.add_gas_used(21000);
        metrics.add_gas_used(45000);

        let snap = metrics.snapshot();
        assert_eq!(snap.total_gas_used, 66000);
    }
}
