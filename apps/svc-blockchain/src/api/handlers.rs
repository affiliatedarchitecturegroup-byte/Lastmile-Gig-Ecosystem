//! Request handlers for the blockchain service API.
//!
//! Each handler extracts request data, calls the blockchain client,
//! and returns a structured JSON response.
//!
//! See: docs/specs/06_BLOCKCHAIN_LAYER.md
//! See: docs/specs/12_API_INTEGRATION_SPEC.md

use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use tracing::{info, instrument};

use crate::blockchain::contracts::{bytes32_to_hex, string_to_bytes32, tx_hash_to_string};
use crate::error::ApiError;
use crate::models::*;
use crate::AppState;

/// Health check endpoint.
#[instrument(skip(state))]
pub async fn health_check(
    State(state): State<Arc<AppState>>,
) -> Result<Json<HealthResponse>, ApiError> {
    let connected = state.blockchain_client.is_connected().await;
    let latest_block = state
        .blockchain_client
        .get_latest_block()
        .await
        .unwrap_or(0);

    Ok(Json(HealthResponse {
        status: if connected { "healthy".into() } else { "degraded".into() },
        service: "svc-blockchain".into(),
        version: env!("CARGO_PKG_VERSION").into(),
        blockchain_connected: connected,
        chain_id: state.config.chain_id,
        latest_block,
        contracts_configured: state.config.contracts_configured(),
    }))
}

/// Get platform-wide blockchain statistics.
#[instrument(skip(state))]
pub async fn get_stats(
    State(_state): State<Arc<AppState>>,
) -> Result<Json<BlockchainStatsResponse>, ApiError> {
    // Placeholder: in full implementation, query each contract for stats
    Ok(Json(BlockchainStatsResponse {
        total_deliveries: 0,
        disputed_deliveries: 0,
        total_escrows_created: 0,
        total_payouts_released: 0,
        total_amount_released_wei: "0".into(),
        active_sla_contracts: 0,
        total_credentials: 0,
        active_credentials: 0,
    }))
}

/// Record a delivery verification on-chain.
#[instrument(skip(state))]
pub async fn record_delivery(
    State(state): State<Arc<AppState>>,
    Json(req): Json<RecordDeliveryRequest>,
) -> Result<(StatusCode, Json<RecordDeliveryResponse>), ApiError> {
    let order_id = string_to_bytes32(&req.order_id);
    let driver_id = string_to_bytes32(&req.driver_id);
    let customer_id = string_to_bytes32(&req.customer_id);
    let photo_hash = string_to_bytes32(&req.photo_hash);
    let signature_hash = string_to_bytes32(&req.signature_hash);

    let lat_fixed = (req.latitude * 1_000_000.0) as i64;
    let lng_fixed = (req.longitude * 1_000_000.0) as i64;

    let (tx_hash, block_number) = state
        .blockchain_client
        .record_delivery(
            order_id,
            driver_id,
            customer_id,
            lat_fixed,
            lng_fixed,
            photo_hash,
            signature_hash,
        )
        .await
        .map_err(ApiError::BlockchainError)?;

    info!("Delivery recorded: order={}, tx={}", req.order_id, tx_hash_to_string(tx_hash));

    Ok((
        StatusCode::CREATED,
        Json(RecordDeliveryResponse {
            order_id: req.order_id,
            tx_hash: tx_hash_to_string(tx_hash),
            block_number,
            timestamp: chrono::Utc::now().to_rfc3339(),
            gas_used: 0,
        }),
    ))
}

/// Verify a delivery record on-chain.
#[instrument(skip(state))]
pub async fn verify_delivery(
    State(state): State<Arc<AppState>>,
    Path(order_id): Path<String>,
) -> Result<Json<DeliveryVerificationResponse>, ApiError> {
    let order_bytes = string_to_bytes32(&order_id);

    let (verified, timestamp, photo_hash) = state
        .blockchain_client
        .verify_delivery(order_bytes)
        .await
        .map_err(ApiError::BlockchainError)?;

    Ok(Json(DeliveryVerificationResponse {
        order_id,
        verified,
        timestamp,
        photo_hash: bytes32_to_hex(&photo_hash),
        block_number: 0,
    }))
}

/// Dispute a delivery.
#[instrument(skip(_state))]
pub async fn dispute_delivery(
    State(_state): State<Arc<AppState>>,
    Path(_order_id): Path<String>,
    Json(_req): Json<DisputeDeliveryRequest>,
) -> Result<StatusCode, ApiError> {
    // Phase J implementation: call contract disputeDelivery
    Ok(StatusCode::ACCEPTED)
}

/// Resolve a delivery dispute.
#[instrument(skip(_state))]
pub async fn resolve_dispute(
    State(_state): State<Arc<AppState>>,
    Path(_order_id): Path<String>,
    Json(_req): Json<ResolveDisputeRequest>,
) -> Result<StatusCode, ApiError> {
    // Phase J implementation: call contract resolveDispute
    Ok(StatusCode::OK)
}

/// Create a payout escrow.
#[instrument(skip(_state))]
pub async fn create_escrow(
    State(_state): State<Arc<AppState>>,
    Json(req): Json<CreateEscrowRequest>,
) -> Result<(StatusCode, Json<CreateEscrowResponse>), ApiError> {
    info!("Creating escrow for order {}", req.order_id);

    Ok((
        StatusCode::CREATED,
        Json(CreateEscrowResponse {
            order_id: req.order_id,
            tx_hash: "0x0".into(),
            release_after: 0,
            amount_wei: req.amount_wei,
        }),
    ))
}

/// Get escrow details.
#[instrument(skip(_state))]
pub async fn get_escrow(
    State(_state): State<Arc<AppState>>,
    Path(order_id): Path<String>,
) -> Result<Json<EscrowDetailsResponse>, ApiError> {
    Ok(Json(EscrowDetailsResponse {
        order_id,
        driver_wallet: String::new(),
        amount_wei: "0".into(),
        status: "CREATED".into(),
        created_at: 0,
        release_after: 0,
    }))
}

/// Release payout from escrow.
#[instrument(skip(_state))]
pub async fn release_payout(
    State(_state): State<Arc<AppState>>,
    Path(_order_id): Path<String>,
) -> Result<StatusCode, ApiError> {
    Ok(StatusCode::OK)
}

/// Refund an escrow.
#[instrument(skip(_state))]
pub async fn refund_escrow(
    State(_state): State<Arc<AppState>>,
    Path(_order_id): Path<String>,
    Json(_req): Json<RefundEscrowRequest>,
) -> Result<StatusCode, ApiError> {
    Ok(StatusCode::OK)
}

/// Get driver total earnings.
#[instrument(skip(_state))]
pub async fn get_driver_earnings(
    State(_state): State<Arc<AppState>>,
    Path(wallet): Path<String>,
) -> Result<Json<DriverEarningsResponse>, ApiError> {
    Ok(Json(DriverEarningsResponse {
        driver_wallet: wallet,
        total_earnings_wei: "0".into(),
    }))
}

/// Create an SLA contract.
#[instrument(skip(_state))]
pub async fn create_sla(
    State(_state): State<Arc<AppState>>,
    Json(req): Json<CreateSLARequest>,
) -> Result<(StatusCode, Json<CreateSLAResponse>), ApiError> {
    Ok((
        StatusCode::CREATED,
        Json(CreateSLAResponse {
            contract_id: req.contract_id,
            tx_hash: "0x0".into(),
            partner_address: req.partner_address,
        }),
    ))
}

/// Get SLA contract details.
#[instrument(skip(_state))]
pub async fn get_sla_contract(
    State(_state): State<Arc<AppState>>,
    Path(_contract_id): Path<String>,
) -> Result<StatusCode, ApiError> {
    Ok(StatusCode::OK)
}

/// Record SLA outcome (breach or success).
#[instrument(skip(_state))]
pub async fn record_sla_outcome(
    State(_state): State<Arc<AppState>>,
    Json(_req): Json<RecordSLAOutcomeRequest>,
) -> Result<StatusCode, ApiError> {
    Ok(StatusCode::ACCEPTED)
}

/// Execute weekly SLA settlement.
#[instrument(skip(_state))]
pub async fn execute_settlement(
    State(_state): State<Arc<AppState>>,
    Json(_req): Json<ExecuteSettlementRequest>,
) -> Result<StatusCode, ApiError> {
    Ok(StatusCode::OK)
}

/// Issue a driver identity credential.
#[instrument(skip(state))]
pub async fn issue_credential(
    State(state): State<Arc<AppState>>,
    Json(req): Json<IssueCredentialRequest>,
) -> Result<(StatusCode, Json<IssueCredentialResponse>), ApiError> {
    let driver_id = string_to_bytes32(&req.driver_id);
    let licence_hash = string_to_bytes32(&req.licence_hash);
    let biometric_hash = string_to_bytes32(&req.biometric_hash);
    let pdp_hash = string_to_bytes32(&req.pdp_hash);

    let (tx_hash, _block) = state
        .blockchain_client
        .issue_credential(driver_id, licence_hash, biometric_hash, pdp_hash, req.validity_days)
        .await
        .map_err(ApiError::BlockchainError)?;

    Ok((
        StatusCode::CREATED,
        Json(IssueCredentialResponse {
            driver_id: req.driver_id,
            tx_hash: tx_hash_to_string(tx_hash),
            expires_at: 0,
            version: 1,
        }),
    ))
}

/// Verify a driver credential.
#[instrument(skip(_state))]
pub async fn verify_credential(
    State(_state): State<Arc<AppState>>,
    Path(driver_id): Path<String>,
) -> Result<Json<CredentialVerificationResponse>, ApiError> {
    Ok(Json(CredentialVerificationResponse {
        driver_id,
        valid: false,
        expires_at: 0,
        version: 0,
    }))
}

/// Revoke a driver credential.
#[instrument(skip(_state))]
pub async fn revoke_credential(
    State(_state): State<Arc<AppState>>,
    Path(_driver_id): Path<String>,
    Json(_req): Json<RevokeCredentialRequest>,
) -> Result<StatusCode, ApiError> {
    Ok(StatusCode::OK)
}
