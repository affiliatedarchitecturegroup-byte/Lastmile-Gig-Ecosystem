//! HTTP route definitions for the IoT telemetry service API.

use std::sync::Arc;

use axum::routing::{get, post};
use axum::Router;

use super::handlers;
use crate::AppState;

/// Create the application router with all API routes.
pub fn create_router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/health", get(handlers::health_check))
        .route("/v1/iot/telemetry", post(handlers::ingest_telemetry))
        .route("/v1/iot/fleet/summary", get(handlers::get_fleet_summary))
        .route(
            "/v1/iot/vehicles/:vehicle_id/telemetry",
            get(handlers::get_vehicle_telemetry),
        )
        .route(
            "/v1/iot/vehicles/:vehicle_id/alerts",
            get(handlers::get_vehicle_alerts),
        )
        .route("/v1/iot/alerts/recent", get(handlers::get_recent_alerts))
        .with_state(state)
}
