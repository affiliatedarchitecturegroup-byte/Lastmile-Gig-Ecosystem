// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockToken
 * @notice Mock ERC20 token for testing escrow and payment flows.
 * @dev Not for production use. Used exclusively in Hardhat test environment.
 */
contract MockToken is ERC20 {
    uint8 private _decimals;

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply
    ) ERC20(name_, symbol_) {
        _decimals = decimals_;
        _mint(msg.sender, initialSupply);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}

/**
 * @title RejectEther
 * @notice Contract that rejects ETH transfers. Used to test transfer failure paths.
 */
contract RejectEther {
    receive() external payable {
        revert("RejectEther: transfer rejected");
    }

    fallback() external payable {
        revert("RejectEther: fallback rejected");
    }
}
