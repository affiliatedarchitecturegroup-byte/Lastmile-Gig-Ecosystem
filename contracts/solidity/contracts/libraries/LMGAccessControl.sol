// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title LMGAccessControl
 * @author Lastmile Gig (Pty) Ltd
 * @notice Shared access control roles and role management for LMG contracts.
 * @dev Extends OpenZeppelin AccessControl with platform-specific role
 *      definitions and multi-role grant utilities.
 *
 * @custom:security-contact security@aagais.co.za
 */
abstract contract LMGAccessControl is AccessControl {
    // --- Platform-Wide Roles ---

    /// @notice Role for the blockchain service (svc-blockchain) to record events
    bytes32 public constant BLOCKCHAIN_SERVICE_ROLE = keccak256("BLOCKCHAIN_SERVICE_ROLE");

    /// @notice Role for the payment service to manage escrows
    bytes32 public constant PAYMENT_SERVICE_ROLE = keccak256("PAYMENT_SERVICE_ROLE");

    /// @notice Role for the identity authority to manage credentials
    bytes32 public constant IDENTITY_AUTHORITY_ROLE = keccak256("IDENTITY_AUTHORITY_ROLE");

    /// @notice Role for ops staff to verify/dispute deliveries
    bytes32 public constant OPS_VERIFIER_ROLE = keccak256("OPS_VERIFIER_ROLE");

    /// @notice Role for SLA management
    bytes32 public constant SLA_MANAGER_ROLE = keccak256("SLA_MANAGER_ROLE");

    /// @notice Role for emergency pause
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    /// @notice Role for contract upgrader
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // --- Events ---

    event ServiceWalletRegistered(address indexed wallet, bytes32 indexed role, uint256 timestamp);
    event ServiceWalletRevoked(address indexed wallet, bytes32 indexed role, uint256 timestamp);

    // --- Errors ---

    error ZeroAddressNotAllowed();
    error RoleAlreadyGranted(address account, bytes32 role);

    // --- Functions ---

    /**
     * @notice Register a service wallet with the blockchain service role.
     * @param wallet The service wallet address
     */
    function registerServiceWallet(
        address wallet
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (wallet == address(0)) revert ZeroAddressNotAllowed();
        _grantRole(BLOCKCHAIN_SERVICE_ROLE, wallet);
        emit ServiceWalletRegistered(wallet, BLOCKCHAIN_SERVICE_ROLE, block.timestamp);
    }

    /**
     * @notice Revoke a service wallet role.
     * @param wallet The service wallet to revoke
     * @param role The role to revoke
     */
    function revokeServiceWallet(
        address wallet,
        bytes32 role
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(role, wallet);
        emit ServiceWalletRevoked(wallet, role, block.timestamp);
    }

    /**
     * @notice Grant multiple roles to an address in a single transaction.
     * @param account The address to grant roles to
     * @param roles Array of role identifiers
     */
    function grantMultipleRoles(
        address account,
        bytes32[] calldata roles
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (account == address(0)) revert ZeroAddressNotAllowed();
        for (uint256 i = 0; i < roles.length; i++) {
            _grantRole(roles[i], account);
        }
    }

    /**
     * @notice Check if an address has any of the specified roles.
     * @param account The address to check
     * @param roles Array of role identifiers
     * @return hasAny Whether the address has any of the roles
     */
    function hasAnyRole(
        address account,
        bytes32[] calldata roles
    ) external view returns (bool hasAny) {
        for (uint256 i = 0; i < roles.length; i++) {
            if (hasRole(roles[i], account)) {
                return true;
            }
        }
        return false;
    }
}
