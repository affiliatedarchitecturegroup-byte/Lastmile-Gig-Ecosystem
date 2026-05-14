// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DeliveryVerification
 * @author Lastmile Gig (Pty) Ltd
 * @notice Immutable on-chain record of delivery completions for DFI audit compliance
 * @dev Deployed on Polygon CDK for low-cost, high-throughput recording
 * @custom:phase P222 - Smart Contract DeliveryVerification.sol
 *
 * Each delivery record stores a hash of the delivery data (never PII) along with
 * timestamps, geo-tag hashes, and verification status. This provides a tamper-proof
 * audit trail for the Department of Finance and Innovation (DFI) compliance.
 */
contract DeliveryVerification {
    /// @notice Emitted when a delivery is recorded on-chain
    event DeliveryRecorded(
        bytes32 indexed deliveryHash,
        bytes32 indexed orderHash,
        bytes32 indexed driverHash,
        uint256 timestamp,
        uint8 status
    );

    /// @notice Emitted when a delivery is verified (e.g., by partner confirmation)
    event DeliveryVerified(
        bytes32 indexed deliveryHash,
        address indexed verifier,
        uint256 timestamp
    );

    /// @notice Delivery verification status
    enum DeliveryStatus {
        Recorded,    // Initial on-chain record
        Verified,    // Verified by partner or system
        Disputed,    // Under dispute
        Resolved     // Dispute resolved
    }

    /// @notice On-chain delivery record (no PII - hashes only)
    struct DeliveryRecord {
        bytes32 orderHash;       // SHA-256 hash of order ID
        bytes32 driverHash;      // SHA-256 hash of driver ID
        bytes32 partnerHash;     // SHA-256 hash of partner ID
        bytes32 geoTagHash;      // SHA-256 hash of delivery GPS coordinates
        bytes32 photoHash;       // SHA-256 hash of delivery photo (IPFS CID)
        uint256 recordedAt;      // Block timestamp when recorded
        uint256 verifiedAt;      // Block timestamp when verified (0 if not)
        DeliveryStatus status;   // Current verification status
        address recorder;        // Address that recorded the delivery
        address verifier;        // Address that verified (address(0) if not)
    }

    /// @notice Platform admin address (multi-sig in production)
    address public immutable admin;

    /// @notice Authorized recorder addresses (svc-blockchain service accounts)
    mapping(address => bool) public authorizedRecorders;

    /// @notice Delivery records by delivery hash
    mapping(bytes32 => DeliveryRecord) public deliveries;

    /// @notice Total number of deliveries recorded
    uint256 public totalDeliveries;

    /// @notice Total number of verified deliveries
    uint256 public totalVerified;

    /// @dev Only admin modifier
    modifier onlyAdmin() {
        require(msg.sender == admin, "DeliveryVerification: caller is not admin");
        _;
    }

    /// @dev Only authorized recorder modifier
    modifier onlyRecorder() {
        require(
            authorizedRecorders[msg.sender] || msg.sender == admin,
            "DeliveryVerification: caller is not authorized recorder"
        );
        _;
    }

    /**
     * @notice Deploy the DeliveryVerification contract
     * @param _admin Platform admin address (multi-sig recommended)
     */
    constructor(address _admin) {
        require(_admin != address(0), "DeliveryVerification: admin is zero address");
        admin = _admin;
        authorizedRecorders[_admin] = true;
    }

    /**
     * @notice Authorize or revoke a recorder address
     * @param recorder Address to authorize/revoke
     * @param authorized Whether to authorize (true) or revoke (false)
     */
    function setRecorder(address recorder, bool authorized) external onlyAdmin {
        require(recorder != address(0), "DeliveryVerification: recorder is zero address");
        authorizedRecorders[recorder] = authorized;
    }

    /**
     * @notice Record a delivery on-chain
     * @param deliveryHash Unique hash identifying this delivery
     * @param orderHash SHA-256 hash of the order ID
     * @param driverHash SHA-256 hash of the driver ID
     * @param partnerHash SHA-256 hash of the partner ID
     * @param geoTagHash SHA-256 hash of GPS coordinates at delivery
     * @param photoHash SHA-256 hash of delivery photo (IPFS CID)
     */
    function recordDelivery(
        bytes32 deliveryHash,
        bytes32 orderHash,
        bytes32 driverHash,
        bytes32 partnerHash,
        bytes32 geoTagHash,
        bytes32 photoHash
    ) external onlyRecorder {
        require(
            deliveries[deliveryHash].recordedAt == 0,
            "DeliveryVerification: delivery already recorded"
        );

        deliveries[deliveryHash] = DeliveryRecord({
            orderHash: orderHash,
            driverHash: driverHash,
            partnerHash: partnerHash,
            geoTagHash: geoTagHash,
            photoHash: photoHash,
            recordedAt: block.timestamp,
            verifiedAt: 0,
            status: DeliveryStatus.Recorded,
            recorder: msg.sender,
            verifier: address(0)
        });

        totalDeliveries++;

        emit DeliveryRecorded(
            deliveryHash,
            orderHash,
            driverHash,
            block.timestamp,
            uint8(DeliveryStatus.Recorded)
        );
    }

    /**
     * @notice Verify a recorded delivery
     * @param deliveryHash Hash of the delivery to verify
     */
    function verifyDelivery(bytes32 deliveryHash) external onlyRecorder {
        DeliveryRecord storage record = deliveries[deliveryHash];
        require(record.recordedAt != 0, "DeliveryVerification: delivery not found");
        require(
            record.status == DeliveryStatus.Recorded,
            "DeliveryVerification: delivery not in Recorded status"
        );

        record.status = DeliveryStatus.Verified;
        record.verifiedAt = block.timestamp;
        record.verifier = msg.sender;
        totalVerified++;

        emit DeliveryVerified(deliveryHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Get delivery record by hash
     * @param deliveryHash Hash of the delivery
     * @return The delivery record struct
     */
    function getDelivery(bytes32 deliveryHash)
        external
        view
        returns (DeliveryRecord memory)
    {
        require(
            deliveries[deliveryHash].recordedAt != 0,
            "DeliveryVerification: delivery not found"
        );
        return deliveries[deliveryHash];
    }

    /**
     * @notice Check if a delivery exists on-chain
     * @param deliveryHash Hash to check
     * @return true if the delivery is recorded
     */
    function deliveryExists(bytes32 deliveryHash) external view returns (bool) {
        return deliveries[deliveryHash].recordedAt != 0;
    }
}
