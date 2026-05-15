// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDriverPayout
 * @notice Interface for the DriverPayout contract.
 * @dev Used by the payment service and other integrations.
 */
interface IDriverPayout {
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

    function createEscrow(
        bytes32 _orderId,
        address _driverWallet,
        uint256 _amount
    ) external payable;

    function releasePayout(bytes32 _orderId) external;

    function refundEscrow(bytes32 _orderId, string calldata _reason) external;

    function getEscrow(bytes32 _orderId) external view returns (PayoutEscrow memory escrow);

    function getDriverEarnings(address _driverWallet) external view returns (uint256 earnings);

    function escrowExists(bytes32 _orderId) external view returns (bool);

    function getHoldPeriod() external view returns (uint256);

    function getStats()
        external
        view
        returns (
            uint256 totalCreated,
            uint256 totalReleased,
            uint256 amountReleased,
            uint256 amountRefunded,
            uint256 currentHoldPeriod
        );
}
