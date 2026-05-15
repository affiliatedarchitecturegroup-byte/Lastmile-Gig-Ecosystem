// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PartnerSLA
 * @author Lastmile Gig (Pty) Ltd
 * @notice SLA enforcement between Lastmile Gig and corporate fleet partners.
 * @dev Encodes SLA terms, tracks breaches and successes, automates weekly
 *      penalty deductions and performance bonuses.
 *
 * @custom:security-contact security@aagais.co.za
 * @custom:see docs/specs/06_BLOCKCHAIN_LAYER.md - Section 2.3
 */
contract PartnerSLA is AccessControl, ReentrancyGuard, Pausable {
    // --- Roles ---
    bytes32 public constant SLA_MANAGER_ROLE = keccak256("SLA_MANAGER_ROLE");
    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER_ROLE");
    bytes32 public constant SETTLEMENT_ROLE = keccak256("SETTLEMENT_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // --- Constants ---
    uint256 public constant MAX_TARGET_MINUTES = 480;
    uint256 public constant SETTLEMENT_PERIOD = 7 days;

    // --- Data Structures ---
    enum ContractStatus {
        ACTIVE,
        SUSPENDED,
        TERMINATED
    }

    struct SLAContract {
        bytes32 contractId;
        address partnerAddress;
        uint256 deliveryTargetMinutes;
        uint256 penaltyPerBreachWei;
        uint256 bonusPerPerfectWeek;
        ContractStatus status;
        uint256 createdAt;
        uint256 lastSettlementAt;
    }

    struct WeeklyMetrics {
        uint256 totalDeliveries;
        uint256 breaches;
        uint256 successes;
        uint256 avgDeliveryMinutes;
        bool settled;
    }

    // --- State ---
    mapping(bytes32 => SLAContract) private _contracts;
    mapping(bytes32 => bool) private _contractExists;
    mapping(bytes32 => mapping(uint256 => WeeklyMetrics)) private _weeklyMetrics;
    mapping(bytes32 => uint256) private _totalBreaches;
    mapping(bytes32 => uint256) private _totalSuccesses;
    mapping(bytes32 => uint256) private _totalPenalties;
    mapping(bytes32 => uint256) private _totalBonuses;
    uint256 private _activeContracts;

    // --- Events ---
    event SLAContractCreated(
        bytes32 indexed contractId,
        address indexed partner,
        uint256 targetMinutes,
        uint256 penaltyWei,
        uint256 bonusWei
    );

    event SLAContractStatusChanged(
        bytes32 indexed contractId,
        ContractStatus oldStatus,
        ContractStatus newStatus
    );

    event SLABreachRecorded(
        bytes32 indexed contractId,
        bytes32 indexed orderId,
        uint256 actualMinutes,
        uint256 targetMinutes,
        uint256 week
    );

    event SLASuccessRecorded(
        bytes32 indexed contractId,
        bytes32 indexed orderId,
        uint256 actualMinutes,
        uint256 week
    );

    event WeeklySettlementExecuted(
        bytes32 indexed contractId,
        uint256 indexed week,
        uint256 breaches,
        uint256 penaltyTotal,
        uint256 bonusAwarded,
        int256 netSettlement
    );

    // --- Errors ---
    error ContractAlreadyExists(bytes32 contractId);
    error ContractNotFound(bytes32 contractId);
    error ContractNotActive(bytes32 contractId);
    error InvalidPartnerAddress();
    error InvalidTargetMinutes(uint256 minutes_);
    error InvalidPenaltyAmount();
    error WeekAlreadySettled(bytes32 contractId, uint256 week);
    error SettlementTooEarly(bytes32 contractId, uint256 nextSettlement);

    // --- Constructor ---
    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SLA_MANAGER_ROLE, admin);
        _grantRole(RECORDER_ROLE, admin);
        _grantRole(SETTLEMENT_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    // --- Core Functions ---

    /**
     * @notice Create a new SLA contract with a partner.
     * @param _contractId Unique contract identifier
     * @param _partnerAddress Partner wallet address
     * @param _targetMinutes Delivery time target in minutes (e.g., 45 for Checkers 60/60)
     * @param _penaltyPerBreach Penalty per SLA breach in wei
     * @param _bonusPerPerfectWeek Bonus for 100% weekly SLA compliance in wei
     */
    function createContract(
        bytes32 _contractId,
        address _partnerAddress,
        uint256 _targetMinutes,
        uint256 _penaltyPerBreach,
        uint256 _bonusPerPerfectWeek
    ) external onlyRole(SLA_MANAGER_ROLE) whenNotPaused {
        if (_contractExists[_contractId]) revert ContractAlreadyExists(_contractId);
        if (_partnerAddress == address(0)) revert InvalidPartnerAddress();
        if (_targetMinutes == 0 || _targetMinutes > MAX_TARGET_MINUTES) {
            revert InvalidTargetMinutes(_targetMinutes);
        }

        _contracts[_contractId] = SLAContract({
            contractId: _contractId,
            partnerAddress: _partnerAddress,
            deliveryTargetMinutes: _targetMinutes,
            penaltyPerBreachWei: _penaltyPerBreach,
            bonusPerPerfectWeek: _bonusPerPerfectWeek,
            status: ContractStatus.ACTIVE,
            createdAt: block.timestamp,
            lastSettlementAt: block.timestamp
        });

        _contractExists[_contractId] = true;
        _activeContracts++;

        emit SLAContractCreated(
            _contractId,
            _partnerAddress,
            _targetMinutes,
            _penaltyPerBreach,
            _bonusPerPerfectWeek
        );
    }

    /**
     * @notice Record an SLA breach for a specific delivery.
     * @param _contractId The SLA contract
     * @param _orderId The order that breached SLA
     * @param _actualMinutes Actual delivery time in minutes
     */
    function recordSLABreach(
        bytes32 _contractId,
        bytes32 _orderId,
        uint256 _actualMinutes
    ) external onlyRole(RECORDER_ROLE) whenNotPaused {
        if (!_contractExists[_contractId]) revert ContractNotFound(_contractId);
        SLAContract storage sla = _contracts[_contractId];
        if (sla.status != ContractStatus.ACTIVE) revert ContractNotActive(_contractId);

        uint256 currentWeek = _getCurrentWeek();
        WeeklyMetrics storage metrics = _weeklyMetrics[_contractId][currentWeek];

        metrics.totalDeliveries++;
        metrics.breaches++;
        metrics.avgDeliveryMinutes = _updateAverage(
            metrics.avgDeliveryMinutes,
            _actualMinutes,
            metrics.totalDeliveries
        );

        _totalBreaches[_contractId]++;

        emit SLABreachRecorded(
            _contractId,
            _orderId,
            _actualMinutes,
            sla.deliveryTargetMinutes,
            currentWeek
        );
    }

    /**
     * @notice Record a successful on-time delivery.
     * @param _contractId The SLA contract
     * @param _orderId The order that met SLA
     * @param _actualMinutes Actual delivery time in minutes
     */
    function recordSLASuccess(
        bytes32 _contractId,
        bytes32 _orderId,
        uint256 _actualMinutes
    ) external onlyRole(RECORDER_ROLE) whenNotPaused {
        if (!_contractExists[_contractId]) revert ContractNotFound(_contractId);
        SLAContract storage sla = _contracts[_contractId];
        if (sla.status != ContractStatus.ACTIVE) revert ContractNotActive(_contractId);

        uint256 currentWeek = _getCurrentWeek();
        WeeklyMetrics storage metrics = _weeklyMetrics[_contractId][currentWeek];

        metrics.totalDeliveries++;
        metrics.successes++;
        metrics.avgDeliveryMinutes = _updateAverage(
            metrics.avgDeliveryMinutes,
            _actualMinutes,
            metrics.totalDeliveries
        );

        _totalSuccesses[_contractId]++;

        emit SLASuccessRecorded(_contractId, _orderId, _actualMinutes, currentWeek);
    }

    /**
     * @notice Execute the weekly settlement for an SLA contract.
     * @param _contractId The contract to settle
     * @param _week The ISO week number to settle
     */
    function executeWeeklySettlement(
        bytes32 _contractId,
        uint256 _week
    ) external onlyRole(SETTLEMENT_ROLE) whenNotPaused nonReentrant {
        if (!_contractExists[_contractId]) revert ContractNotFound(_contractId);
        SLAContract storage sla = _contracts[_contractId];

        WeeklyMetrics storage metrics = _weeklyMetrics[_contractId][_week];
        if (metrics.settled) revert WeekAlreadySettled(_contractId, _week);

        uint256 penaltyTotal = metrics.breaches * sla.penaltyPerBreachWei;
        uint256 bonusAwarded = 0;

        if (metrics.breaches == 0 && metrics.totalDeliveries > 0) {
            bonusAwarded = sla.bonusPerPerfectWeek;
        }

        int256 netSettlement = int256(bonusAwarded) - int256(penaltyTotal);

        metrics.settled = true;
        sla.lastSettlementAt = block.timestamp;

        _totalPenalties[_contractId] += penaltyTotal;
        _totalBonuses[_contractId] += bonusAwarded;

        emit WeeklySettlementExecuted(
            _contractId,
            _week,
            metrics.breaches,
            penaltyTotal,
            bonusAwarded,
            netSettlement
        );
    }

    // --- View Functions ---

    function getContract(
        bytes32 _contractId
    ) external view returns (SLAContract memory) {
        if (!_contractExists[_contractId]) revert ContractNotFound(_contractId);
        return _contracts[_contractId];
    }

    function getWeeklyMetrics(
        bytes32 _contractId,
        uint256 _week
    ) external view returns (WeeklyMetrics memory) {
        return _weeklyMetrics[_contractId][_week];
    }

    function getContractStats(
        bytes32 _contractId
    )
        external
        view
        returns (
            uint256 totalBreaches,
            uint256 totalSuccesses,
            uint256 totalPenalties,
            uint256 totalBonuses
        )
    {
        return (
            _totalBreaches[_contractId],
            _totalSuccesses[_contractId],
            _totalPenalties[_contractId],
            _totalBonuses[_contractId]
        );
    }

    function getActiveContractCount() external view returns (uint256) {
        return _activeContracts;
    }

    function contractExists(bytes32 _contractId) external view returns (bool) {
        return _contractExists[_contractId];
    }

    // --- Admin Functions ---

    function updateContractStatus(
        bytes32 _contractId,
        ContractStatus _newStatus
    ) external onlyRole(SLA_MANAGER_ROLE) {
        if (!_contractExists[_contractId]) revert ContractNotFound(_contractId);
        SLAContract storage sla = _contracts[_contractId];

        ContractStatus oldStatus = sla.status;
        sla.status = _newStatus;

        if (oldStatus == ContractStatus.ACTIVE && _newStatus != ContractStatus.ACTIVE) {
            _activeContracts--;
        } else if (oldStatus != ContractStatus.ACTIVE && _newStatus == ContractStatus.ACTIVE) {
            _activeContracts++;
        }

        emit SLAContractStatusChanged(_contractId, oldStatus, _newStatus);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // --- Internal Functions ---

    function _getCurrentWeek() internal view returns (uint256) {
        return block.timestamp / SETTLEMENT_PERIOD;
    }

    function _updateAverage(
        uint256 currentAvg,
        uint256 newValue,
        uint256 count
    ) internal pure returns (uint256) {
        if (count <= 1) return newValue;
        return ((currentAvg * (count - 1)) + newValue) / count;
    }

    receive() external payable {}
}
