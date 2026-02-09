// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";

/**
 * @title USDC Token
 * @dev Implementation of the USDC ERC20 Token for BNB Chain
 */
contract USDC is ERC20, ERC20Burnable, Ownable {
    uint8 private _decimals;

    /**
     * @dev Constructor that gives msg.sender all of existing tokens.
     * @param initialSupply Initial supply of tokens (in whole units, will be multiplied by 10^decimals)
     */
    constructor(uint256 initialSupply) ERC20("USD Coin", "USDC") Ownable(msg.sender) {
        _decimals = 6; // USDC uses 6 decimals
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Function to mint new tokens
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint (in whole units)
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount * 10 ** decimals());
    }
}
