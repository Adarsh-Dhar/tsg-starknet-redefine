import { Router } from 'express';
import { ElectrumNetworkProvider, Contract } from 'cashscript';
import { serverPubKeyHex } from '../../backendWallet.js'; // Note the .js extension
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// Load artifact manually for ESM compatibility
const artifactPath = path.resolve(__dirname, '../../../../contract/Delegation.json');
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

router.post('/create-vault', async (req, res) => {
  try {
    let { userPubKeyHex } = req.body;
    // Remove 0x prefix if present
    if (typeof userPubKeyHex === 'string' && (userPubKeyHex.startsWith('0x') || userPubKeyHex.startsWith('0X'))) {
      userPubKeyHex = userPubKeyHex.slice(2);
    }
    // Validate hex string (compressed pubkey: 66 chars, uncompressed: 130 chars)
    if (!userPubKeyHex || !/^[0-9a-fA-F]{66}$|^[0-9a-fA-F]{130}$/.test(userPubKeyHex)) {
      return res.status(400).json({ error: 'Invalid userPubKeyHex format' });
    }
    const provider = new ElectrumNetworkProvider('chipnet');
    const contract = new Contract(artifact, [userPubKeyHex, serverPubKeyHex], { provider });
    res.json({ vaultAddress: contract.address });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;