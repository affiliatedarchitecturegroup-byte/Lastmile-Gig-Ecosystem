//! IoT Telemetry Service - Entry Point
//!
//! Rust/Axum service for real-time IoT telemetry ingestion from fleet
//! vehicles via MQTT. Stores time-series data in TimescaleDB for
//! predictive maintenance and fleet analytics.
//!
//! Port: 5001
//!
//! See: docs/specs/06_BLOCKCHAIN_LAYER.md - Section 2.4 (Rust/IoT)
//! See: POLYGLOT_ARCHITECTURE.md - Section 2.4

mod api;
mod config;
mod db;
mod error;
mod models;
mod mqtt;
mod telemetry;

use std::net::SocketAddr;
use std::sync::Arc;

use axum::Router;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::info;

use crate::api::routes::create_router;
use crate::config::AppConfig;
use crate::db::timescaledb::TimescaleDb;
use crate::mqtt::subscriber::MqttSubscriber;
use crate::telemetry::processor::TelemetryProcessor;

/// Shared application state passed to all handlers.
pub struct AppState {
    pub db: TimescaleDb,
    pub processor: TelemetryProcessor,
    pub config: AppConfig,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "svc_iot=info,tower_http=info".into()),
        )
        .json()
        .init();

    info!("Starting Lastmile Gig IoT Telemetry Service");

    let config = AppConfig::from_env()?;
    let port = config.port;

    // Initialize TimescaleDB connection pool
    let db = TimescaleDb::new(&config).await?;
    info!("TimescaleDB connection pool initialized");

    // Initialize telemetry processor
    let processor = TelemetryProcessor::new(&config);
    info!("Telemetry processor initialized");

    // Build shared state
    let state = Arc::new(AppState {
        db: db.clone(),
        processor,
        config: config.clone(),
    });

    // Start MQTT subscriber in background
    let mqtt_state = state.clone();
    let mqtt_db = db.clone();
    tokio::spawn(async move {
        if let Err(e) = MqttSubscriber::start(mqtt_state, mqtt_db).await {
            tracing::error!("MQTT subscriber error: {}", e);
        }
    });

    // Build application router
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app: Router = create_router(state)
        .layer(TraceLayer::new_for_http())
        .layer(cors);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("IoT Telemetry Service listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
