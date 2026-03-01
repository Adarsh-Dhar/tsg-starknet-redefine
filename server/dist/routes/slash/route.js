import { Router } from "express";
import { serverAccount, VAULT_CONTRACT_ADDRESS } from "../../starknet.js";
import { uint256 } from "starknet";
const router = Router();
router.post("/", async (req, res) => {
    // Accepting penalty amount from the ingestion trigger
    const { userAddress, amount = 0.01 } = req.body;
    try {
        // Convert STRK amount to Uint256 for Starknet (assuming 18 decimals)
        const amountWei = BigInt(Math.floor(amount * 10 ** 18));
        const uint256Amount = uint256.bnToUint256(amountWei);
        // Execute the slash function with the specific penalty amount
        const executeResponse = await serverAccount.execute({
            contractAddress: VAULT_CONTRACT_ADDRESS,
            entrypoint: "slash",
            calldata: [
                userAddress,
                uint256Amount.low,
                uint256Amount.high
            ]
        });
        await serverAccount.waitForTransaction(executeResponse.transaction_hash);
        res.json({
            success: true,
            txHash: executeResponse.transaction_hash,
            deducted: amount
        });
    }
    catch (error) {
        console.error("Penalty Execution Error:", error);
        res.status(500).json({ error: "Failed to execute penalty on-chain." });
    }
});
export default router;
