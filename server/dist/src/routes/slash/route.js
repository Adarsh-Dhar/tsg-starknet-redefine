import { Router } from 'express';
import { ElectrumNetworkProvider } from 'cashscript';
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
    // Use VAULT_ADDRESS from .env
    const vaultAddress = process.env.VAULT_ADDRESS;
    if (!vaultAddress) {
        return res.status(500).json({ success: false, error: 'VAULT_ADDRESS not set in .env' });
    }
    // If you need to check balance, you must implement a balance check using an API or library
    // For now, just return the vault address
    try {
        console.log('[DEBUG] Using Vault Address from .env:', vaultAddress);
        return res.status(200).json({ success: true, vaultAddress });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
export default router;
