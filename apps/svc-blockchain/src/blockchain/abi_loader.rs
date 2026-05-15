//! ABI Loader - Loads contract ABI files for ethers abigen bindings.
//!
//! In production, the ABI JSON files are exported from Hardhat compilation
//! via the `export-abi.ts` script and placed in the `abi/` directory.
//!
//! See: contracts/solidity/scripts/export-abi.ts

use std::path::Path;

use serde::Deserialize;
use tracing::{info, warn};

use crate::error::BlockchainError;

/// ABI entry from a compiled Solidity contract.
#[derive(Debug, Clone, Deserialize)]
pub struct AbiEntry {
    #[serde(rename = "type")]
    pub entry_type: String,
    pub name: Option<String>,
    pub inputs: Option<Vec<AbiParam>>,
    pub outputs: Option<Vec<AbiParam>>,
    #[serde(rename = "stateMutability")]
    pub state_mutability: Option<String>,
    pub anonymous: Option<bool>,
}

/// ABI parameter definition.
#[derive(Debug, Clone, Deserialize)]
pub struct AbiParam {
    pub name: String,
    #[serde(rename = "type")]
    pub param_type: String,
    pub indexed: Option<bool>,
    pub components: Option<Vec<AbiParam>>,
}

/// Loaded ABI with metadata.
#[derive(Debug, Clone)]
pub struct LoadedAbi {
    pub contract_name: String,
    pub entries: Vec<AbiEntry>,
    pub function_count: usize,
    pub event_count: usize,
}

/// Load an ABI JSON file from the abi/ directory.
pub fn load_abi(contract_name: &str) -> Result<LoadedAbi, BlockchainError> {
    let abi_path = format!("abi/{}.json", contract_name);
    let path = Path::new(&abi_path);

    if !path.exists() {
        warn!(
            "ABI file not found: {}. Using empty ABI (scaffold mode).",
            abi_path
        );
        return Ok(LoadedAbi {
            contract_name: contract_name.to_string(),
            entries: vec![],
            function_count: 0,
            event_count: 0,
        });
    }

    let content = std::fs::read_to_string(path)
        .map_err(|e| BlockchainError::ConfigError(format!("Failed to read ABI file: {}", e)))?;

    let entries: Vec<AbiEntry> = serde_json::from_str(&content)
        .map_err(|e| BlockchainError::SerializationError(format!("Invalid ABI JSON: {}", e)))?;

    let function_count = entries
        .iter()
        .filter(|e| e.entry_type == "function")
        .count();
    let event_count = entries
        .iter()
        .filter(|e| e.entry_type == "event")
        .count();

    info!(
        "Loaded ABI for {}: {} functions, {} events",
        contract_name, function_count, event_count
    );

    Ok(LoadedAbi {
        contract_name: contract_name.to_string(),
        entries,
        function_count,
        event_count,
    })
}

/// Load all platform contract ABIs.
pub fn load_all_abis() -> Result<Vec<LoadedAbi>, BlockchainError> {
    let contract_names = [
        "DeliveryVerification",
        "DriverPayout",
        "PartnerSLA",
        "DriverIdentity",
    ];

    let mut abis = Vec::new();
    for name in &contract_names {
        abis.push(load_abi(name)?);
    }

    info!(
        "Loaded {} contract ABIs ({} total functions, {} total events)",
        abis.len(),
        abis.iter().map(|a| a.function_count).sum::<usize>(),
        abis.iter().map(|a| a.event_count).sum::<usize>(),
    );

    Ok(abis)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_missing_abi_returns_empty() {
        let result = load_abi("NonExistentContract");
        assert!(result.is_ok());
        let abi = result.unwrap();
        assert_eq!(abi.entries.len(), 0);
        assert_eq!(abi.function_count, 0);
    }
}
