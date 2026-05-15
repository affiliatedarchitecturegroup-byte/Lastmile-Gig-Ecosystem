//! Blockchain Service - Entry Point
//!
//! Rust/Axum service serving as the exclusive interface between the
//! Lastmile Gig platform and the Polygon CDK Layer 2 chain.
//!
//! No other service writes to the blockchain directly.
//!
//! Port: 5000
//!
//! See: docs/specs/06_BLOCKCHAIN_LAYER.md

mod api;
mod blockchain;
mod config;
mod error;
mod kafka;
mod models;

use std::net::SocketAddr;
use std::sync::Arc;

use axum::Router;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::info;

use crate::api::routes::create_router;
use crate::blockchain::client::BlockchainClient;
use crate::config::AppConfig;
use crate::kafka::consumer::BlockchainEventConsumer;

/// Shared application state passed to all handlers.
pub struct AppState {
    pub blockchain_client: BlockchainClient,
    pub config: AppConfig,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load environment variables
    dotenvy::dotenv().ok();

    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "svc_blockchain=info,tower_http=info".into()),
        )
        .json()
        .init();

    info!("Starting Lastmile Gig Blockchain Service");

    // Load configuration
    let config = AppConfig::from_env()?;
    let port = config.port;

    // Initialize blockchain client
    let blockchain_client = BlockchainClient::new(&config).await?;

    info!(
        "Blockchain client initialized. Network: {}, Chain ID: {}",
        config.network_name, config.chain_id
    );

    // Build shared state
    let state = Arc::new(AppState {
        blockchain_client,
        config: config.clone(),
    });

    // Start Kafka consumer in background
    let kafka_state = state.clone();
    tokio::spawn(async move {
        if let Err(e) = BlockchainEventConsumer::start(kafka_state).await {
            tracing::error!("Kafka consumer error: {}", e);
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

    // Bind and serve
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("Blockchain Service listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
