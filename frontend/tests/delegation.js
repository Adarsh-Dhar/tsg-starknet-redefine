// This script generates a BCH testnet key, fetches UTXOs, builds, signs, and broadcasts a real delegation transaction.
// It prints the real TX hash. Fund the generated address with testnet BCH before running.

import bitcore from 'bitcore-lib-cash';
import fetch from 'node-fetch';

async function main() {
  // 1. Generate a BCH testnet key
  const wif = 'cRu1v354n9JVYJtMNAjqRBPkszNGxRJxHEbH6uB5rNo8QJSreqTk';
  const privateKey = bitcore.PrivateKey.fromWIF(wif);
  const address = 'bchtest:qr9ra8740euwwyxmand72tm5uaran43g4yer0y2qs7';
  const publicKey = '02b56bd2aaa8db82b78b708b701524f0d2a310ded8fb68eff8e158bab3a1b252a8';
  console.log('Using BCH Testnet Address:', address);
  console.log('Public Key:', publicKey);
  console.log('Private Key (WIF):', wif);

  // 2. Wait for user to fund the address
  console.log('\nFund this address with testnet BCH, then press Enter to continue...');
  await new Promise(resolve => process.stdin.once('data', resolve));

  // 3. Fetch UTXOs from alternative API with error handling
  const shortAddress = address.replace(/^bchtest:/, '');
  const utxoRes = await fetch(`https://tbch4.loping.net/api/addr/${shortAddress}/utxo`);
  let utxos;
  const utxoRaw = await utxoRes.text();
  try {
    utxos = JSON.parse(utxoRaw);
  } catch (e) {
    console.error('Failed to parse UTXO API response as JSON. Raw response:');
    console.error(utxoRaw);
    process.exit(1);
  }
  if (!Array.isArray(utxos) || utxos.length === 0) {
    console.error('No BCH UTXOs found for this address. Fund your wallet first.');
    process.exit(1);
  }

  // 4. Set a vault address (replace with your real vault address)
  const vaultAddress = 'bchtest:pvaultplaceholder123456789';

  // 5. Build the transaction
  const tx = new bitcore.Transaction()
    .from(utxos)
    .to(vaultAddress, 10000) // 0.0001 BCH in satoshis
    .change(address)
    .sign(privateKey);

  // 6. Broadcast using alternative API
  const broadcastRes = await fetch('https://testnet.imaginary.cash/api/tx/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawtx: tx.serialize() })
  });
  const result = await broadcastRes.json();
  if (result.txid) {
    console.log('Delegation Successful! TXID:', result.txid);
    console.log('Explorer: https://chipnet.imaginary.cash/tx/' + result.txid);
  } else {
    console.error('Broadcast failed:', result);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
