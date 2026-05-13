// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PartnerSLA
 * @notice SLA enforcement and settlement contract for delivery partners.
 * @dev Records SLA terms, tracks breaches, and automates penalty/reward settlements.
 *
 * @custom:see docs/specs/06_BLOCKCHAIN_LAYER.md
 * @custom:network Polygon CDK L2
 */
contract PartnerSLA {
    struct SLAContract {
        bytes32 partnerHash;
        uint256 maxDeliveryMinutes;
        uint256 minRating;
        uint256 penaltyAmountWei;
        uint256 rewardAmountWei;
        uint256 totalDeliveries;
        uint256 breachCount;
        uint256 createdAt;
        bool active;
    }

    struct SLABreach {
        bytes32 orderHash;
        bytes32 partnerHash;
        string breachType;
        uint256 actualValue;
        uint256 thresholdValue;
        uint256 timestamp;
        bool penaltyApplied;
    }

    /// @notice Mapping from partner hash to their SLA contract
    mapping(bytes32 => SLAContract) public slaContracts;

    /// @notice Mapping from breach ID to breach record
    mapping(bytes32 => SLABreach) public breaches;

    /// @notice All breach IDs for enumeration
    bytes32[] public breachIds;

    /// @notice Platform admin
    address public admin;

    event SLACreated(bytes32 indexed partnerHash, uint256 maxDeliveryMinutes, uint256 minRating);
    event SLABreachRecorded(bytes32 indexed breachId, bytes32 indexed partnerHash, string breachType);
    event PenaltyApplied(bytes32 indexed breachId, bytes32 indexed partnerHash, uint256 amount);
    event RewardApplied(bytes32 indexed partnerHash, uint256 amount);

    modifier onlyAdmin() {
        require(msg.sender == admin, "PartnerSLA: caller is not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /**
     * @notice Create or update an SLA contract for a partner.
     */
    function createSLA(
        bytes32 _partnerHash,
        uint256 _maxDeliveryMinutes,
        uint256 _minRating,
        uint256 _penaltyAmountWei,
        uint256 _rewardAmountWei
    ) external onlyAdmin {
        slaContracts[_partnerHash] = SLAContract({
            partnerHash: _partnerHash,
            maxDeliveryMinutes: _maxDeliveryMinutes,
            minRating: _minRating,
            penaltyAmountWei: _penaltyAmountWei,
            rewardAmountWei: _rewardAmountWei,
            totalDeliveries: 0,
            breachCount: 0,
            createdAt: block.timestamp,
            active: true
        });

        emit SLACreated(_partnerHash, _maxDeliveryMinutes, _minRating);
    }

    /**
     * @notice Record an SLA breach for a partner.
     */
    function recordBreach(
        bytes32 _orderHash,
        bytes32 _partnerHash,
        string calldata _breachType,
        uint256 _actualValue,
        uint256 _thresholdValue
    ) external onlyAdmin {
        bytes32 breachId = keccak256(abi.encodePacked(_orderHash, _partnerHash, block.timestamp));

        breaches[breachId] = SLABreach({
            orderHash: _orderHash,
            partnerHash: _partnerHash,
            breachType: _breachType,
            actualValue: _actualValue,
            thresholdValue: _thresholdValue,
            timestamp: block.timestamp,
            penaltyApplied: false
        });

        breachIds.push(breachId);
        slaContracts[_partnerHash].breachCount++;

        emit SLABreachRecorded(breachId, _partnerHash, _breachType);
    }

    /**
     * @notice Record a successful delivery for SLA tracking.
     */
    function recordDelivery(bytes32 _partnerHash) external onlyAdmin {
        require(slaContracts[_partnerHash].active, "PartnerSLA: no active SLA");
        slaContracts[_partnerHash].totalDeliveries++;
    }

    /**
     * @notice Get the breach rate for a partner (breaches per 100 deliveries).
     */
    function getBreachRate(bytes32 _partnerHash) external view returns (uint256) {
        SLAContract memory sla = slaContracts[_partnerHash];
        if (sla.totalDeliveries == 0) return 0;
        return (sla.breachCount * 100) / sla.totalDeliveries;
    }

    /**
     * @notice Get total breach count.
     */
    function getBreachCount() external view returns (uint256) {
        return breachIds.length;
    }

    /**
     * @notice Deactivate an SLA contract.
     */
    function deactivateSLA(bytes32 _partnerHash) external onlyAdmin {
        slaContracts[_partnerHash].active = false;
    }

    /**
     * @notice Transfer admin role.
     */
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "PartnerSLA: zero address");
        admin = _newAdmin;
    }
}
