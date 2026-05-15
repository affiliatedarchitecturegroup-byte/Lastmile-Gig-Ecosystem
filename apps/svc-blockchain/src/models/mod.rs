//! Data models for the blockchain service API.
//!
//! Request/response types for delivery verification, driver payouts,
//! partner SLA, and driver identity operations.
//!
//! See: docs/specs/06_BLOCKCHAIN_LAYER.md

use serde::{Deserialize, Serialize};

// --- Delivery Verification Models ---

/// Request to record a delivery on-chain.
#[derive(Debug, Deserialize)]
pub struct RecordDeliveryRequest {
    pub order_id: String,
    pub driver_id: String,
    pub customer_id: String,
    pub latitude: f64,
    pub longitude: f64,
    pub photo_hash: String,
    pub signature_hash: String,
}

/// Response after recording a delivery on-chain.
#[derive(Debug, Serialize)]
pub struct RecordDeliveryResponse {
    pub order_id: String,
    pub tx_hash: String,
    pub block_number: u64,
    pub timestamp: String,
    pub gas_used: u64,
}

/// Query for delivery verification.
#[derive(Debug, Deserialize)]
pub struct VerifyDeliveryRequest {
    pub order_id: String,
}

/// Delivery verification response.
#[derive(Debug, Serialize)]
pub struct DeliveryVerificationResponse {
    pub order_id: String,
    pub verified: bool,
    pub timestamp: u64,
    pub photo_hash: String,
    pub block_number: u64,
}

/// Delivery dispute request.
#[derive(Debug, Deserialize)]
pub struct DisputeDeliveryRequest {
    pub order_id: String,
}

/// Dispute resolution request.
#[derive(Debug, Deserialize)]
pub struct ResolveDisputeRequest {
    pub order_id: String,
    pub verified: bool,
}

// --- Driver Payout Models ---

/// Request to create a payout escrow.
#[derive(Debug, Deserialize)]
pub struct CreateEscrowRequest {
    pub order_id: String,
    pub driver_wallet: String,
    pub amount_wei: String,
}

/// Response after creating an escrow.
#[derive(Debug, Serialize)]
pub struct CreateEscrowResponse {
    pub order_id: String,
    pub tx_hash: String,
    pub release_after: u64,
    pub amount_wei: String,
}

/// Request to release a payout.
#[derive(Debug, Deserialize)]
pub struct ReleasePayoutRequest {
    pub order_id: String,
}

/// Response after releasing a payout.
#[derive(Debug, Serialize)]
pub struct ReleasePayoutResponse {
    pub order_id: String,
    pub tx_hash: String,
    pub driver_wallet: String,
    pub amount_wei: String,
}

/// Request to refund an escrow.
#[derive(Debug, Deserialize)]
pub struct RefundEscrowRequest {
    pub order_id: String,
    pub reason: String,
}

/// Escrow details response.
#[derive(Debug, Serialize)]
pub struct EscrowDetailsResponse {
    pub order_id: String,
    pub driver_wallet: String,
    pub amount_wei: String,
    pub status: String,
    pub created_at: u64,
    pub release_after: u64,
}

/// Driver earnings response.
#[derive(Debug, Serialize)]
pub struct DriverEarningsResponse {
    pub driver_wallet: String,
    pub total_earnings_wei: String,
}

// --- Partner SLA Models ---

/// Request to create an SLA contract.
#[derive(Debug, Deserialize)]
pub struct CreateSLARequest {
    pub contract_id: String,
    pub partner_address: String,
    pub delivery_target_minutes: u64,
    pub penalty_per_breach_wei: String,
    pub bonus_per_perfect_week: String,
}

/// Response after creating an SLA contract.
#[derive(Debug, Serialize)]
pub struct CreateSLAResponse {
    pub contract_id: String,
    pub tx_hash: String,
    pub partner_address: String,
}

/// Record SLA delivery outcome request.
#[derive(Debug, Deserialize)]
pub struct RecordSLAOutcomeRequest {
    pub contract_id: String,
    pub order_id: String,
    pub actual_minutes: u64,
    pub is_breach: bool,
}

/// Execute weekly settlement request.
#[derive(Debug, Deserialize)]
pub struct ExecuteSettlementRequest {
    pub contract_id: String,
    pub week: u64,
}

// --- Driver Identity Models ---

/// Request to issue a driver credential.
#[derive(Debug, Deserialize)]
pub struct IssueCredentialRequest {
    pub driver_id: String,
    pub licence_hash: String,
    pub biometric_hash: String,
    pub pdp_hash: String,
    pub validity_days: u64,
}

/// Response after issuing a credential.
#[derive(Debug, Serialize)]
pub struct IssueCredentialResponse {
    pub driver_id: String,
    pub tx_hash: String,
    pub expires_at: u64,
    pub version: u64,
}

/// Credential verification response.
#[derive(Debug, Serialize)]
pub struct CredentialVerificationResponse {
    pub driver_id: String,
    pub valid: bool,
    pub expires_at: u64,
    pub version: u64,
}

/// Revoke credential request.
#[derive(Debug, Deserialize)]
pub struct RevokeCredentialRequest {
    pub driver_id: String,
    pub reason: String,
}

// --- Common Models ---

/// Platform-wide blockchain statistics.
#[derive(Debug, Serialize)]
pub struct BlockchainStatsResponse {
    pub total_deliveries: u64,
    pub disputed_deliveries: u64,
    pub total_escrows_created: u64,
    pub total_payouts_released: u64,
    pub total_amount_released_wei: String,
    pub active_sla_contracts: u64,
    pub total_credentials: u64,
    pub active_credentials: u64,
}

/// Transaction receipt summary.
#[derive(Debug, Serialize)]
pub struct TxReceiptResponse {
    pub tx_hash: String,
    pub block_number: u64,
    pub gas_used: u64,
    pub status: String,
}

/// Health check response.
#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub service: String,
    pub version: String,
    pub blockchain_connected: bool,
    pub chain_id: u64,
    pub latest_block: u64,
    pub contracts_configured: bool,
}
