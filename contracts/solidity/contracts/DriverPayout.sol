// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title DriverPayout
 * @author Lastmile Gig (Pty) Ltd
 * @notice Escrow-based automated payout to driver wallets upon delivery confirmation.
 * @dev Funds are held in escrow for a configurable hold period (default 10 minutes)
 *      after delivery confirmation before release to the driver wallet.
 *
 * @custom:security-contact security@aagais.co.za
 * @custom:see docs/specs/06_BLOCKCHAIN_LAYER.md - Section 2.2
 */
contract DriverPayout is AccessControl, ReentrancyGuard, Pausable {
    // --- Roles ---
    bytes32 public constant PAYMENT_SERVICE_ROLE = keccak256("PAYMENT_SERVICE_ROLE");
    bytes32 public constant RELEASE_ROLE = keccak256("RELEASE_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant REFUND_ROLE = keccak256("REFUND_ROLE");

    // --- Constants ---
    uint256 public constant MIN_HOLD_PERIOD = 5 minutes;
    uint256 public constant MAX_HOLD_PERIOD = 24 hours;
    uint256 public constant MAX_ESCROW_AMOUNT = 100000 ether;

    // --- Data Structures ---
    enum EscrowStatus {
        CREATED,
        RELEASED,
        REFUNDED,
        EXPIRED
    }

    struct PayoutEscrow {
        address driverWallet;
        uint256 amount;
        bytes32 orderId;
        EscrowStatus status;
        uint256 createdAt;
        uint256 releaseAfter;
        uint256 completedAt;
    }

    // --- State ---
    mapping(bytes32 => PayoutEscrow) private _escrows;
    mapping(bytes32 => bool) private _escrowExists;
    mapping(address => uint256) private _driverTotalEarnings;
    uint256 private _holdPeriod;
    uint256 private _totalEscrowsCreated;
    uint256 private _totalPayoutsReleased;
    uint256 private _totalAmountReleased;
    uint256 private _totalAmountRefunded;

    // --- Events ---
    event EscrowCreated(
        bytes32 indexed orderId,
        address indexed driverWallet,
        uint256 amount,
        uint256 releaseAfter
    );

    event PayoutReleased(
        bytes32 indexed orderId,
        address indexed driverWallet,
        uint256 amount,
        uint256 timestamp
    );

    event PayoutRefunded(
        bytes32 indexed orderId,
        address indexed driverWallet,
        uint256 amount,
        string reason
    );

    event HoldPeriodUpdated(uint256 oldPeriod, uint256 newPeriod);

    // --- Errors ---
    error EscrowAlreadyExists(bytes32 orderId);
    error EscrowNotFound(bytes32 orderId);
    error EscrowAlreadyCompleted(bytes32 orderId, EscrowStatus status);
    error HoldPeriodActive(bytes32 orderId, uint256 releaseAfter);
    error AmountMismatch(uint256 sent, uint256 expected);
    error InvalidDriverWallet();
    error InvalidAmount();
    error InvalidHoldPeriod(uint256 period);
    error TransferFailed(address to, uint256 amount);

    // --- Constructor ---
    constructor(address admin, uint256 initialHoldPeriod) {
        if (initialHoldPeriod < MIN_HOLD_PERIOD || initialHoldPeriod > MAX_HOLD_PERIOD) {
            revert InvalidHoldPeriod(initialHoldPeriod);
        }

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAYMENT_SERVICE_ROLE, admin);
        _grantRole(RELEASE_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(REFUND_ROLE, admin);

        _holdPeriod = initialHoldPeriod;
    }

    // --- Core Functions ---

    /**
     * @notice Create an escrow holding funds for a driver payout.
     * @param _orderId The order this payout is for
     * @param _driverWallet The driver wallet address to pay
     * @param _amount The payout amount (must match msg.value)
     */
    function createEscrow(
        bytes32 _orderId,
        address _driverWallet,
        uint256 _amount
    ) external payable onlyRole(PAYMENT_SERVICE_ROLE) whenNotPaused nonReentrant {
        if (_driverWallet == address(0)) revert InvalidDriverWallet();
        if (_amount == 0 || _amount > MAX_ESCROW_AMOUNT) revert InvalidAmount();
        if (msg.value != _amount) revert AmountMismatch(msg.value, _amount);
        if (_escrowExists[_orderId]) revert EscrowAlreadyExists(_orderId);

        uint256 releaseTime = block.timestamp + _holdPeriod;

        _escrows[_orderId] = PayoutEscrow({
            driverWallet: _driverWallet,
            amount: _amount,
            orderId: _orderId,
            status: EscrowStatus.CREATED,
            createdAt: block.timestamp,
            releaseAfter: releaseTime,
            completedAt: 0
        });

        _escrowExists[_orderId] = true;
        _totalEscrowsCreated++;

        emit EscrowCreated(_orderId, _driverWallet, _amount, releaseTime);
    }

    /**
     * @notice Release escrowed funds to the driver wallet after hold period.
     * @param _orderId The order whose payout to release
     */
    function releasePayout(
        bytes32 _orderId
    ) external onlyRole(RELEASE_ROLE) whenNotPaused nonReentrant {
        if (!_escrowExists[_orderId]) revert EscrowNotFound(_orderId);

        PayoutEscrow storage escrow = _escrows[_orderId];
        if (escrow.status != EscrowStatus.CREATED) {
            revert EscrowAlreadyCompleted(_orderId, escrow.status);
        }
        if (block.timestamp < escrow.releaseAfter) {
            revert HoldPeriodActive(_orderId, escrow.releaseAfter);
        }

        escrow.status = EscrowStatus.RELEASED;
        escrow.completedAt = block.timestamp;

        _totalPayoutsReleased++;
        _totalAmountReleased += escrow.amount;
        _driverTotalEarnings[escrow.driverWallet] += escrow.amount;

        (bool sent, ) = payable(escrow.driverWallet).call{value: escrow.amount}("");
        if (!sent) revert TransferFailed(escrow.driverWallet, escrow.amount);

        emit PayoutReleased(_orderId, escrow.driverWallet, escrow.amount, block.timestamp);
    }

    /**
     * @notice Refund escrowed funds (e.g., delivery dispute, cancellation).
     * @param _orderId The order whose escrow to refund
     * @param _reason Reason for the refund
     */
    function refundEscrow(
        bytes32 _orderId,
        string calldata _reason
    ) external onlyRole(REFUND_ROLE) whenNotPaused nonReentrant {
        if (!_escrowExists[_orderId]) revert EscrowNotFound(_orderId);

        PayoutEscrow storage escrow = _escrows[_orderId];
        if (escrow.status != EscrowStatus.CREATED) {
            revert EscrowAlreadyCompleted(_orderId, escrow.status);
        }

        escrow.status = EscrowStatus.REFUNDED;
        escrow.completedAt = block.timestamp;
        _totalAmountRefunded += escrow.amount;

        (bool sent, ) = payable(msg.sender).call{value: escrow.amount}("");
        if (!sent) revert TransferFailed(msg.sender, escrow.amount);

        emit PayoutRefunded(_orderId, escrow.driverWallet, escrow.amount, _reason);
    }

    // --- View Functions ---

    /**
     * @notice Get escrow details for an order.
     * @param _orderId The order to look up
     * @return escrow The escrow details
     */
    function getEscrow(
        bytes32 _orderId
    ) external view returns (PayoutEscrow memory escrow) {
        if (!_escrowExists[_orderId]) revert EscrowNotFound(_orderId);
        return _escrows[_orderId];
    }

    /**
     * @notice Get total lifetime earnings for a driver wallet.
     * @param _driverWallet The driver wallet address
     * @return earnings Total earnings in wei
     */
    function getDriverEarnings(
        address _driverWallet
    ) external view returns (uint256 earnings) {
        return _driverTotalEarnings[_driverWallet];
    }

    /**
     * @notice Get platform-wide payout statistics.
     */
    function getStats()
        external
        view
        returns (
            uint256 totalCreated,
            uint256 totalReleased,
            uint256 amountReleased,
            uint256 amountRefunded,
            uint256 currentHoldPeriod
        )
    {
        return (
            _totalEscrowsCreated,
            _totalPayoutsReleased,
            _totalAmountReleased,
            _totalAmountRefunded,
            _holdPeriod
        );
    }

    /**
     * @notice Check whether an escrow exists for the given order.
     */
    function escrowExists(bytes32 _orderId) external view returns (bool) {
        return _escrowExists[_orderId];
    }

    /**
     * @notice Get the current hold period.
     */
    function getHoldPeriod() external view returns (uint256) {
        return _holdPeriod;
    }

    // --- Admin Functions ---

    /**
     * @notice Update the escrow hold period.
     * @param _newPeriod New hold period in seconds
     */
    function setHoldPeriod(
        uint256 _newPeriod
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_newPeriod < MIN_HOLD_PERIOD || _newPeriod > MAX_HOLD_PERIOD) {
            revert InvalidHoldPeriod(_newPeriod);
        }
        uint256 oldPeriod = _holdPeriod;
        _holdPeriod = _newPeriod;
        emit HoldPeriodUpdated(oldPeriod, _newPeriod);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @notice Accept ETH deposits for escrow funding.
     */
    receive() external payable {}
}
