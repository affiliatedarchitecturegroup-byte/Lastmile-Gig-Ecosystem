// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DriverPayout
 * @notice Escrow-based driver payout contract for Lastmile Gig.
 * @dev Holds funds in escrow until delivery is confirmed, then releases
 *      the driver's share (after commission deduction).
 *
 * @custom:see docs/specs/06_BLOCKCHAIN_LAYER.md
 * @custom:network Polygon CDK L2
 */
contract DriverPayout {
    enum PayoutStatus {
        ESCROWED,
        RELEASED,
        REFUNDED,
        DISPUTED
    }

    struct Payout {
        bytes32 orderHash;
        bytes32 driverHash;
        uint256 totalAmount;
        uint256 commissionAmount;
        uint256 driverAmount;
        PayoutStatus status;
        uint256 escrowedAt;
        uint256 releasedAt;
    }

    /// @notice Mapping from order hash to payout record
    mapping(bytes32 => Payout) public payouts;

    /// @notice Platform admin address
    address public admin;

    /// @notice Platform treasury address for commission collection
    address public treasury;

    /// @notice Commission rate in basis points (1500 = 15%)
    uint256 public commissionBps = 1500;

    /// @notice Emitted when funds are escrowed for a delivery
    event FundsEscrowed(bytes32 indexed orderHash, uint256 totalAmount, uint256 driverAmount);

    /// @notice Emitted when driver payout is released
    event PayoutReleased(bytes32 indexed orderHash, bytes32 indexed driverHash, uint256 amount);

    /// @notice Emitted when escrowed funds are refunded
    event PayoutRefunded(bytes32 indexed orderHash, uint256 amount);

    modifier onlyAdmin() {
        require(msg.sender == admin, "DriverPayout: caller is not admin");
        _;
    }

    constructor(address _treasury) {
        admin = msg.sender;
        treasury = _treasury;
    }

    /**
     * @notice Escrow funds for a delivery order.
     * @param _orderHash Keccak256 hash of the order UUID
     * @param _driverHash Keccak256 hash of the driver UUID
     */
    function escrowFunds(bytes32 _orderHash, bytes32 _driverHash) external payable onlyAdmin {
        require(msg.value > 0, "DriverPayout: zero value");
        require(payouts[_orderHash].escrowedAt == 0, "DriverPayout: already escrowed");

        uint256 commission = (msg.value * commissionBps) / 10000;
        uint256 driverAmount = msg.value - commission;

        payouts[_orderHash] = Payout({
            orderHash: _orderHash,
            driverHash: _driverHash,
            totalAmount: msg.value,
            commissionAmount: commission,
            driverAmount: driverAmount,
            status: PayoutStatus.ESCROWED,
            escrowedAt: block.timestamp,
            releasedAt: 0
        });

        emit FundsEscrowed(_orderHash, msg.value, driverAmount);
    }

    /**
     * @notice Release escrowed funds to the driver after delivery confirmation.
     * @param _orderHash Keccak256 hash of the order UUID
     * @param _driverAddress Wallet address of the driver
     */
    function releasePayout(bytes32 _orderHash, address payable _driverAddress) external onlyAdmin {
        Payout storage payout = payouts[_orderHash];
        require(payout.escrowedAt > 0, "DriverPayout: not escrowed");
        require(payout.status == PayoutStatus.ESCROWED, "DriverPayout: not in escrow");

        payout.status = PayoutStatus.RELEASED;
        payout.releasedAt = block.timestamp;

        // Transfer commission to treasury
        (bool treasurySuccess, ) = treasury.call{value: payout.commissionAmount}("");
        require(treasurySuccess, "DriverPayout: treasury transfer failed");

        // Transfer driver share
        (bool driverSuccess, ) = _driverAddress.call{value: payout.driverAmount}("");
        require(driverSuccess, "DriverPayout: driver transfer failed");

        emit PayoutReleased(_orderHash, payout.driverHash, payout.driverAmount);
    }

    /**
     * @notice Refund escrowed funds (order cancelled).
     * @param _orderHash Keccak256 hash of the order UUID
     * @param _refundAddress Address to receive the refund
     */
    function refundEscrow(bytes32 _orderHash, address payable _refundAddress) external onlyAdmin {
        Payout storage payout = payouts[_orderHash];
        require(payout.status == PayoutStatus.ESCROWED, "DriverPayout: not in escrow");

        payout.status = PayoutStatus.REFUNDED;

        (bool success, ) = _refundAddress.call{value: payout.totalAmount}("");
        require(success, "DriverPayout: refund transfer failed");

        emit PayoutRefunded(_orderHash, payout.totalAmount);
    }

    /**
     * @notice Update the commission rate (in basis points).
     */
    function setCommissionBps(uint256 _newBps) external onlyAdmin {
        require(_newBps <= 5000, "DriverPayout: commission too high");
        commissionBps = _newBps;
    }

    /**
     * @notice Transfer admin role.
     */
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "DriverPayout: zero address");
        admin = _newAdmin;
    }
}
