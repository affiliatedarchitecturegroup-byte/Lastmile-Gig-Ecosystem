//! Application configuration for the IoT telemetry service.
//!
//! See: POLYGLOT_ARCHITECTURE.md - Section 2.4

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

/// IoT service configuration.
#[derive(Debug, Clone, Deserialize)]
pub struct AppConfig {
    #[serde(default = "default_port")]
    pub port: u16,

    /// TimescaleDB connection URL
    #[serde(default = "default_db_url")]
    pub database_url: String,

    /// Database connection pool size
    #[serde(default = "default_pool_size")]
    pub db_pool_size: u32,

    /// MQTT broker URL
    #[serde(default = "default_mqtt_url")]
    pub mqtt_broker_url: String,

    /// MQTT broker port
    #[serde(default = "default_mqtt_port")]
    pub mqtt_port: u16,

    /// MQTT client ID
    #[serde(default = "default_mqtt_client_id")]
    pub mqtt_client_id: String,

    /// MQTT topic for fleet telemetry
    #[serde(default = "default_telemetry_topic")]
    pub mqtt_telemetry_topic: String,

    /// MQTT topic for OBD-II diagnostics
    #[serde(default = "default_diagnostics_topic")]
    pub mqtt_diagnostics_topic: String,

    /// MQTT topic for GPS tracking
    #[serde(default = "default_gps_topic")]
    pub mqtt_gps_topic: String,

    /// Kafka brokers for forwarding events
    #[serde(default = "default_kafka_brokers")]
    pub kafka_brokers: String,

    /// Kafka topic for fleet telemetry events
    #[serde(default = "default_kafka_telemetry_topic")]
    pub kafka_telemetry_topic: String,

    /// Kafka topic for maintenance alerts
    #[serde(default = "default_kafka_maintenance_topic")]
    pub kafka_maintenance_topic: String,

    /// Threshold for engine temperature alert (Celsius)
    #[serde(default = "default_engine_temp_threshold")]
    pub engine_temp_threshold_c: f64,

    /// Threshold for battery alert (percentage)
    #[serde(default = "default_battery_threshold")]
    pub battery_threshold_pct: f64,

    /// Threshold for speed alert (km/h)
    #[serde(default = "default_speed_threshold")]
    pub speed_threshold_kmh: f64,

    /// Telemetry batch size before flush
    #[serde(default = "default_batch_size")]
    pub batch_size: usize,

    /// Telemetry batch flush interval in milliseconds
    #[serde(default = "default_flush_interval_ms")]
    pub flush_interval_ms: u64,

    /// Data retention period in days for TimescaleDB
    #[serde(default = "default_retention_days")]
    pub retention_days: u32,

    /// Log level
    #[serde(default = "default_log_level")]
    pub log_level: String,
}

impl AppConfig {
    pub fn from_env() -> Result<Self, ConfigError> {
        let config: AppConfig = envy::prefixed("LMG_IOT_").from_env()?;
        config.validate()?;
        Ok(config)
    }

    fn validate(&self) -> Result<(), ConfigError> {
        if self.port == 0 {
            return Err(ConfigError::InvalidConfig("Port cannot be 0".into()));
        }
        if self.batch_size == 0 {
            return Err(ConfigError::InvalidConfig("Batch size must be > 0".into()));
        }
        if self.engine_temp_threshold_c <= 0.0 {
            return Err(ConfigError::InvalidConfig(
                "Engine temperature threshold must be positive".into(),
            ));
        }
        Ok(())
    }
}

fn default_port() -> u16 { 5001 }
fn default_db_url() -> String { "postgres://localhost:5432/lastmilegig_iot".into() }
fn default_pool_size() -> u32 { 10 }
fn default_mqtt_url() -> String { "localhost".into() }
fn default_mqtt_port() -> u16 { 1883 }
fn default_mqtt_client_id() -> String { "lmg-iot-service".into() }
fn default_telemetry_topic() -> String { "lmg/fleet/+/telemetry".into() }
fn default_diagnostics_topic() -> String { "lmg/fleet/+/diagnostics".into() }
fn default_gps_topic() -> String { "lmg/fleet/+/gps".into() }
fn default_kafka_brokers() -> String { "localhost:9092".into() }
fn default_kafka_telemetry_topic() -> String { "lmg.fleet.telemetry".into() }
fn default_kafka_maintenance_topic() -> String { "lmg.fleet.maintenance".into() }
fn default_engine_temp_threshold_c() -> f64 { 110.0 }
fn default_battery_threshold_pct() -> f64 { 15.0 }
fn default_speed_threshold_kmh() -> f64 { 140.0 }
fn default_batch_size() -> usize { 100 }
fn default_flush_interval_ms() -> u64 { 5000 }
fn default_retention_days() -> u32 { 90 }
fn default_log_level() -> String { "info".into() }
