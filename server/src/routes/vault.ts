const { Router } = require('express');
const artifact = require('../../../contract/Delegation.json');
const { serverPubKeyHex } = require('../backendWallet');

const router = Router();

router.post('/vault/create-vault', async (req: any, res: any) => {
  try {
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
module.exports = router;
