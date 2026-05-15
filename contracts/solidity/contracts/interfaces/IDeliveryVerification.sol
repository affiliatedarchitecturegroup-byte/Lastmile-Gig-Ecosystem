// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDeliveryVerification
 * @notice Interface for the DeliveryVerification contract.
 * @dev Used by other contracts and external integrations to interact
 *      with the delivery verification system.
 */
interface IDeliveryVerification {
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

    function recordDelivery(
        bytes32 _orderId,
        bytes32 _driverId,
        bytes32 _customerId,
        int256 _lat,
        int256 _lng,
        bytes32 _photoHash,
        bytes32 _signatureHash
    ) external;

    function disputeDelivery(bytes32 _orderId) external;

    function resolveDispute(bytes32 _orderId, bool _verified) external;

    function verifyDelivery(
        bytes32 _orderId
    ) external view returns (bool verified, uint256 timestamp, bytes32 photoHash);

    function getDeliveryRecord(
        bytes32 _orderId
    ) external view returns (DeliveryRecord memory record);

    function deliveryExists(bytes32 _orderId) external view returns (bool exists);

    function getStats() external view returns (uint256 total, uint256 disputed);
}
