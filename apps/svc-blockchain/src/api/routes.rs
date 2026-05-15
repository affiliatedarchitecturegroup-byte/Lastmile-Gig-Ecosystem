//! HTTP route definitions for the blockchain service API.
//!
//! All routes are versioned under `/v1/` and follow REST conventions.
//!
//! See: docs/specs/12_API_INTEGRATION_SPEC.md

use std::sync::Arc;

use axum::routing::{get, post};
use axum::Router;

use super::handlers;
use crate::AppState;

/// Create the application router with all API routes.
pub fn create_router(state: Arc<AppState>) -> Router {
    Router::new()
        // Health & status
        .route("/health", get(handlers::health_check))
        .route("/v1/blockchain/stats", get(handlers::get_stats))
        // Delivery verification
        .route(
            "/v1/blockchain/deliveries",
            post(handlers::record_delivery),
        )
        .route(
            "/v1/blockchain/deliveries/:order_id/verify",
            get(handlers::verify_delivery),
        )
        .route(
            "/v1/blockchain/deliveries/:order_id/dispute",
            post(handlers::dispute_delivery),
        )
        .route(
            "/v1/blockchain/deliveries/:order_id/resolve",
            post(handlers::resolve_dispute),
        )
        // Driver payouts
        .route("/v1/blockchain/escrows", post(handlers::create_escrow))
        .route(
            "/v1/blockchain/escrows/:order_id",
            get(handlers::get_escrow),
        )
        .route(
            "/v1/blockchain/escrows/:order_id/release",
            post(handlers::release_payout),
        )
        .route(
            "/v1/blockchain/escrows/:order_id/refund",
            post(handlers::refund_escrow),
        )
        .route(
            "/v1/blockchain/drivers/:wallet/earnings",
            get(handlers::get_driver_earnings),
        )
        // Partner SLA
        .route("/v1/blockchain/sla/contracts", post(handlers::create_sla))
        .route(
            "/v1/blockchain/sla/contracts/:contract_id",
            get(handlers::get_sla_contract),
        )
        .route(
            "/v1/blockchain/sla/outcomes",
            post(handlers::record_sla_outcome),
        )
        .route(
            "/v1/blockchain/sla/settlements",
            post(handlers::execute_settlement),
        )
        // Driver identity
        .route(
            "/v1/blockchain/credentials",
            post(handlers::issue_credential),
        )
        .route(
            "/v1/blockchain/credentials/:driver_id/verify",
            get(handlers::verify_credential),
        )
        .route(
            "/v1/blockchain/credentials/:driver_id/revoke",
            post(handlers::revoke_credential),
        )
        .with_state(state)
}
