//! Error types for the IoT telemetry service.

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::json;
use thiserror::Error;

/// Domain-specific errors for IoT operations.
#[derive(Debug, Error)]
pub enum IoTError {
    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("MQTT connection error: {0}")]
    MqttError(String),

    #[error("MQTT subscription error: {0}")]
    MqttSubscriptionError(String),

    #[error("Invalid telemetry data: {0}")]
    InvalidTelemetryData(String),

    #[error("Vehicle not found: {0}")]
    VehicleNotFound(String),

    #[error("Kafka producer error: {0}")]
    KafkaError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("Configuration error: {0}")]
    ConfigError(String),

    #[error("Internal error: {0}")]
    InternalError(String),
}

/// API-level errors returned as HTTP responses.
#[derive(Debug, Error)]
pub enum ApiError {
    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Internal server error: {0}")]
    InternalError(String),

    #[error(transparent)]
    IoTError(#[from] IoTError),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, error_type, message) = match &self {
            ApiError::BadRequest(msg) => (StatusCode::BAD_REQUEST, "bad_request", msg.clone()),
            ApiError::NotFound(msg) => (StatusCode::NOT_FOUND, "not_found", msg.clone()),
            ApiError::InternalError(msg) => {
                (StatusCode::INTERNAL_SERVER_ERROR, "internal_error", msg.clone())
            }
            ApiError::IoTError(e) => match e {
                IoTError::VehicleNotFound(_) => {
                    (StatusCode::NOT_FOUND, "not_found", e.to_string())
                }
                IoTError::InvalidTelemetryData(_) => {
                    (StatusCode::BAD_REQUEST, "bad_request", e.to_string())
                }
                _ => (StatusCode::INTERNAL_SERVER_ERROR, "iot_error", e.to_string()),
            },
        };

        let body = json!({
            "type": format!("https://lastmilegig.aagais.co.za/errors/{}", error_type),
            "title": error_type.replace('_', " "),
            "status": status.as_u16(),
            "detail": message,
        });

        (status, Json(body)).into_response()
    }
}
