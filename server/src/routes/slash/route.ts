import { Router, Request, Response } from 'express';
import { 
  ElectrumNetworkProvider, 
  Contract, 
  TransactionBuilder, 
  SignatureTemplate 
} from 'cashscript';
import { backendPrivateKey, serverPubKeyHex } from '../../backendWallet.js';
import { getUserVaultAddress } from '../../lib/vaultLookup.js';
import { waitForBchConfirmation } from '../../lib/waitForBchConfirmation.js';
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
router.post('/ai-slash', async (req: Request, res: Response) => {
  const { userPublicKey } = req.body;
  if (!userPublicKey) return res.status(400).json({ success: false, error: 'Missing userPublicKey' });

  try {
    const vaultAddress = await getUserVaultAddress(userPublicKey);
    if (!vaultAddress) return res.status(404).json({ success: false, error: 'Vault address not found' });

    const contract = new Contract(artifact, [userPublicKey, serverPubKeyHex], { provider });
    const utxos = await contract.getUtxos();
    if (!utxos || utxos.length === 0) {
      return res.status(400).json({ success: false, error: 'Vault is empty. Deposit BCH to Chipnet address first.' });
    }

    // Select the largest UTXO to ensure enough for fees
    const utxo = utxos.sort((a, b) => Number(b.satoshis - a.satoshis))[0];
    const penaltyAmount = 5000n;
    const fee = 1000n; // Slightly higher fee for reliability
    const dustLimit = 546n;
    const changeAmount = BigInt(utxo.satoshis) - penaltyAmount - fee;

    if (changeAmount < 0) {
      return res.status(400).json({ success: false, error: 'Insufficient funds for penalty and fee' });
    }

    // Use WIF string for SignatureTemplate to avoid bitcore version issues
    const signer = new SignatureTemplate(backendPrivateKey.toWIF ? backendPrivateKey.toWIF() : backendPrivateKey);

    const txBuilder = new TransactionBuilder({ provider });
    txBuilder.addInput(utxo, contract.unlock.executePenalty(signer));
    txBuilder.addOutput({ to: 'bchtest:pdaf42dm2e0yrgz25hcmy75aufckhnk8v98r5qnp0c7g8cmtpjanud0698z34', amount: penaltyAmount });
    if (changeAmount >= dustLimit) {
      txBuilder.addOutput({ to: contract.address, amount: changeAmount });
    }
    const tx = await txBuilder.send();
    return res.status(200).json({ success: true, vaultAddress, txid: tx.txid });

  } catch (err: any) {
    // Log the raw error for deep inspection
    console.error('[ERROR] Raw failure:', err);
    // Attempt to extract the most descriptive error message possible
    const detailedError = err?.message || err?.error || JSON.stringify(err) || 'Network/Script validation failed';
    return res.status(500).json({ success: false, error: detailedError });
  }
});

export default router;