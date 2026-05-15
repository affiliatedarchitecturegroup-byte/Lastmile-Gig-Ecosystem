//! Application configuration loaded from environment variables.
//!
//! All secrets are sourced from HashiCorp Vault or AWS Secrets Manager
//! at runtime -- never hardcoded.
//!
//! See: docs/specs/06_BLOCKCHAIN_LAYER.md - Section 5

use serde::Deserialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("Missing environment variable: {0}")]
    MissingEnvVar(String),

    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),

    #[error("Environment parse error: {0}")]
    EnvParseError(#[from] envy::Error),
}

/// Application configuration deserialized from environment variables.
#[derive(Debug, Clone, Deserialize)]
pub struct AppConfig {
    /// Service port (default: 5000)
    #[serde(default = "default_port")]
    pub port: u16,

    /// Polygon CDK RPC endpoint URL
    #[serde(default = "default_rpc_url")]
    pub polygon_rpc_url: String,

    /// Chain ID for the target network
    #[serde(default = "default_chain_id")]
    pub chain_id: u64,

    /// Human-readable network name
    #[serde(default = "default_network_name")]
    pub network_name: String,

    /// Deployer/signer wallet private key (loaded from Vault)
    #[serde(default)]
    pub signer_private_key: String,

    /// DeliveryVerification contract address
    #[serde(default)]
    pub delivery_verification_address: String,

    /// DriverPayout contract address
    #[serde(default)]
    pub driver_payout_address: String,

    /// PartnerSLA contract address
    #[serde(default)]
    pub partner_sla_address: String,

    /// DriverIdentity contract address
    #[serde(default)]
    pub driver_identity_address: String,

    /// Kafka broker list
    #[serde(default = "default_kafka_brokers")]
    pub kafka_brokers: String,

    /// Kafka consumer group ID
    #[serde(default = "default_kafka_group_id")]
    pub kafka_group_id: String,

    /// Kafka topic for delivered orders
    #[serde(default = "default_kafka_orders_delivered_topic")]
    pub kafka_orders_delivered_topic: String,

    /// Kafka topic for payment events
    #[serde(default = "default_kafka_payments_topic")]
    pub kafka_payments_topic: String,

    /// Enable gas estimation before transactions
    #[serde(default = "default_true")]
    pub enable_gas_estimation: bool,

    /// Maximum gas price in gwei (safety cap)
    #[serde(default = "default_max_gas_gwei")]
    pub max_gas_price_gwei: u64,

    /// Transaction confirmation timeout in seconds
    #[serde(default = "default_tx_timeout")]
    pub tx_timeout_secs: u64,

    /// Number of block confirmations to wait for
    #[serde(default = "default_confirmations")]
    pub confirmations: u64,

    /// The Graph subgraph endpoint for query fallback
    #[serde(default)]
    pub subgraph_endpoint: String,

    /// Log level
    #[serde(default = "default_log_level")]
    pub log_level: String,
}

impl AppConfig {
    /// Load configuration from environment variables.
    pub fn from_env() -> Result<Self, ConfigError> {
        let config: AppConfig = envy::prefixed("LMG_BLOCKCHAIN_").from_env()?;
        config.validate()?;
        Ok(config)
    }

    /// Validate the configuration values.
    fn validate(&self) -> Result<(), ConfigError> {
        if self.port == 0 {
            return Err(ConfigError::InvalidConfig("Port cannot be 0".into()));
        }
        if self.max_gas_price_gwei == 0 {
            return Err(ConfigError::InvalidConfig(
                "Max gas price must be > 0".into(),
            ));
        }
        Ok(())
    }

    /// Check if the service has all contract addresses configured.
    pub fn contracts_configured(&self) -> bool {
        !self.delivery_verification_address.is_empty()
            && !self.driver_payout_address.is_empty()
            && !self.partner_sla_address.is_empty()
            && !self.driver_identity_address.is_empty()
    }
}

// --- Default value functions ---

fn default_port() -> u16 {
    5000
}

fn default_rpc_url() -> String {
    "http://localhost:8545".to_string()
}

fn default_chain_id() -> u64 {
    31337
}

fn default_network_name() -> String {
    "hardhat-local".to_string()
}

fn default_kafka_brokers() -> String {
    "localhost:9092".to_string()
}

fn default_kafka_group_id() -> String {
    "svc-blockchain-consumer".to_string()
}

fn default_kafka_orders_delivered_topic() -> String {
    "lmg.orders.delivered".to_string()
}

fn default_kafka_payments_topic() -> String {
    "lmg.payments.completed".to_string()
}

fn default_true() -> bool {
    true
}

fn default_max_gas_gwei() -> u64 {
    50
}

fn default_tx_timeout() -> u64 {
    120
}

fn default_confirmations() -> u64 {
    2
}

fn default_log_level() -> String {
    "info".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config_values() {
        assert_eq!(default_port(), 5000);
        assert_eq!(default_chain_id(), 31337);
        assert_eq!(default_max_gas_gwei(), 50);
        assert_eq!(default_confirmations(), 2);
    }
}
