//! Blockchain Client - Core interface to Polygon CDK contracts.
//!
//! Manages provider connections, transaction signing, and contract calls.
//! This is the single point of interaction between the platform and chain.
//!
//! See: docs/specs/06_BLOCKCHAIN_LAYER.md - Section 3

use std::sync::Arc;

use ethers::prelude::*;
use ethers::providers::{Http, Provider};
use ethers::signers::{LocalWallet, Signer};
use ethers::types::{Address, H256, U256};
use tracing::{info, instrument, warn};

use crate::config::AppConfig;
use crate::error::BlockchainError;

/// Type alias for the signed middleware provider.
type SignedProvider = SignerMiddleware<Provider<Http>, LocalWallet>;

/// Core blockchain client managing all contract interactions.
pub struct BlockchainClient {
    provider: Arc<SignedProvider>,
    chain_id: u64,
    delivery_verification_address: Option<Address>,
    driver_payout_address: Option<Address>,
    partner_sla_address: Option<Address>,
    driver_identity_address: Option<Address>,
}

impl BlockchainClient {
    /// Create a new blockchain client from configuration.
    pub async fn new(config: &AppConfig) -> Result<Self, BlockchainError> {
        let provider = Provider::<Http>::try_from(&config.polygon_rpc_url)
            .map_err(|e| BlockchainError::ProviderError(e.to_string()))?;

        // If a signer key is configured, create a signed provider
        let signed_provider = if !config.signer_private_key.is_empty() {
            let wallet: LocalWallet = config
                .signer_private_key
                .parse::<LocalWallet>()
                .map_err(|e| BlockchainError::SignerError(e.to_string()))?
                .with_chain_id(config.chain_id);

            info!(
                "Signer configured: {}",
                format!("0x{:x}...{:x}", &wallet.address().0[..2], &wallet.address().0[18..])
            );

            SignerMiddleware::new(provider, wallet)
        } else {
            warn!("No signer private key configured - read-only mode");
            let dummy_wallet = LocalWallet::new(&mut rand::thread_rng())
                .with_chain_id(config.chain_id);
            SignerMiddleware::new(provider, dummy_wallet)
        };

        let delivery_addr = Self::parse_address_opt(&config.delivery_verification_address)?;
        let payout_addr = Self::parse_address_opt(&config.driver_payout_address)?;
        let sla_addr = Self::parse_address_opt(&config.partner_sla_address)?;
        let identity_addr = Self::parse_address_opt(&config.driver_identity_address)?;

        Ok(Self {
            provider: Arc::new(signed_provider),
            chain_id: config.chain_id,
            delivery_verification_address: delivery_addr,
            driver_payout_address: payout_addr,
            partner_sla_address: sla_addr,
            driver_identity_address: identity_addr,
        })
    }

    /// Record a delivery verification on-chain.
    #[instrument(skip(self), fields(order_id))]
    pub async fn record_delivery(
        &self,
        order_id: [u8; 32],
        driver_id: [u8; 32],
        customer_id: [u8; 32],
        lat_fixed: i64,
        lng_fixed: i64,
        photo_hash: [u8; 32],
        signature_hash: [u8; 32],
    ) -> Result<(H256, u64), BlockchainError> {
        let _address = self
            .delivery_verification_address
            .ok_or_else(|| BlockchainError::ContractNotDeployed("DeliveryVerification".into()))?;

        // In a full implementation, this would use ethers abigen! macro
        // to call the contract. For the scaffold, we return a placeholder.
        info!("Recording delivery on-chain for order {:?}", &order_id[..8]);

        // Placeholder: actual contract interaction would go here
        // using the generated contract bindings from abigen!
        let tx_hash = H256::zero();
        let block_number = self
            .provider
            .get_block_number()
            .await
            .map_err(|e| BlockchainError::ProviderError(e.to_string()))?
            .as_u64();

        Ok((tx_hash, block_number))
    }

    /// Create a payout escrow for a driver.
    #[instrument(skip(self), fields(order_id))]
    pub async fn create_escrow(
        &self,
        order_id: [u8; 32],
        driver_wallet: Address,
        amount: U256,
    ) -> Result<(H256, u64), BlockchainError> {
        let _address = self
            .driver_payout_address
            .ok_or_else(|| BlockchainError::ContractNotDeployed("DriverPayout".into()))?;

        info!(
            "Creating escrow for order {:?}, driver: {:?}, amount: {}",
            &order_id[..8],
            driver_wallet,
            amount
        );

        let tx_hash = H256::zero();
        let block_number = self
            .provider
            .get_block_number()
            .await
            .map_err(|e| BlockchainError::ProviderError(e.to_string()))?
            .as_u64();

        Ok((tx_hash, block_number))
    }

    /// Release payout from escrow to driver wallet.
    #[instrument(skip(self), fields(order_id))]
    pub async fn release_payout(
        &self,
        order_id: [u8; 32],
    ) -> Result<(H256, u64), BlockchainError> {
        let _address = self
            .driver_payout_address
            .ok_or_else(|| BlockchainError::ContractNotDeployed("DriverPayout".into()))?;

        info!("Releasing payout for order {:?}", &order_id[..8]);

        let tx_hash = H256::zero();
        let block_number = self
            .provider
            .get_block_number()
            .await
            .map_err(|e| BlockchainError::ProviderError(e.to_string()))?
            .as_u64();

        Ok((tx_hash, block_number))
    }

    /// Verify a delivery record on-chain.
    #[instrument(skip(self), fields(order_id))]
    pub async fn verify_delivery(
        &self,
        order_id: [u8; 32],
    ) -> Result<(bool, u64, [u8; 32]), BlockchainError> {
        let _address = self
            .delivery_verification_address
            .ok_or_else(|| BlockchainError::ContractNotDeployed("DeliveryVerification".into()))?;

        info!("Verifying delivery for order {:?}", &order_id[..8]);

        // Placeholder
        Ok((true, 0, [0u8; 32]))
    }

    /// Issue a driver identity credential on-chain.
    #[instrument(skip(self), fields(driver_id))]
    pub async fn issue_credential(
        &self,
        driver_id: [u8; 32],
        licence_hash: [u8; 32],
        biometric_hash: [u8; 32],
        pdp_hash: [u8; 32],
        validity_days: u64,
    ) -> Result<(H256, u64), BlockchainError> {
        let _address = self
            .driver_identity_address
            .ok_or_else(|| BlockchainError::ContractNotDeployed("DriverIdentity".into()))?;

        info!(
            "Issuing credential for driver {:?}, valid for {} days",
            &driver_id[..8],
            validity_days
        );

        let tx_hash = H256::zero();
        let block_number = self
            .provider
            .get_block_number()
            .await
            .map_err(|e| BlockchainError::ProviderError(e.to_string()))?
            .as_u64();

        Ok((tx_hash, block_number))
    }

    /// Get the latest block number from the chain.
    pub async fn get_latest_block(&self) -> Result<u64, BlockchainError> {
        self.provider
            .get_block_number()
            .await
            .map(|n| n.as_u64())
            .map_err(|e| BlockchainError::ProviderError(e.to_string()))
    }

    /// Get the chain ID.
    pub fn chain_id(&self) -> u64 {
        self.chain_id
    }

    /// Check if the provider connection is healthy.
    pub async fn is_connected(&self) -> bool {
        self.provider.get_block_number().await.is_ok()
    }

    /// Parse an optional address string, returning None for empty strings.
    fn parse_address_opt(addr: &str) -> Result<Option<Address>, BlockchainError> {
        if addr.is_empty() {
            return Ok(None);
        }
        addr.parse::<Address>()
            .map(Some)
            .map_err(|_| BlockchainError::InvalidAddress(addr.to_string()))
    }
}
