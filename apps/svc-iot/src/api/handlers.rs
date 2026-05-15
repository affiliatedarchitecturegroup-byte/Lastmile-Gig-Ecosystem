//! Request handlers for the IoT telemetry service API.

use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use tracing::instrument;

use crate::error::ApiError;
use crate::models::*;
use crate::AppState;

/// Health check endpoint.
#[instrument(skip(state))]
pub async fn health_check(
    State(state): State<Arc<AppState>>,
) -> Result<Json<HealthResponse>, ApiError> {
    let db_connected = state.db.is_connected().await;
    let vehicles = state.db.get_vehicle_count().await.unwrap_or(0);
    let events = state.db.get_event_count().await.unwrap_or(0);

    Ok(Json(HealthResponse {
        status: if db_connected { "healthy".into() } else { "degraded".into() },
        service: "svc-iot".into(),
        version: env!("CARGO_PKG_VERSION").into(),
        database_connected: db_connected,
        mqtt_connected: true, // Would check actual MQTT status
        vehicles_tracked: vehicles,
        events_processed: events,
    }))
}

/// Ingest a telemetry event via HTTP (alternative to MQTT).
#[instrument(skip(state))]
pub async fn ingest_telemetry(
    State(state): State<Arc<AppState>>,
    Json(event): Json<TelemetryEvent>,
) -> Result<StatusCode, ApiError> {
    let alerts = state.processor.check_alerts(&event);
    let record = TelemetryRecord::from_event(event);

    state
        .db
        .insert_telemetry(&record)
        .await
        .map_err(|e| ApiError::InternalError(e.to_string()))?;

    for alert in &alerts {
        state
            .db
            .insert_alert(alert)
            .await
            .map_err(|e| ApiError::InternalError(e.to_string()))?;
    }

    Ok(StatusCode::ACCEPTED)
}

/// Get fleet summary with latest telemetry per vehicle.
#[instrument(skip(state))]
pub async fn get_fleet_summary(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<VehicleSummary>>, ApiError> {
    let summary = state
        .db
        .get_fleet_summary()
        .await
        .map_err(|e| ApiError::InternalError(e.to_string()))?;

    Ok(Json(summary))
}

/// Get telemetry history for a specific vehicle.
#[instrument(skip(_state))]
pub async fn get_vehicle_telemetry(
    State(_state): State<Arc<AppState>>,
    Path(_vehicle_id): Path<String>,
) -> Result<Json<Vec<TelemetryRecord>>, ApiError> {
    // Phase J: query TimescaleDB for vehicle telemetry history
    Ok(Json(vec![]))
}

/// Get alerts for a specific vehicle.
#[instrument(skip(_state))]
pub async fn get_vehicle_alerts(
    State(_state): State<Arc<AppState>>,
    Path(_vehicle_id): Path<String>,
) -> Result<Json<Vec<MaintenanceAlert>>, ApiError> {
    // Phase J: query maintenance alerts by vehicle ID
    Ok(Json(vec![]))
}

/// Get recent alerts across all vehicles.
#[instrument(skip(_state))]
pub async fn get_recent_alerts(
    State(_state): State<Arc<AppState>>,
) -> Result<Json<Vec<MaintenanceAlert>>, ApiError> {
    // Phase J: query recent maintenance alerts
    Ok(Json(vec![]))
}
