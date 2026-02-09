// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/USDC.sol";

contract USDCTest is Test {
    USDC public usdc;
    address public owner;
    address public user1;
    address public user2;

    uint256 constant INITIAL_SUPPLY = 1_000_000;

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        usdc = new USDC(INITIAL_SUPPLY);
    }

    function testInitialSetup() public {
        assertEq(usdc.name(), "USD Coin");
        assertEq(usdc.symbol(), "USDC");
        assertEq(usdc.decimals(), 6);
        assertEq(usdc.totalSupply(), INITIAL_SUPPLY * 10 ** 6);
        assertEq(usdc.balanceOf(owner), INITIAL_SUPPLY * 10 ** 6);
    }

    function testTransfer() public {
        uint256 transferAmount = 1000 * 10 ** 6; // 1000 USDC

        usdc.transfer(user1, transferAmount);

        assertEq(usdc.balanceOf(user1), transferAmount);
        assertEq(usdc.balanceOf(owner), (INITIAL_SUPPLY * 10 ** 6) - transferAmount);
    }

    function testTransferFrom() public {
        uint256 approvalAmount = 5000 * 10 ** 6; // 5000 USDC
        uint256 transferAmount = 1000 * 10 ** 6; // 1000 USDC

        usdc.approve(user1, approvalAmount);

        vm.prank(user1);
        usdc.transferFrom(owner, user2, transferAmount);

        assertEq(usdc.balanceOf(user2), transferAmount);
        assertEq(usdc.allowance(owner, user1), approvalAmount - transferAmount);
    }

    function testMintOnlyOwner() public {
        uint256 mintAmount = 1000; // 1000 USDC (will be multiplied by 10^6 in contract)

        usdc.mint(user1, mintAmount);

        assertEq(usdc.balanceOf(user1), mintAmount * 10 ** 6);
        assertEq(usdc.totalSupply(), (INITIAL_SUPPLY + mintAmount) * 10 ** 6);
    }

    function testMintFailsForNonOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        usdc.mint(user2, 1000);
    }

    function testBurn() public {
        uint256 burnAmount = 1000 * 10 ** 6; // 1000 USDC

        usdc.burn(burnAmount);

        assertEq(usdc.totalSupply(), (INITIAL_SUPPLY * 10 ** 6) - burnAmount);
        assertEq(usdc.balanceOf(owner), (INITIAL_SUPPLY * 10 ** 6) - burnAmount);
    }

    function testBurnFrom() public {
        uint256 approvalAmount = 5000 * 10 ** 6; // 5000 USDC
        uint256 burnAmount = 1000 * 10 ** 6; // 1000 USDC

        usdc.transfer(user1, approvalAmount);

        vm.prank(user1);
        usdc.approve(owner, approvalAmount);

        usdc.burnFrom(user1, burnAmount);

        assertEq(usdc.balanceOf(user1), approvalAmount - burnAmount);
        assertEq(usdc.totalSupply(), (INITIAL_SUPPLY * 10 ** 6) - burnAmount);
    }

    function testFailTransferInsufficientBalance() public {
        uint256 transferAmount = (INITIAL_SUPPLY + 1) * 10 ** 6;
        usdc.transfer(user1, transferAmount);
    }

    function testOwnership() public {
        assertEq(usdc.owner(), owner);
    }

    function testTransferOwnership() public {
        usdc.transferOwnership(user1);
        assertEq(usdc.owner(), user1);
    }
}
