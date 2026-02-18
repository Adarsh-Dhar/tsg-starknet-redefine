import { Router } from 'express';
import { ElectrumNetworkProvider, Contract, TransactionBuilder, SignatureTemplate } from 'cashscript';
import { backendPrivateKey, serverPubKeyHex } from '../../backendWallet.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();
// Load Contract Artifact
const artifactPath = path.resolve(__dirname, '../../../../contract/Delegation.json');
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
// Network Setup
const provider = new ElectrumNetworkProvider('chipnet');
router.post('/ai-slash', async (req, res) => {
    const { userPublicKey } = req.body;
    try {
        const contract = new Contract(artifact, [userPublicKey, serverPubKeyHex], { provider });
        const utxos = await contract.getUtxos();
        const balance = await contract.getBalance();
        const penaltyAmount = 5000n;
        const feeBuffer = 1000n;
        const requiredAmount = penaltyAmount + feeBuffer;
        if (!utxos || utxos.length === 0 || balance < requiredAmount) {
            return res.status(400).json({
                success: false,
                error: `Insufficient funds in vault for this public key. Vault address: ${contract.address}. Current balance: ${balance} sats. Required: ${requiredAmount} sats.`
            });
        }
        // Initialize the TransactionBuilder as per your docs
        const builder = new TransactionBuilder({ provider });
        // 1. Add the Input (UTXO + the Backend's Unlocker)
        builder.addInput(utxos[0], contract.unlock.executePenalty(new SignatureTemplate(backendPrivateKey)));
        // 2. Add the Output (Slashing funds)
        const changeAmount = utxos[0].satoshis - requiredAmount;
        builder.addOutput({
            to: contract.address,
            amount: changeAmount
        });
        // 3. Send the transaction
        const txDetails = await builder.send();
        res.json({
            success: true,
            txid: txDetails.txid,
            action_type: "BCH_SLASH_EXECUTION"
        });
    }
    catch (err) {
        console.error('[ai-slash] Execution Error:', err);
        console.dir(err, { depth: null });
        console.error('Type of error:', typeof err);
        const errorMessage = err?.message || JSON.stringify(err) || "An unknown error occurred";
        res.status(500).json({ success: false, error: errorMessage });
    }
});
export default router;
