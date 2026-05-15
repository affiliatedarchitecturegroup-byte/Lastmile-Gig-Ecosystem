//! Contract ABI bindings and helper utilities.
//!
//! In a full build, this module uses ethers `abigen!` macro to generate
//! type-safe Rust bindings from Solidity ABI JSON files.
//!
//! See: docs/specs/06_BLOCKCHAIN_LAYER.md - Section 3

use ethers::types::H256;
use serde::{Deserialize, Serialize};

/// Contract deployment information.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractDeployment {
    pub name: String,
    pub address: String,
    pub network: String,
    pub chain_id: u64,
    pub deployed_at_block: u64,
    pub tx_hash: String,
}

/// Delivery record as returned from the contract.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OnChainDeliveryRecord {
    pub order_id: [u8; 32],
    pub driver_id: [u8; 32],
    pub customer_id: [u8; 32],
    pub delivery_lat: i64,
    pub delivery_lng: i64,
    pub timestamp: u64,
    pub photo_hash: [u8; 32],
    pub signature_hash: [u8; 32],
    pub verified: bool,
    pub disputed: bool,
    pub block_number: u64,
}

/// Escrow status enum matching the Solidity contract.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EscrowStatus {
    Created = 0,
    Released = 1,
    Refunded = 2,
    Expired = 3,
}

impl From<u8> for EscrowStatus {
    fn from(val: u8) -> Self {
        match val {
            0 => EscrowStatus::Created,
            1 => EscrowStatus::Released,
            2 => EscrowStatus::Refunded,
            3 => EscrowStatus::Expired,
            _ => EscrowStatus::Created,
        }
    }
}

impl std::fmt::Display for EscrowStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EscrowStatus::Created => write!(f, "CREATED"),
            EscrowStatus::Released => write!(f, "RELEASED"),
            EscrowStatus::Refunded => write!(f, "REFUNDED"),
            EscrowStatus::Expired => write!(f, "EXPIRED"),
        }
    }
}

/// Payout escrow as returned from the contract.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OnChainPayoutEscrow {
    pub driver_wallet: String,
    pub amount: String,
    pub order_id: [u8; 32],
    pub status: EscrowStatus,
    pub created_at: u64,
    pub release_after: u64,
    pub completed_at: u64,
}

/// SLA contract status matching the Solidity contract.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SLAContractStatus {
    Active = 0,
    Suspended = 1,
    Terminated = 2,
}

impl From<u8> for SLAContractStatus {
    fn from(val: u8) -> Self {
        match val {
            0 => SLAContractStatus::Active,
            1 => SLAContractStatus::Suspended,
            2 => SLAContractStatus::Terminated,
            _ => SLAContractStatus::Active,
        }
    }
}

/// Credential status matching the Solidity contract.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CredentialStatus {
    Active = 0,
    Expired = 1,
    Revoked = 2,
    Suspended = 3,
}

impl From<u8> for CredentialStatus {
    fn from(val: u8) -> Self {
        match val {
            0 => CredentialStatus::Active,
            1 => CredentialStatus::Expired,
            2 => CredentialStatus::Revoked,
            3 => CredentialStatus::Suspended,
            _ => CredentialStatus::Active,
        }
    }
}

/// Helper to convert a hex string to a bytes32 array.
pub fn hex_to_bytes32(hex: &str) -> Result<[u8; 32], String> {
    let hex = hex.strip_prefix("0x").unwrap_or(hex);
    if hex.len() != 64 {
        return Err(format!(
            "Expected 64 hex characters, got {}",
            hex.len()
        ));
    }
    let bytes = hex::decode(hex).map_err(|e| e.to_string())?;
    let mut result = [0u8; 32];
    result.copy_from_slice(&bytes);
    Ok(result)
}

/// Helper to convert a UTF-8 string to a left-padded bytes32.
pub fn string_to_bytes32(s: &str) -> [u8; 32] {
    let mut result = [0u8; 32];
    let bytes = s.as_bytes();
    let len = bytes.len().min(32);
    result[..len].copy_from_slice(&bytes[..len]);
    result
}

/// Helper to convert bytes32 to a hex string.
pub fn bytes32_to_hex(bytes: &[u8; 32]) -> String {
    format!("0x{}", hex::encode(bytes))
}

/// Helper to convert a transaction hash to string.
pub fn tx_hash_to_string(hash: H256) -> String {
    format!("{:?}", hash)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_string_to_bytes32() {
        let result = string_to_bytes32("hello");
        assert_eq!(&result[..5], b"hello");
        assert_eq!(&result[5..], &[0u8; 27]);
    }

    #[test]
    fn test_escrow_status_from_u8() {
        assert_eq!(EscrowStatus::from(0), EscrowStatus::Created);
        assert_eq!(EscrowStatus::from(1), EscrowStatus::Released);
        assert_eq!(EscrowStatus::from(2), EscrowStatus::Refunded);
        assert_eq!(EscrowStatus::from(3), EscrowStatus::Expired);
        assert_eq!(EscrowStatus::from(255), EscrowStatus::Created);
    }

    #[test]
    fn test_escrow_status_display() {
        assert_eq!(EscrowStatus::Created.to_string(), "CREATED");
        assert_eq!(EscrowStatus::Released.to_string(), "RELEASED");
    }

    #[test]
    fn test_credential_status_from_u8() {
        assert_eq!(CredentialStatus::from(0), CredentialStatus::Active);
        assert_eq!(CredentialStatus::from(2), CredentialStatus::Revoked);
    }
}
