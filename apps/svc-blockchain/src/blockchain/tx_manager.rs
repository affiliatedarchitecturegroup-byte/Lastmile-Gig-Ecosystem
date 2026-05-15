//! Transaction Manager - Handles transaction lifecycle, retries, and gas management.
//!
//! Manages the full lifecycle of blockchain transactions including:
//! - Gas price estimation with safety caps
//! - Nonce management
//! - Transaction confirmation with timeout
//! - Retry logic with exponential backoff
//!
//! See: docs/specs/06_BLOCKCHAIN_LAYER.md - Section 3

use std::time::Duration;

use ethers::types::{H256, U256};
use tracing::{info, warn, instrument};

use crate::config::AppConfig;
use crate::error::BlockchainError;

/// Transaction status tracking.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TxStatus {
    Pending,
    Confirmed { block_number: u64, gas_used: u64 },
    Failed { reason: String },
    TimedOut,
}

/// Transaction record for audit trail.
#[derive(Debug, Clone)]
pub struct TxRecord {
    pub tx_hash: H256,
    pub status: TxStatus,
    pub contract: String,
    pub method: String,
    pub gas_price_gwei: u64,
    pub submitted_at: chrono::DateTime<chrono::Utc>,
    pub confirmed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub retry_count: u32,
}

/// Transaction manager for blockchain operations.
pub struct TxManager {
    max_gas_price_gwei: u64,
    tx_timeout_secs: u64,
    confirmations: u64,
    max_retries: u32,
}

impl TxManager {
    /// Create a new transaction manager from config.
    pub fn new(config: &AppConfig) -> Self {
        Self {
            max_gas_price_gwei: config.max_gas_price_gwei,
            tx_timeout_secs: config.tx_timeout_secs,
            confirmations: config.confirmations,
            max_retries: 3,
        }
    }

    /// Check if the current gas price is within acceptable limits.
    #[instrument(skip(self))]
    pub fn check_gas_price(&self, current_gas_gwei: u64) -> Result<(), BlockchainError> {
        if current_gas_gwei > self.max_gas_price_gwei {
            warn!(
                "Gas price {} gwei exceeds max {} gwei",
                current_gas_gwei, self.max_gas_price_gwei
            );
            return Err(BlockchainError::GasPriceTooHigh {
                current: current_gas_gwei,
                max: self.max_gas_price_gwei,
            });
        }
        Ok(())
    }

    /// Calculate optimal gas price with buffer.
    pub fn calculate_gas_price(&self, base_gas_gwei: u64) -> u64 {
        // Add 10% buffer for priority
        let buffered = base_gas_gwei + (base_gas_gwei / 10);
        // Cap at maximum
        buffered.min(self.max_gas_price_gwei)
    }

    /// Get the transaction timeout duration.
    pub fn timeout_duration(&self) -> Duration {
        Duration::from_secs(self.tx_timeout_secs)
    }

    /// Get the required number of block confirmations.
    pub fn required_confirmations(&self) -> u64 {
        self.confirmations
    }

    /// Calculate retry delay with exponential backoff.
    pub fn retry_delay(&self, attempt: u32) -> Duration {
        let base_ms = 1000u64;
        let delay_ms = base_ms * 2u64.pow(attempt.min(5));
        Duration::from_millis(delay_ms)
    }

    /// Check if a retry should be attempted.
    pub fn should_retry(&self, attempt: u32, error: &BlockchainError) -> bool {
        if attempt >= self.max_retries {
            return false;
        }

        // Retry on transient errors only
        matches!(
            error,
            BlockchainError::ProviderError(_)
                | BlockchainError::TransactionTimeout(_)
                | BlockchainError::TransactionFailed(_)
        )
    }

    /// Create a transaction record for audit logging.
    pub fn create_record(
        &self,
        tx_hash: H256,
        contract: &str,
        method: &str,
        gas_price_gwei: u64,
    ) -> TxRecord {
        TxRecord {
            tx_hash,
            status: TxStatus::Pending,
            contract: contract.to_string(),
            method: method.to_string(),
            gas_price_gwei,
            submitted_at: chrono::Utc::now(),
            confirmed_at: None,
            retry_count: 0,
        }
    }

    /// Estimate gas for a contract call with safety margin.
    pub fn estimate_gas_with_margin(&self, estimated_gas: u64) -> u64 {
        // Add 20% safety margin
        estimated_gas + (estimated_gas / 5)
    }
}

/// Gas price oracle interface for multi-source gas estimation.
pub struct GasPriceOracle {
    fallback_gas_gwei: u64,
}

impl GasPriceOracle {
    pub fn new() -> Self {
        Self {
            fallback_gas_gwei: 5,
        }
    }

    /// Get the recommended gas price from multiple sources.
    pub fn recommended_gas_price(&self) -> u64 {
        // In production, this would query:
        // 1. RPC eth_gasPrice
        // 2. Gas station API
        // 3. Recent block analysis
        self.fallback_gas_gwei
    }
}

impl Default for GasPriceOracle {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_config() -> AppConfig {
        AppConfig {
            port: 5000,
            polygon_rpc_url: "".into(),
            chain_id: 31337,
            network_name: "test".into(),
            signer_private_key: "".into(),
            delivery_verification_address: "".into(),
            driver_payout_address: "".into(),
            partner_sla_address: "".into(),
            driver_identity_address: "".into(),
            kafka_brokers: "".into(),
            kafka_group_id: "".into(),
            kafka_orders_delivered_topic: "".into(),
            kafka_payments_topic: "".into(),
            enable_gas_estimation: true,
            max_gas_price_gwei: 50,
            tx_timeout_secs: 120,
            confirmations: 2,
            subgraph_endpoint: "".into(),
            log_level: "info".into(),
        }
    }

    #[test]
    fn test_gas_price_within_limit() {
        let mgr = TxManager::new(&test_config());
        assert!(mgr.check_gas_price(30).is_ok());
    }

    #[test]
    fn test_gas_price_exceeds_limit() {
        let mgr = TxManager::new(&test_config());
        assert!(mgr.check_gas_price(60).is_err());
    }

    #[test]
    fn test_calculate_gas_price_with_buffer() {
        let mgr = TxManager::new(&test_config());
        assert_eq!(mgr.calculate_gas_price(10), 11); // 10 + 10%
        assert_eq!(mgr.calculate_gas_price(50), 50); // Capped at max
    }

    #[test]
    fn test_retry_delay_exponential() {
        let mgr = TxManager::new(&test_config());
        assert_eq!(mgr.retry_delay(0).as_millis(), 1000);
        assert_eq!(mgr.retry_delay(1).as_millis(), 2000);
        assert_eq!(mgr.retry_delay(2).as_millis(), 4000);
    }

    #[test]
    fn test_should_not_retry_after_max() {
        let mgr = TxManager::new(&test_config());
        let err = BlockchainError::ProviderError("timeout".into());
        assert!(!mgr.should_retry(3, &err));
    }

    #[test]
    fn test_estimate_gas_with_margin() {
        let mgr = TxManager::new(&test_config());
        assert_eq!(mgr.estimate_gas_with_margin(100000), 120000); // +20%
    }
}
