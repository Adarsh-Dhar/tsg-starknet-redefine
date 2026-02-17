const { Router } = require('express');
const artifact = require('../../../contract/Delegation.json');
const { serverPubKeyHex } = require('../backendWallet');

const router = Router();

router.post('/create-vault', async (req: any, res: any) => {
  const { userPubKeyHex } = req.body;
  // Dynamically import cashscript ESM
  const cashscript = await import('cashscript');
  const provider = new cashscript.ElectrumNetworkProvider('chipnet');
  // Use the real backend public key from wallet
  const contract = new cashscript.Contract(artifact, [userPubKeyHex, serverPubKeyHex], { provider });
  res.json({ vaultAddress: contract.address });
});

module.exports = router;
module.exports = router;
