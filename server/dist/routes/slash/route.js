import { Router } from "express";
import { serverAccount, VAULT_CONTRACT_ADDRESS } from "../../starknet.js";
const router = Router();
router.post("/", async (req, res) => {
    const { userAddress } = req.body;
    try {
        // Execute the slash function on the Starknet contract!
        const executeResponse = await serverAccount.execute({
            contractAddress: VAULT_CONTRACT_ADDRESS,
            entrypoint: "slash",
            calldata: [userAddress]
        });
        // Wait for transaction to be accepted
        await serverAccount.waitForTransaction(executeResponse.transaction_hash);
        // Tracking removal stubbed (no Redis)
        // TODO: Remove tracking in persistent store if needed
        res.json({
            success: true,
            txHash: executeResponse.transaction_hash
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to execute penalty on-chain." });
    }
});
export default router;
