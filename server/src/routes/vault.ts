
import { Router } from 'express';
import { ElectrumNetworkProvider, Contract } from 'cashscript';
import artifact from '../../../contract/Delegation.json';
import { serverPubKeyHex } from '../index';

const router = Router();

router.post('/create-vault', async (req, res) => {
  const { userPubKeyHex } = req.body;
  const provider = new ElectrumNetworkProvider('chipnet');
  // Use the real backend public key from wallet
  const contract = new Contract(artifact, [userPubKeyHex, serverPubKeyHex], { provider });
  res.json({ vaultAddress: contract.address });
});

export default router;
