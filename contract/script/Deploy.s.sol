// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/USDC.sol";

/**
 * @title Deploy Script for USDC Token
 * @dev Deploys USDC token to BNB Chain
 * 
 * To deploy:
 * forge script script/Deploy.s.sol:DeployUSDC --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast --verify
 * 
 * Or use the deployment commands below
 */
contract DeployUSDC is Script {
    function run() external {
        // Load environment variables
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Initial supply (1 million USDC)
        uint256 initialSupply = 1_000_000;

        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // Deploy USDC contract
        USDC usdc = new USDC(initialSupply);

        console.log("USDC deployed to:", address(usdc));
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
        console.log("Initial supply:", initialSupply, "USDC");
        console.log("Total supply (with decimals):", usdc.totalSupply());

        // Stop broadcasting
        vm.stopBroadcast();
    }
}
