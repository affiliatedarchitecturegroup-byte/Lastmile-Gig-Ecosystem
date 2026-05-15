//! Event Indexer - Indexes blockchain events to the local database.
//!
//! Listens to on-chain events from all four contracts and stores them
//! in the PostgreSQL blockchain audit trail tables. This provides a
//! fast query layer without requiring The Graph for every lookup.
//!
//! See: docs/specs/06_BLOCKCHAIN_LAYER.md - Section 4
//! See: infrastructure/database/migrations/010_create_blockchain_tables.sql

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tracing::{debug, info, instrument, warn};
use uuid::Uuid;

/// Indexed delivery record stored in PostgreSQL.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexedDelivery {
    pub id: Uuid,
    pub order_id: String,
    pub driver_id: String,
    pub customer_id: String,
    pub delivery_lat: i64,
    pub delivery_lng: i64,
    pub photo_hash: String,
    pub signature_hash: String,
    pub verified: bool,
    pub disputed: bool,
    pub tx_hash: String,
    pub block_number: u64,
    pub chain_timestamp: DateTime<Utc>,
    pub indexed_at: DateTime<Utc>,
}

/// Indexed escrow record stored in PostgreSQL.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexedEscrow {
    pub id: Uuid,
    pub order_id: String,
    pub driver_wallet: String,
    pub amount_wei: String,
    pub status: String,
    pub release_after: DateTime<Utc>,
    pub tx_hash_create: String,
    pub tx_hash_complete: Option<String>,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub indexed_at: DateTime<Utc>,
}

/// Indexed SLA contract stored in PostgreSQL.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexedSLAContract {
    pub id: Uuid,
    pub contract_id: String,
    pub partner_address: String,
    pub delivery_target_minutes: u32,
    pub penalty_per_breach_wei: String,
    pub bonus_per_perfect_week: String,
    pub status: String,
    pub tx_hash: String,
    pub created_at: DateTime<Utc>,
    pub indexed_at: DateTime<Utc>,
}

/// Indexed credential stored in PostgreSQL.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexedCredential {
    pub id: Uuid,
    pub driver_id: String,
    pub licence_hash: String,
    pub biometric_hash: String,
    pub pdp_hash: String,
    pub status: String,
    pub version: u32,
    pub issued_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub tx_hash: String,
    pub issued_by: String,
    pub indexed_at: DateTime<Utc>,
}

/// Event indexer that processes blockchain events and stores them locally.
pub struct EventIndexer {
    last_indexed_block: u64,
    indexing_enabled: bool,
}

impl EventIndexer {
    /// Create a new event indexer.
    pub fn new() -> Self {
        Self {
            last_indexed_block: 0,
            indexing_enabled: true,
        }
    }

    /// Get the last indexed block number.
    pub fn last_block(&self) -> u64 {
        self.last_indexed_block
    }

    /// Update the last indexed block.
    pub fn set_last_block(&mut self, block: u64) {
        self.last_indexed_block = block;
    }

    /// Check if indexing is enabled.
    pub fn is_enabled(&self) -> bool {
        self.indexing_enabled
    }

    /// Create an indexed delivery record from on-chain data.
    #[instrument(skip(self))]
    pub fn index_delivery(
        &self,
        order_id: &str,
        driver_id: &str,
        customer_id: &str,
        lat: i64,
        lng: i64,
        photo_hash: &str,
        signature_hash: &str,
        tx_hash: &str,
        block_number: u64,
        chain_timestamp: DateTime<Utc>,
    ) -> IndexedDelivery {
        debug!(
            "Indexing delivery: order={}, block={}",
            order_id, block_number
        );

        IndexedDelivery {
            id: Uuid::new_v4(),
            order_id: order_id.to_string(),
            driver_id: driver_id.to_string(),
            customer_id: customer_id.to_string(),
            delivery_lat: lat,
            delivery_lng: lng,
            photo_hash: photo_hash.to_string(),
            signature_hash: signature_hash.to_string(),
            verified: true,
            disputed: false,
            tx_hash: tx_hash.to_string(),
            block_number,
            chain_timestamp,
            indexed_at: Utc::now(),
        }
    }

    /// Create an indexed escrow record.
    #[instrument(skip(self))]
    pub fn index_escrow(
        &self,
        order_id: &str,
        driver_wallet: &str,
        amount_wei: &str,
        release_after: DateTime<Utc>,
        tx_hash: &str,
        created_at: DateTime<Utc>,
    ) -> IndexedEscrow {
        debug!("Indexing escrow: order={}", order_id);

        IndexedEscrow {
            id: Uuid::new_v4(),
            order_id: order_id.to_string(),
            driver_wallet: driver_wallet.to_string(),
            amount_wei: amount_wei.to_string(),
            status: "CREATED".to_string(),
            release_after,
            tx_hash_create: tx_hash.to_string(),
            tx_hash_complete: None,
            created_at,
            completed_at: None,
            indexed_at: Utc::now(),
        }
    }

    /// Create an indexed credential record.
    #[instrument(skip(self))]
    pub fn index_credential(
        &self,
        driver_id: &str,
        licence_hash: &str,
        biometric_hash: &str,
        pdp_hash: &str,
        version: u32,
        issued_at: DateTime<Utc>,
        expires_at: DateTime<Utc>,
        tx_hash: &str,
        issued_by: &str,
    ) -> IndexedCredential {
        debug!("Indexing credential: driver={}, v={}", driver_id, version);

        IndexedCredential {
            id: Uuid::new_v4(),
            driver_id: driver_id.to_string(),
            licence_hash: licence_hash.to_string(),
            biometric_hash: biometric_hash.to_string(),
            pdp_hash: pdp_hash.to_string(),
            status: "ACTIVE".to_string(),
            version,
            issued_at,
            expires_at,
            tx_hash: tx_hash.to_string(),
            issued_by: issued_by.to_string(),
            indexed_at: Utc::now(),
        }
    }
}

impl Default for EventIndexer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_indexer() {
        let indexer = EventIndexer::new();
        assert_eq!(indexer.last_block(), 0);
        assert!(indexer.is_enabled());
    }

    #[test]
    fn test_index_delivery() {
        let indexer = EventIndexer::new();
        let record = indexer.index_delivery(
            "ORD-001",
            "DRV-001",
            "CUS-001",
            -29858681,
            31021839,
            "QmPhoto",
            "SigHash",
            "0x123",
            100,
            Utc::now(),
        );
        assert_eq!(record.order_id, "ORD-001");
        assert!(record.verified);
        assert!(!record.disputed);
    }

    #[test]
    fn test_index_escrow() {
        let indexer = EventIndexer::new();
        let record = indexer.index_escrow(
            "ORD-001",
            "0xdriver",
            "1000000",
            Utc::now(),
            "0x456",
            Utc::now(),
        );
        assert_eq!(record.status, "CREATED");
        assert!(record.completed_at.is_none());
    }
}
