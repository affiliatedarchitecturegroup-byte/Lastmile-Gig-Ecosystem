//! Error types for the blockchain service.
//!
//! Uses `thiserror` for ergonomic error definitions.
//! All errors map to appropriate HTTP status codes via Axum's IntoResponse.

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::json;
use thiserror::Error;

/// Domain-specific errors for blockchain operations.
#[derive(Debug, Error)]
pub enum BlockchainError {
    #[error("Contract call failed: {0}")]
    ContractCallFailed(String),

    #[error("Transaction failed: {0}")]
    TransactionFailed(String),

    #[error("Transaction timed out after {0} seconds")]
    TransactionTimeout(u64),

    #[error("Gas price exceeds maximum allowed: {current} > {max} gwei")]
    GasPriceTooHigh { current: u64, max: u64 },

    #[error("Contract not deployed at address: {0}")]
    ContractNotDeployed(String),

    #[error("Invalid address format: {0}")]
    InvalidAddress(String),

    #[error("Invalid bytes32 value: {0}")]
    InvalidBytes32(String),

    #[error("Delivery already recorded for order: {0}")]
    DeliveryAlreadyRecorded(String),

    #[error("Delivery not found for order: {0}")]
    DeliveryNotFound(String),

    #[error("Escrow already exists for order: {0}")]
    EscrowAlreadyExists(String),

    #[error("Escrow not found for order: {0}")]
    EscrowNotFound(String),

    #[error("Hold period still active for order: {0}")]
    HoldPeriodActive(String),

    #[error("Credential not found for driver: {0}")]
    CredentialNotFound(String),

    #[error("Provider connection error: {0}")]
    ProviderError(String),

    #[error("Signer configuration error: {0}")]
    SignerError(String),

    #[error("Kafka consumer error: {0}")]
    KafkaError(String),

    #[error("Configuration error: {0}")]
    ConfigError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),

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

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Service unavailable: {0}")]
    ServiceUnavailable(String),

    #[error("Internal server error: {0}")]
    InternalError(String),

    #[error(transparent)]
    BlockchainError(#[from] BlockchainError),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, error_type, message) = match &self {
            ApiError::BadRequest(msg) => (StatusCode::BAD_REQUEST, "bad_request", msg.clone()),
            ApiError::NotFound(msg) => (StatusCode::NOT_FOUND, "not_found", msg.clone()),
            ApiError::Conflict(msg) => (StatusCode::CONFLICT, "conflict", msg.clone()),
            ApiError::ServiceUnavailable(msg) => {
                (StatusCode::SERVICE_UNAVAILABLE, "service_unavailable", msg.clone())
            }
            ApiError::InternalError(msg) => {
                (StatusCode::INTERNAL_SERVER_ERROR, "internal_error", msg.clone())
            }
            ApiError::BlockchainError(e) => match e {
                BlockchainError::DeliveryAlreadyRecorded(_)
                | BlockchainError::EscrowAlreadyExists(_) => {
                    (StatusCode::CONFLICT, "conflict", e.to_string())
                }
                BlockchainError::DeliveryNotFound(_)
                | BlockchainError::EscrowNotFound(_)
                | BlockchainError::CredentialNotFound(_) => {
                    (StatusCode::NOT_FOUND, "not_found", e.to_string())
                }
                BlockchainError::InvalidAddress(_) | BlockchainError::InvalidBytes32(_) => {
                    (StatusCode::BAD_REQUEST, "bad_request", e.to_string())
                }
                BlockchainError::GasPriceTooHigh { .. }
                | BlockchainError::TransactionTimeout(_) => {
                    (StatusCode::SERVICE_UNAVAILABLE, "blockchain_unavailable", e.to_string())
                }
                _ => (StatusCode::INTERNAL_SERVER_ERROR, "blockchain_error", e.to_string()),
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
