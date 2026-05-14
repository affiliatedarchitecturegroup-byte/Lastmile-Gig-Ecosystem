// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DriverPayout
 * @author Lastmile Gig (Pty) Ltd
 * @notice Escrow contract for driver payout management with commission splits
 * @dev Records payout commitments on-chain for transparency and audit
 * @custom:phase P223 - Smart Contract DriverPayout.sol
 *
 * This contract does NOT hold actual funds (those flow via Ozow/Paystack).
 * It records payout commitments and commission splits on-chain as an
 * immutable audit trail for DFI compliance and driver transparency.
 */
contract DriverPayout {
    /// @notice Emitted when a payout is committed on-chain
    event PayoutCommitted(
        bytes32 indexed payoutHash,
        bytes32 indexed orderHash,
        bytes32 indexed driverHash,
        uint256 totalAmount,
        uint256 driverAmount,
        uint256 platformFee,
        uint256 timestamp
    );

    /// @notice Emitted when a payout is confirmed as settled off-chain
    event PayoutSettled(
        bytes32 indexed payoutHash,
        bytes32 settlementRef,
        uint256 timestamp
    );

    /// @notice Payout status
    enum PayoutStatus {
        Committed,   // Payout recorded on-chain, pending off-chain settlement
        Settled,     // Off-chain settlement confirmed (Ozow EFT completed)
        Failed,      // Off-chain settlement failed
        Disputed     // Under dispute
    }

    /// @notice Payout record
    struct PayoutRecord {
        bytes32 orderHash;
        bytes32 driverHash;
        bytes32 partnerHash;
        uint256 totalAmount;      // Total order amount in cents (ZAR)
        uint256 driverAmount;     // Driver payout in cents
        uint256 platformFee;      // Platform fee in cents
        uint256 partnerAmount;    // Partner share in cents
        uint256 committedAt;
        uint256 settledAt;
        bytes32 settlementRef;    // Off-chain settlement reference hash
        PayoutStatus status;
        address committer;
    }

    /// @notice Platform admin
    address public immutable admin;

    /// @notice Authorized committers
    mapping(address => bool) public authorizedCommitters;

    /// @notice Payout records
    mapping(bytes32 => PayoutRecord) public payouts;

    /// @notice Total payouts committed
    uint256 public totalPayouts;

    /// @notice Total amount committed (in cents)
    uint256 public totalAmountCommitted;

    modifier onlyAdmin() {
        require(msg.sender == admin, "DriverPayout: not admin");
        _;
    }

    modifier onlyCommitter() {
        require(
            authorizedCommitters[msg.sender] || msg.sender == admin,
            "DriverPayout: not authorized"
        );
        _;
    }

    constructor(address _admin) {
        require(_admin != address(0), "DriverPayout: zero admin");
        admin = _admin;
        authorizedCommitters[_admin] = true;
    }

    function setCommitter(address committer, bool authorized) external onlyAdmin {
        authorizedCommitters[committer] = authorized;
    }

    /**
     * @notice Commit a payout record on-chain
     * @param payoutHash Unique payout identifier hash
     * @param orderHash Hash of the order ID
     * @param driverHash Hash of the driver ID
     * @param partnerHash Hash of the partner ID
     * @param totalAmount Total order amount in ZAR cents
     * @param driverAmount Driver payout amount in ZAR cents
     * @param platformFee Platform fee in ZAR cents
     * @param partnerAmount Partner share in ZAR cents
     */
    function commitPayout(
        bytes32 payoutHash,
        bytes32 orderHash,
        bytes32 driverHash,
        bytes32 partnerHash,
        uint256 totalAmount,
        uint256 driverAmount,
        uint256 platformFee,
        uint256 partnerAmount
    ) external onlyCommitter {
        require(payouts[payoutHash].committedAt == 0, "DriverPayout: already committed");
        require(
            driverAmount + platformFee + partnerAmount == totalAmount,
            "DriverPayout: amounts do not sum to total"
        );

        payouts[payoutHash] = PayoutRecord({
            orderHash: orderHash,
            driverHash: driverHash,
            partnerHash: partnerHash,
            totalAmount: totalAmount,
            driverAmount: driverAmount,
            platformFee: platformFee,
            partnerAmount: partnerAmount,
            committedAt: block.timestamp,
            settledAt: 0,
            settlementRef: bytes32(0),
            status: PayoutStatus.Committed,
            committer: msg.sender
        });

        totalPayouts++;
        totalAmountCommitted += totalAmount;

        emit PayoutCommitted(
            payoutHash, orderHash, driverHash,
            totalAmount, driverAmount, platformFee,
            block.timestamp
        );
    }

    /**
     * @notice Confirm off-chain settlement of a payout
     * @param payoutHash Hash of the payout
     * @param settlementRef Hash of the off-chain settlement reference
     */
    function confirmSettlement(
        bytes32 payoutHash,
        bytes32 settlementRef
    ) external onlyCommitter {
        PayoutRecord storage record = payouts[payoutHash];
        require(record.committedAt != 0, "DriverPayout: not found");
        require(record.status == PayoutStatus.Committed, "DriverPayout: not in Committed status");

        record.status = PayoutStatus.Settled;
        record.settledAt = block.timestamp;
        record.settlementRef = settlementRef;

        emit PayoutSettled(payoutHash, settlementRef, block.timestamp);
    }

    function getPayout(bytes32 payoutHash) external view returns (PayoutRecord memory) {
        require(payouts[payoutHash].committedAt != 0, "DriverPayout: not found");
        return payouts[payoutHash];
    }
}
