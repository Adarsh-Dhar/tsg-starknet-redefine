

import { Router } from 'express';
import artifact from '../../../../contract/Delegation.json';
import { serverPubKeyHex, backendPrivateKey } from '../../backendWallet';

const router = Router();

router.post('/create-vault', async (req, res) => {
  console.log("1")
  try {
    console.log('Received vault creation request with body:', req.body);
    if (!req.is('application/json')) {
      return res.status(400).json({ error: 'Invalid content-type, expected application/json' });
    }
    const { userPubKeyHex } = req.body;
    if (!userPubKeyHex) {
      return res.status(400).json({ error: 'Missing userPubKeyHex in request body' });
    }
    // Dynamically import cashscript ESM
    const cashscript = await import('cashscript');
    const provider = new cashscript.ElectrumNetworkProvider('chipnet');
    // Use the real backend public key from wallet
    const contract = new cashscript.Contract(artifact, [userPubKeyHex, serverPubKeyHex], { provider });
    res.json({ vaultAddress: contract.address });
  } catch (err: any) {
    console.error('Vault creation error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
