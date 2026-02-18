import { Router } from 'express';
import { ElectrumNetworkProvider, Contract, TransactionBuilder, SignatureTemplate } from 'cashscript';
import { backendPrivateKey, serverPubKeyHex } from '../../backendWallet.js';
import { getUserVaultAddress } from '../../lib/vaultLookup.js';
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
// POST /slash - Slash a user's vault
router.post('/ai-slash', async (req, res) => {
    // Accept userPublicKey, sessionTraceId, telemetryData, sessionDuration
    const { userPublicKey } = req.body;
    if (!userPublicKey) {
        return res.status(400).json({ success: false, error: 'Missing userPublicKey' });
    }
    try {
        // 1. Get the vault address for this user
        const vaultAddress = await getUserVaultAddress(userPublicKey);
        if (!vaultAddress) {
            return res.status(404).json({ success: false, error: 'Vault address not found for user' });
        }
        // 2. Initialize contract instance
        const contract = new Contract(artifact, [userPublicKey, serverPubKeyHex], { provider });
        // 3. Get contract UTXOs
        const utxos = await contract.getUtxos();
        if (!utxos.length) {
            return res.status(400).json({ success: false, error: 'No funds in vault' });
        }
        const utxo = utxos[0];
        // 4. Prepare penalty transaction: 5000 sats to treasury, rest back to contract
        // For demo, send penalty to a hardcoded treasury address
        const treasuryAddress = 'bchtest:pdaf42dm2e0yrgz25hcmy75aufckhnk8v98r5qnp0c7g8cmtpjanud0698z34';
        const penaltyAmount = 5000n;
        const changeAmount = BigInt(utxo.satoshis) - penaltyAmount - 500n; // 500 sat fee
        if (changeAmount < 0) {
            return res.status(400).json({ success: false, error: 'Insufficient funds for penalty and fee' });
        }
        // 5. Build transaction
        const txBuilder = new TransactionBuilder({ provider });
        txBuilder.addInput(utxo, contract.unlock.executePenalty(new SignatureTemplate(backendPrivateKey)));
        txBuilder.addOutput({ to: treasuryAddress, amount: penaltyAmount });
        txBuilder.addOutput({ to: contract.address, amount: changeAmount });
        const tx = await txBuilder.send();
        if (!tx.txid) {
            return res.status(500).json({ success: false, error: 'Failed to broadcast penalty transaction' });
        }
        // 6. Wait for confirmation (optional, can be async)
        // const confirmed = await waitForBchConfirmation(tx.txid, 1);
        // if (!confirmed) {
        //   return res.status(500).json({ success: false, error: 'Transaction not confirmed' });
        // }
        return res.status(200).json({ success: true, vaultAddress, txid: tx.txid });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
export default router;
