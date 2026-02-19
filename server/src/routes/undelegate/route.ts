import { Router } from "express";
import { provider, VAULT_CONTRACT_ADDRESS } from "../../starknet";
import { Contract } from "starknet";
import { redis } from "../../redisClient";

const router = Router();
// We will need the Vault ABI to read balances. You can compile the contract and grab the ABI later.
import VaultABI from "../../../contract/Vault.json"; 

router.post("/", async (req, res) => {
    const { userAddress } = req.body;

    try {
        const vaultContract = new Contract(VaultABI, VAULT_CONTRACT_ADDRESS, provider);
        const balance = await vaultContract.get_balance(userAddress);

        if (balance > 0n) {
            // User has deposited! Start monitoring doomscrolling
            await redis.set(`tracking:${userAddress}`, 'active');
            res.json({ success: true, message: "Delegation confirmed, tracking started." });
        } else {
            res.status(400).json({ error: "No funds deposited on-chain." });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to verify delegation." });
    }
});

export default router;