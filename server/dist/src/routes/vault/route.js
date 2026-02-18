import { Router } from 'express';
import { ElectrumNetworkProvider, Contract } from 'cashscript';
import { serverPubKeyHex } from '../../backendWallet.js'; // Note the .js extension
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { setUserVaultAddress } from '../../lib/vaultLookup.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = Router();
// GET /api/vault/server-pubkey - returns the server's public key as JSON
router.get('/server-pubkey', (req, res) => {
    try {
        if (!serverPubKeyHex) {
            return res.status(500).json({ error: 'Server public key not initialized' });
        }
        res.json({ pubKey: serverPubKeyHex });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch server public key' });
    }
});
// Robustly resolve artifact path for both dev (src) and prod (dist)
// Try all possible locations for the artifact
let artifactPath = path.resolve(__dirname, '../../../contract/Delegation.json');
if (!fs.existsSync(artifactPath)) {
    artifactPath = path.resolve(__dirname, '../../contract/Delegation.json');
}
if (!fs.existsSync(artifactPath)) {
    artifactPath = path.resolve(process.cwd(), 'contract/Delegation.json');
}
if (!fs.existsSync(artifactPath)) {
    throw new Error('Delegation.json artifact not found in any known location: ' + artifactPath);
}
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
router.post('/create-vault', async (req, res) => {
    try {
        let { userPubKeyHex } = req.body;
        // Remove 0x prefix if present
        if (typeof userPubKeyHex === 'string' && (userPubKeyHex.startsWith('0x') || userPubKeyHex.startsWith('0X'))) {
            userPubKeyHex = userPubKeyHex.slice(2);
        }
        // Log the incoming pubkey for debugging
        console.log('[DEBUG] Received userPubKeyHex:', userPubKeyHex);
        console.log('[DEBUG] Type:', typeof userPubKeyHex, 'Length:', userPubKeyHex ? userPubKeyHex.length : 'null');
        const regex = /^[0-9a-fA-F]{66}$|^[0-9a-fA-F]{130}$/;
        const regexTest = regex.test(userPubKeyHex);
        console.log('[DEBUG] Regex test result:', regexTest);
        // Validate hex string (compressed pubkey: 66 chars, uncompressed: 130 chars)
        if (!userPubKeyHex || !regexTest) {
            return res.status(400).json({ error: 'Invalid userPubKeyHex format' });
        }
        // Log artifact path and bytecode for debugging
        console.log('[DEBUG] Artifact path:', artifactPath);
        console.log('[DEBUG] Artifact bytecode (start):', artifact.bytecode ? artifact.bytecode.slice(0, 40) : 'undefined');
        console.log('[DEBUG] Artifact keys:', Object.keys(artifact));
        console.log('[DEBUG] Artifact contractName:', artifact.contractName);
        console.log('[DEBUG] Artifact constructorInputs:', artifact.constructorInputs);
        console.log('[DEBUG] Artifact bytecode present:', !!artifact.bytecode);
        console.log('[DEBUG] Constructor args:', [userPubKeyHex, serverPubKeyHex]);
        console.log('[DEBUG] Arg types:', typeof userPubKeyHex, typeof serverPubKeyHex);
        console.log('[DEBUG] Arg lengths:', userPubKeyHex.length, serverPubKeyHex.length);
        const provider = new ElectrumNetworkProvider('chipnet');
        const contract = new Contract(artifact, [userPubKeyHex, serverPubKeyHex], { provider });
        // Store the mapping in Redis for later lookup
        await setUserVaultAddress(userPubKeyHex, contract.address);
        res.json({ vaultAddress: contract.address });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;
