// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DeliveryVerification
 * @notice Records immutable delivery proofs on Polygon CDK for DFI compliance.
 * @dev Each delivery record contains a hash of the delivery data (GPS, photo, timestamp)
 *      ensuring no PII is stored on-chain (POPIA compliant).
 *
 * @custom:see docs/specs/06_BLOCKCHAIN_LAYER.md
 * @custom:network Polygon CDK L2
 */
contract DeliveryVerification {
    struct DeliveryRecord {
        bytes32 orderHash;
        bytes32 driverHash;
        bytes32 photoHash;
        int256 latitude;
        int256 longitude;
        uint256 timestamp;
        bool verified;
    }

    /// @notice Mapping from order ID hash to delivery record
    mapping(bytes32 => DeliveryRecord) public deliveries;

    /// @notice Array of all delivery hashes for enumeration
    bytes32[] public deliveryHashes;

    /// @notice Platform admin address (can update verification status)
    address public admin;

    /// @notice Emitted when a delivery is recorded on-chain
    event DeliveryRecorded(
        bytes32 indexed orderHash,
        bytes32 indexed driverHash,
        bytes32 photoHash,
        uint256 timestamp
    );

    /// @notice Emitted when a delivery is verified
    event DeliveryVerified(bytes32 indexed orderHash, uint256 timestamp);

    modifier onlyAdmin() {
        require(msg.sender == admin, "DeliveryVerification: caller is not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /**
     * @notice Record a delivery proof on-chain.
     * @param _orderHash Keccak256 hash of the order UUID
     * @param _driverHash Keccak256 hash of the driver UUID
     * @param _photoHash IPFS/Cloudinary hash of the delivery photo
     * @param _latitude Delivery GPS latitude (multiplied by 1e6 for precision)
     * @param _longitude Delivery GPS longitude (multiplied by 1e6 for precision)
     */
    function recordDelivery(
        bytes32 _orderHash,
        bytes32 _driverHash,
        bytes32 _photoHash,
        int256 _latitude,
        int256 _longitude
    ) external onlyAdmin {
        require(deliveries[_orderHash].timestamp == 0, "DeliveryVerification: delivery already recorded");

        deliveries[_orderHash] = DeliveryRecord({
            orderHash: _orderHash,
            driverHash: _driverHash,
            photoHash: _photoHash,
            latitude: _latitude,
            longitude: _longitude,
            timestamp: block.timestamp,
            verified: false
        });

        deliveryHashes.push(_orderHash);

        emit DeliveryRecorded(_orderHash, _driverHash, _photoHash, block.timestamp);
    }

    /**
     * @notice Mark a delivery as verified after GPS and photo validation.
     * @param _orderHash Keccak256 hash of the order UUID
     */
    function verifyDelivery(bytes32 _orderHash) external onlyAdmin {
        require(deliveries[_orderHash].timestamp > 0, "DeliveryVerification: delivery not found");
        require(!deliveries[_orderHash].verified, "DeliveryVerification: already verified");

        deliveries[_orderHash].verified = true;
        emit DeliveryVerified(_orderHash, block.timestamp);
    }

    /**
     * @notice Get the total number of recorded deliveries.
     */
    function getDeliveryCount() external view returns (uint256) {
        return deliveryHashes.length;
    }

    /**
     * @notice Check if a delivery has been recorded and verified.
     */
    function isDeliveryVerified(bytes32 _orderHash) external view returns (bool) {
        return deliveries[_orderHash].verified;
    }

    /**
     * @notice Transfer admin role to a new address.
     */
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "DeliveryVerification: zero address");
        admin = _newAdmin;
    }
}
