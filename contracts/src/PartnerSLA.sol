// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PartnerSLA
 * @author Lastmile Gig (Pty) Ltd
 * @notice On-chain SLA breach recording for partner accountability
 * @dev Records SLA breaches (delivery time, quality) immutably for dispute resolution
 * @custom:phase P224 - Smart Contract PartnerSLA.sol
 */
contract PartnerSLA {
    /// @notice Emitted when an SLA breach is recorded
    event SLABreachRecorded(
        bytes32 indexed breachHash,
        bytes32 indexed partnerHash,
        bytes32 indexed orderHash,
        uint8 breachType,
        uint256 timestamp
    );

    /// @notice Emitted when a breach is resolved
    event SLABreachResolved(
        bytes32 indexed breachHash,
        uint8 resolution,
        uint256 timestamp
    );

    /// @notice Breach type classification
    enum BreachType {
        DeliveryTime,       // Exceeded promised delivery time
        FoodQuality,        // Food quality complaint verified
        OrderAccuracy,      // Wrong items / missing items
        PackagingStandard,  // Packaging below standard
        HygieneViolation,   // Health & safety concern
        CancellationRate    // Excessive partner-side cancellations
    }

    /// @notice Breach resolution outcome
    enum Resolution {
        Pending,
        Upheld,          // Breach confirmed
        Dismissed,       // Breach dismissed (false positive)
        Compensated,     // Customer compensated
        PartnerWarned,   // Partner received warning
        PartnerSuspended // Partner suspended from platform
    }

    /// @notice SLA breach record
    struct BreachRecord {
        bytes32 partnerHash;
        bytes32 orderHash;
        bytes32 customerHash;
        BreachType breachType;
        Resolution resolution;
        uint256 severityScore;  // 1-10 severity
        uint256 recordedAt;
        uint256 resolvedAt;
        address recorder;
        string evidenceHash;    // IPFS hash of evidence
    }

    address public immutable admin;
    mapping(address => bool) public authorizedRecorders;
    mapping(bytes32 => BreachRecord) public breaches;
    mapping(bytes32 => uint256) public partnerBreachCount;

    uint256 public totalBreaches;
    uint256 public totalResolved;

    /// @notice Threshold for automatic partner review
    uint256 public constant REVIEW_THRESHOLD = 5;

    modifier onlyAdmin() {
        require(msg.sender == admin, "PartnerSLA: not admin");
        _;
    }

    modifier onlyRecorder() {
        require(
            authorizedRecorders[msg.sender] || msg.sender == admin,
            "PartnerSLA: not authorized"
        );
        _;
    }

    constructor(address _admin) {
        require(_admin != address(0), "PartnerSLA: zero admin");
        admin = _admin;
        authorizedRecorders[_admin] = true;
    }

    function setRecorder(address recorder, bool authorized) external onlyAdmin {
        authorizedRecorders[recorder] = authorized;
    }

    /**
     * @notice Record an SLA breach
     * @param breachHash Unique breach identifier
     * @param partnerHash Hash of partner ID
     * @param orderHash Hash of order ID
     * @param customerHash Hash of customer ID
     * @param breachType Type of SLA breach
     * @param severityScore Severity 1-10
     * @param evidenceHash IPFS hash of supporting evidence
     */
    function recordBreach(
        bytes32 breachHash,
        bytes32 partnerHash,
        bytes32 orderHash,
        bytes32 customerHash,
        BreachType breachType,
        uint256 severityScore,
        string calldata evidenceHash
    ) external onlyRecorder {
        require(breaches[breachHash].recordedAt == 0, "PartnerSLA: already recorded");
        require(severityScore >= 1 && severityScore <= 10, "PartnerSLA: invalid severity");

        breaches[breachHash] = BreachRecord({
            partnerHash: partnerHash,
            orderHash: orderHash,
            customerHash: customerHash,
            breachType: breachType,
            resolution: Resolution.Pending,
            severityScore: severityScore,
            recordedAt: block.timestamp,
            resolvedAt: 0,
            recorder: msg.sender,
            evidenceHash: evidenceHash
        });

        partnerBreachCount[partnerHash]++;
        totalBreaches++;

        emit SLABreachRecorded(
            breachHash, partnerHash, orderHash,
            uint8(breachType), block.timestamp
        );
    }

    /**
     * @notice Resolve an SLA breach
     * @param breachHash Hash of the breach to resolve
     * @param resolution Resolution outcome
     */
    function resolveBreach(
        bytes32 breachHash,
        Resolution resolution
    ) external onlyAdmin {
        BreachRecord storage record = breaches[breachHash];
        require(record.recordedAt != 0, "PartnerSLA: not found");
        require(record.resolution == Resolution.Pending, "PartnerSLA: already resolved");

        record.resolution = resolution;
        record.resolvedAt = block.timestamp;
        totalResolved++;

        emit SLABreachResolved(breachHash, uint8(resolution), block.timestamp);
    }

    /**
     * @notice Check if a partner needs review (exceeded breach threshold)
     * @param partnerHash Hash of partner ID
     * @return true if partner breach count >= REVIEW_THRESHOLD
     */
    function partnerNeedsReview(bytes32 partnerHash) external view returns (bool) {
        return partnerBreachCount[partnerHash] >= REVIEW_THRESHOLD;
    }

    function getBreach(bytes32 breachHash) external view returns (BreachRecord memory) {
        require(breaches[breachHash].recordedAt != 0, "PartnerSLA: not found");
        return breaches[breachHash];
    }
}
