// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title DriverIdentity
 * @author Lastmile Gig (Pty) Ltd
 * @notice Decentralised Identity (DID) for driver credentials on Polygon CDK.
 * @dev Issues, verifies, and revokes driver identity credentials.
 *      Phase 3 contract - provides cross-platform driver credential persistence.
 *      Biometric hashes only - raw biometric data is stored exclusively in Vault.
 *
 * @custom:security-contact security@aagais.co.za
 * @custom:see docs/specs/06_BLOCKCHAIN_LAYER.md - Section 2.4
 */
contract DriverIdentity is AccessControl, Pausable {
    // --- Roles ---
    bytes32 public constant IDENTITY_AUTHORITY_ROLE = keccak256("IDENTITY_AUTHORITY_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // --- Constants ---
    uint256 public constant MIN_VALIDITY_DAYS = 30;
    uint256 public constant MAX_VALIDITY_DAYS = 1825;

    // --- Data Structures ---
    enum CredentialStatus {
        ACTIVE,
        EXPIRED,
        REVOKED,
        SUSPENDED
    }

    struct Credential {
        bytes32 driverId;
        bytes32 licenceHash;
        bytes32 biometricHash;
        bytes32 pdpHash;
        uint256 issuedAt;
        uint256 expiresAt;
        CredentialStatus status;
        uint256 version;
        address issuedBy;
    }

    struct CredentialRevocation {
        bytes32 driverId;
        string reason;
        uint256 revokedAt;
        address revokedBy;
    }

    // --- State ---
    mapping(bytes32 => Credential) private _credentials;
    mapping(bytes32 => bool) private _credentialExists;
    mapping(bytes32 => CredentialRevocation[]) private _revocationHistory;
    mapping(bytes32 => uint256) private _credentialVersions;
    uint256 private _totalCredentials;
    uint256 private _activeCredentials;
    uint256 private _revokedCredentials;

    // --- Events ---
    event CredentialIssued(
        bytes32 indexed driverId,
        bytes32 licenceHash,
        uint256 issuedAt,
        uint256 expiresAt,
        uint256 version
    );

    event CredentialRevoked(
        bytes32 indexed driverId,
        string reason,
        address indexed revokedBy,
        uint256 timestamp
    );

    event CredentialSuspended(
        bytes32 indexed driverId,
        address indexed suspendedBy,
        uint256 timestamp
    );

    event CredentialReinstated(
        bytes32 indexed driverId,
        address indexed reinstatedBy,
        uint256 timestamp
    );

    event CredentialRenewed(
        bytes32 indexed driverId,
        uint256 newExpiresAt,
        uint256 version
    );

    // --- Errors ---
    error CredentialNotFound(bytes32 driverId);
    error CredentialAlreadyActive(bytes32 driverId);
    error CredentialNotActive(bytes32 driverId);
    error InvalidDriverId();
    error InvalidLicenceHash();
    error InvalidBiometricHash();
    error InvalidValidityPeriod(uint256 days_);
    error CredentialExpired(bytes32 driverId, uint256 expiredAt);

    // --- Constructor ---
    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(IDENTITY_AUTHORITY_ROLE, admin);
        _grantRole(VERIFIER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    // --- Core Functions ---

    /**
     * @notice Issue a new driver identity credential.
     * @param _driverId Unique driver identifier
     * @param _licenceHash Hash of the driver licence document
     * @param _biometricHash Hash of the biometric template (NOT raw data)
     * @param _pdpHash Hash of the Professional Driving Permit
     * @param _validityDays Number of days the credential is valid
     */
    function issueCredential(
        bytes32 _driverId,
        bytes32 _licenceHash,
        bytes32 _biometricHash,
        bytes32 _pdpHash,
        uint256 _validityDays
    ) external onlyRole(IDENTITY_AUTHORITY_ROLE) whenNotPaused {
        if (_driverId == bytes32(0)) revert InvalidDriverId();
        if (_licenceHash == bytes32(0)) revert InvalidLicenceHash();
        if (_biometricHash == bytes32(0)) revert InvalidBiometricHash();
        if (_validityDays < MIN_VALIDITY_DAYS || _validityDays > MAX_VALIDITY_DAYS) {
            revert InvalidValidityPeriod(_validityDays);
        }

        if (_credentialExists[_driverId]) {
            Credential storage existing = _credentials[_driverId];
            if (existing.status == CredentialStatus.ACTIVE) {
                revert CredentialAlreadyActive(_driverId);
            }
            if (existing.status == CredentialStatus.ACTIVE) {
                _activeCredentials--;
            }
        }

        uint256 version = _credentialVersions[_driverId] + 1;
        _credentialVersions[_driverId] = version;

        uint256 expiresAt = block.timestamp + (_validityDays * 1 days);

        _credentials[_driverId] = Credential({
            driverId: _driverId,
            licenceHash: _licenceHash,
            biometricHash: _biometricHash,
            pdpHash: _pdpHash,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            status: CredentialStatus.ACTIVE,
            version: version,
            issuedBy: msg.sender
        });

        if (!_credentialExists[_driverId]) {
            _totalCredentials++;
        }
        _credentialExists[_driverId] = true;
        _activeCredentials++;

        emit CredentialIssued(_driverId, _licenceHash, block.timestamp, expiresAt, version);
    }

    /**
     * @notice Verify a driver credential is valid.
     * @param _driverId The driver to verify
     * @return valid Whether the credential is currently valid
     * @return expiresAt When the credential expires
     * @return version The credential version
     */
    function verifyCredential(
        bytes32 _driverId
    ) external view returns (bool valid, uint256 expiresAt, uint256 version) {
        if (!_credentialExists[_driverId]) revert CredentialNotFound(_driverId);

        Credential memory cred = _credentials[_driverId];
        bool isValid = cred.status == CredentialStatus.ACTIVE &&
            block.timestamp < cred.expiresAt;

        return (isValid, cred.expiresAt, cred.version);
    }

    /**
     * @notice Revoke a driver credential permanently.
     * @param _driverId The driver whose credential to revoke
     * @param _reason Reason for revocation
     */
    function revokeCredential(
        bytes32 _driverId,
        string calldata _reason
    ) external onlyRole(IDENTITY_AUTHORITY_ROLE) whenNotPaused {
        if (!_credentialExists[_driverId]) revert CredentialNotFound(_driverId);

        Credential storage cred = _credentials[_driverId];
        if (cred.status == CredentialStatus.REVOKED) {
            revert CredentialNotActive(_driverId);
        }

        if (cred.status == CredentialStatus.ACTIVE) {
            _activeCredentials--;
        }

        cred.status = CredentialStatus.REVOKED;
        _revokedCredentials++;

        _revocationHistory[_driverId].push(
            CredentialRevocation({
                driverId: _driverId,
                reason: _reason,
                revokedAt: block.timestamp,
                revokedBy: msg.sender
            })
        );

        emit CredentialRevoked(_driverId, _reason, msg.sender, block.timestamp);
    }

    /**
     * @notice Temporarily suspend a driver credential.
     * @param _driverId The driver whose credential to suspend
     */
    function suspendCredential(
        bytes32 _driverId
    ) external onlyRole(IDENTITY_AUTHORITY_ROLE) whenNotPaused {
        if (!_credentialExists[_driverId]) revert CredentialNotFound(_driverId);

        Credential storage cred = _credentials[_driverId];
        if (cred.status != CredentialStatus.ACTIVE) {
            revert CredentialNotActive(_driverId);
        }

        cred.status = CredentialStatus.SUSPENDED;
        _activeCredentials--;

        emit CredentialSuspended(_driverId, msg.sender, block.timestamp);
    }

    /**
     * @notice Reinstate a suspended credential.
     * @param _driverId The driver whose credential to reinstate
     */
    function reinstateCredential(
        bytes32 _driverId
    ) external onlyRole(IDENTITY_AUTHORITY_ROLE) whenNotPaused {
        if (!_credentialExists[_driverId]) revert CredentialNotFound(_driverId);

        Credential storage cred = _credentials[_driverId];
        if (cred.status != CredentialStatus.SUSPENDED) {
            revert CredentialNotActive(_driverId);
        }
        if (block.timestamp >= cred.expiresAt) {
            revert CredentialExpired(_driverId, cred.expiresAt);
        }

        cred.status = CredentialStatus.ACTIVE;
        _activeCredentials++;

        emit CredentialReinstated(_driverId, msg.sender, block.timestamp);
    }

    /**
     * @notice Renew an existing credential with a new expiry.
     * @param _driverId The driver to renew
     * @param _validityDays New validity period in days
     */
    function renewCredential(
        bytes32 _driverId,
        uint256 _validityDays
    ) external onlyRole(IDENTITY_AUTHORITY_ROLE) whenNotPaused {
        if (!_credentialExists[_driverId]) revert CredentialNotFound(_driverId);
        if (_validityDays < MIN_VALIDITY_DAYS || _validityDays > MAX_VALIDITY_DAYS) {
            revert InvalidValidityPeriod(_validityDays);
        }

        Credential storage cred = _credentials[_driverId];

        uint256 newVersion = _credentialVersions[_driverId] + 1;
        _credentialVersions[_driverId] = newVersion;
        cred.version = newVersion;
        cred.expiresAt = block.timestamp + (_validityDays * 1 days);
        cred.status = CredentialStatus.ACTIVE;

        if (cred.status != CredentialStatus.ACTIVE) {
            _activeCredentials++;
        }

        emit CredentialRenewed(_driverId, cred.expiresAt, newVersion);
    }

    // --- View Functions ---

    function getCredential(
        bytes32 _driverId
    ) external view returns (Credential memory) {
        if (!_credentialExists[_driverId]) revert CredentialNotFound(_driverId);
        return _credentials[_driverId];
    }

    function getRevocationHistory(
        bytes32 _driverId
    ) external view returns (CredentialRevocation[] memory) {
        return _revocationHistory[_driverId];
    }

    function getStats()
        external
        view
        returns (
            uint256 total,
            uint256 active,
            uint256 revoked
        )
    {
        return (_totalCredentials, _activeCredentials, _revokedCredentials);
    }

    function credentialExists(bytes32 _driverId) external view returns (bool) {
        return _credentialExists[_driverId];
    }

    // --- Admin Functions ---

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
