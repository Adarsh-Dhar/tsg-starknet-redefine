
import { Router, Request, Response } from 'express';
import bitcore from 'bitcore-lib-cash';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();
const router = Router();

// BCH Backend Wallet setup
const backendWif = String(process.env.BACKEND_WIF || '').trim();
console.log('Loaded BACKEND_WIF:', backendWif, 'Length:', backendWif.length);
if (!backendWif) {
  throw new Error('BACKEND_WIF is not set in environment variables.');
}
const backendPrivateKey = bitcore.PrivateKey.fromWIF(backendWif);
const backendAddress = backendPrivateKey.toAddress().toString();

// Placeholder scoring functions
function calculateDissociationIndex(_mindsetMetadata: any) { return 0; }
function calculateExponentialScore(_mindsetMetadata: any) { return 0; }

// AI-Slash Pipeline (BCH)
router.post('/ai-slash', async (req: Request, res: Response) => {
  const { userPublicKey, sessionTraceId, telemetryData, sessionDuration } = req.body;
  // Validate required fields
  if (!userPublicKey || !sessionTraceId || !telemetryData || !sessionDuration) {
    return res.status(400).json({ error: 'Missing required fields in request body.' });
  }
  // Validate BCH address
  try {
    bitcore.Address.fromString(userPublicKey);
  } catch (e) {
    return res.status(400).json({ success: false, error: "Invalid BCH Address provided." });
  }
  try {
    // Placeholder: always exceeds threshold
    const exceedsThreshold = true;
    if (exceedsThreshold) {
      // 1. Query UTXOs for user address
      const query = {
        query: `query GetUtxos($address: String!) { address_by_pkh(address: $address) { utxos { tx_hash output_index value_satoshis script_pubkey } } }`,
        variables: { address: userPublicKey }
      };
      let utxoRes, utxoResult, data;
      try {
        utxoRes = await fetch('https://chipnet.chaingraph.cash/v1/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(query)
        });
        utxoResult = await utxoRes.json();
        data = (utxoResult as any).data?.address_by_pkh?.[0];
      } catch (err: any) {
        console.error('[slash/ai-slash] Error fetching UTXOs:', err);
        return res.status(502).json({ success: false, error: 'Failed to fetch UTXOs from chaingraph: ' + (err.message || err.toString()) });
      }
      if (!data || !data.utxos || data.utxos.length === 0) {
        return res.status(400).json({ error: 'No UTXOs found for user address.' });
      }
      const utxos = data.utxos.map((u: any) => ({
        txid: u.tx_hash.replace('\\x', ''),
        vout: u.output_index,
        satoshis: parseInt(u.value_satoshis),
        script: u.script_pubkey.replace('\\x', '')
      }));
      // 2. Build and sign transaction to slash (send 5000 sats to backend)
      try {
        const tx = new bitcore.Transaction()
          .from(utxos.map((u: any) => ({
            txid: u.txid,
            outputIndex: u.vout,
            script: u.script,
            satoshis: u.satoshis
          })))
          .to(backendAddress, 5000)
          .change(userPublicKey)
          .sign(backendPrivateKey);
        res.json({
          success: true,
          action_type: "BCH_SLASH_EXECUTION",
          rawTx: tx.serialize()
        });
      } catch (err: any) {
        console.error('[slash/ai-slash] Error building/signing tx:', err);
        return res.status(500).json({ success: false, error: 'Failed to build or sign transaction: ' + (err.message || err.toString()) });
      }
    }
  } catch (e: any) {
    // Handle network errors like ECONNRESET
    if (e.code === 'ECONNRESET' || e.message?.includes('ECONNRESET')) {
      console.error('[slash/ai-slash] ECONNRESET:', e);
      return res.status(502).json({ success: false, error: 'Network error: ECONNRESET. Please try again later.' });
    }
    res.status(500).json({ success: false, error: e.message });
  }
});

// Manual Slash (BCH)
router.post('/slash', async (req: Request, res: Response) => {
  const { userPublicKey, amount, metrics, mindsetMetadata } = req.body;
  // Validate required fields
  if (!userPublicKey || !amount) {
    return res.status(400).json({ error: 'Missing userPublicKey or amount in request body.' });
  }
  // Validate BCH address
  try {
    bitcore.Address.fromString(userPublicKey);
  } catch (e) {
    return res.status(400).json({ success: false, error: "Invalid BCH Address provided." });
  }
  const dissociationIndex = calculateDissociationIndex(mindsetMetadata);
  const exponentialScore = calculateExponentialScore(mindsetMetadata);
  try {
    // 1. Query UTXOs for user address
    const query = {
      query: `query GetUtxos($address: String!) { address_by_pkh(address: $address) { utxos { tx_hash output_index value_satoshis script_pubkey } } }`,
      variables: { address: userPublicKey }
    };
    const utxoRes = await fetch('https://chipnet.chaingraph.cash/v1/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query)
    });
    const utxoResult = await utxoRes.json();
    const data = (utxoResult as any).data?.address_by_pkh?.[0];
    if (!data || !data.utxos || data.utxos.length === 0) {
      return res.status(400).json({ error: 'No UTXOs found for user address.' });
    }
    const utxos = data.utxos.map((u: any) => ({
      txid: u.tx_hash.replace('\\x', ''),
      vout: u.output_index,
      satoshis: parseInt(u.value_satoshis),
      script: u.script_pubkey.replace('\\x', '')
    }));
    // 2. Build and sign transaction to slash (send amount sats to backend)
    const tx = new bitcore.Transaction()
      .from(utxos.map((u: any) => ({
        txid: u.txid,
        outputIndex: u.vout,
        script: u.script,
        satoshis: u.satoshis
      })))
      .to(backendAddress, parseInt(amount))
      .change(userPublicKey)
      .sign(backendPrivateKey);
    res.json({
      success: true,
      rawTx: tx.serialize(),
      phenotype: "SEEKER",
      dissociationIndex,
      exponentialScore
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Refund (BCH)
router.post('/refund', async (req: Request, res: Response) => {
  const { userPublicKey, amount } = req.body;
  // Validate BCH address
  try {
    bitcore.Address.fromString(userPublicKey);
  } catch (e) {
    return res.status(400).json({ success: false, error: "Invalid BCH Address provided." });
  }
  try {
    // 1. Query UTXOs for backend address
    const query = {
      query: `query GetUtxos($address: String!) { address_by_pkh(address: $address) { utxos { tx_hash output_index value_satoshis script_pubkey } } }`,
      variables: { address: backendAddress }
    };
    const utxoRes = await fetch('https://chipnet.chaingraph.cash/v1/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query)
    });
    const utxoResult = await utxoRes.json();
    const data = (utxoResult as any).data?.address_by_pkh?.[0];
    if (!data || !data.utxos || data.utxos.length === 0) {
      return res.status(503).json({ error_code: "TREASURY_INSUFFICIENT" });
    }
    const utxos = data.utxos.map((u: any) => ({
      txid: u.tx_hash.replace('\\x', ''),
      vout: u.output_index,
      satoshis: parseInt(u.value_satoshis),
      script: u.script_pubkey.replace('\\x', '')
    }));
    // 2. Build and sign transaction to refund (send amount sats to user)
    const tx = new bitcore.Transaction()
      .from(utxos.map((u: any) => ({
        txid: u.txid,
        outputIndex: u.vout,
        script: u.script,
        satoshis: u.satoshis
      })))
      .to(userPublicKey, parseInt(amount))
      .change(backendAddress)
      .sign(backendPrivateKey);
    res.json({
      success: true,
      rawTx: tx.serialize(),
      type: 'refund'
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
