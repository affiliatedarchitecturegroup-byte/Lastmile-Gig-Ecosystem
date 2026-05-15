// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title DeliveryVerification
 * @author Lastmile Gig (Pty) Ltd
 * @notice Immutable delivery proof records on Polygon CDK for DFI audit trail.
 * @dev Records delivery events with GPS coordinates, photo hashes, and timestamps.
 *      Used by sefa, KZN Growth Fund, and impact investors for independent audit.
 *
 * @custom:security-contact security@aagais.co.za
 * @custom:see docs/specs/06_BLOCKCHAIN_LAYER.md - Section 2.1
 */
contract DeliveryVerification is AccessControl, ReentrancyGuard, Pausable {
    // --- Roles ---
    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // --- Data Structures ---
    struct DeliveryRecord {
        bytes32 orderId;
        bytes32 driverId;
        bytes32 customerId;
        int256 deliveryLat;
        int256 deliveryLng;
        uint256 timestamp;
        bytes32 photoHash;
        bytes32 signatureHash;
        bool verified;
        bool disputed;
        uint256 blockNumber;
    }

    // --- State ---
    mapping(bytes32 => DeliveryRecord) private _deliveries;
    mapping(bytes32 => bool) private _orderExists;
    uint256 private _totalDeliveries;
    uint256 private _totalDisputed;

    // --- Events ---
    event DeliveryRecorded(
        bytes32 indexed orderId,
        bytes32 indexed driverId,
        bytes32 indexed customerId,
        uint256 timestamp,
        bytes32 photoHash
    );

    event DeliveryDisputed(
        bytes32 indexed orderId,
        address indexed disputedBy,
        uint256 timestamp
    );

    event DeliveryDisputeResolved(
        bytes32 indexed orderId,
        bool verified,
        address indexed resolvedBy,
        uint256 timestamp
    );

    // --- Errors ---
    error DeliveryAlreadyRecorded(bytes32 orderId);
    error DeliveryNotFound(bytes32 orderId);
    error DeliveryNotDisputed(bytes32 orderId);
    error InvalidCoordinates(int256 lat, int256 lng);
    error EmptyPhotoHash();
    error EmptyOrderId();
    error EmptyDriverId();

    // --- Constructor ---
    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RECORDER_ROLE, admin);
        _grantRole(VERIFIER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    // --- Core Functions ---

    /**
     * @notice Record an immutable proof of delivery.
     * @param _orderId Unique order identifier (UUID v4 as bytes32)
     * @param _driverId Driver identifier
     * @param _customerId Customer identifier
     * @param _lat Delivery latitude (GPS * 1e6 fixed point)
     * @param _lng Delivery longitude (GPS * 1e6 fixed point)
     * @param _photoHash IPFS hash of the delivery confirmation photo
     * @param _signatureHash Hash of the customer digital signature
     */
    function recordDelivery(
        bytes32 _orderId,
        bytes32 _driverId,
        bytes32 _customerId,
        int256 _lat,
        int256 _lng,
        bytes32 _photoHash,
        bytes32 _signatureHash
    ) external onlyRole(RECORDER_ROLE) whenNotPaused nonReentrant {
        if (_orderId == bytes32(0)) revert EmptyOrderId();
        if (_driverId == bytes32(0)) revert EmptyDriverId();
        if (_photoHash == bytes32(0)) revert EmptyPhotoHash();
        if (_orderExists[_orderId]) revert DeliveryAlreadyRecorded(_orderId);
        if (_lat < -90000000 || _lat > 90000000) revert InvalidCoordinates(_lat, _lng);
        if (_lng < -180000000 || _lng > 180000000) revert InvalidCoordinates(_lat, _lng);

        _deliveries[_orderId] = DeliveryRecord({
            orderId: _orderId,
            driverId: _driverId,
            customerId: _customerId,
            deliveryLat: _lat,
            deliveryLng: _lng,
            timestamp: block.timestamp,
            photoHash: _photoHash,
            signatureHash: _signatureHash,
            verified: true,
            disputed: false,
            blockNumber: block.number
        });

        _orderExists[_orderId] = true;
        _totalDeliveries++;

        emit DeliveryRecorded(_orderId, _driverId, _customerId, block.timestamp, _photoHash);
    }

    /**
     * @notice Flag a delivery as disputed (e.g., customer claims non-delivery).
     * @param _orderId The order to dispute
     */
    function disputeDelivery(
        bytes32 _orderId
    ) external onlyRole(VERIFIER_ROLE) whenNotPaused {
        if (!_orderExists[_orderId]) revert DeliveryNotFound(_orderId);

        DeliveryRecord storage record = _deliveries[_orderId];
        record.disputed = true;
        _totalDisputed++;

        emit DeliveryDisputed(_orderId, msg.sender, block.timestamp);
    }

    /**
     * @notice Resolve a disputed delivery after investigation.
     * @param _orderId The disputed order
     * @param _verified Whether the delivery is confirmed valid after review
     */
    function resolveDispute(
        bytes32 _orderId,
        bool _verified
    ) external onlyRole(VERIFIER_ROLE) whenNotPaused {
        if (!_orderExists[_orderId]) revert DeliveryNotFound(_orderId);

        DeliveryRecord storage record = _deliveries[_orderId];
        if (!record.disputed) revert DeliveryNotDisputed(_orderId);

        record.verified = _verified;
        record.disputed = false;
        if (_totalDisputed > 0) {
            _totalDisputed--;
        }

        emit DeliveryDisputeResolved(_orderId, _verified, msg.sender, block.timestamp);
    }

    // --- View Functions ---

    /**
     * @notice Verify a delivery record exists and is valid.
     * @param _orderId The order to verify
     * @return verified Whether the delivery is verified
     * @return timestamp The delivery timestamp
     * @return photoHash The IPFS photo hash
     */
    function verifyDelivery(
        bytes32 _orderId
    ) external view returns (bool verified, uint256 timestamp, bytes32 photoHash) {
        if (!_orderExists[_orderId]) revert DeliveryNotFound(_orderId);
        DeliveryRecord memory r = _deliveries[_orderId];
        return (r.verified, r.timestamp, r.photoHash);
    }

    /**
     * @notice Get the full delivery record for audit purposes.
     * @param _orderId The order to look up
     * @return record The complete delivery record
     */
    function getDeliveryRecord(
        bytes32 _orderId
    ) external view returns (DeliveryRecord memory record) {
        if (!_orderExists[_orderId]) revert DeliveryNotFound(_orderId);
        return _deliveries[_orderId];
    }

    /**
     * @notice Check if a delivery record exists for the given order.
     * @param _orderId The order to check
     * @return exists Whether the record exists
     */
    function deliveryExists(bytes32 _orderId) external view returns (bool exists) {
        return _orderExists[_orderId];
    }

    /**
     * @notice Get platform-wide delivery statistics.
     * @return total Total deliveries recorded
     * @return disputed Currently disputed deliveries
     */
    function getStats() external view returns (uint256 total, uint256 disputed) {
        return (_totalDeliveries, _totalDisputed);
    }

    // --- Admin Functions ---

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
