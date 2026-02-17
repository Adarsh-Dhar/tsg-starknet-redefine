import bitcore from 'bitcore-lib-cash';
import fetch from 'node-fetch';

async function main() {
  const wif = 'cRu1v354n9JVYJtMNAjqRBPkszNGxRJxHEbH6uB5rNo8QJSreqTk';
  const privateKey = bitcore.PrivateKey.fromWIF(wif);
  const address = 'bchtest:qr9ra8740euwwyxmand72tm5uaran43g4yer0y2qs7';
  const vaultAddress = 'bchtest:pvaultplaceholder123456789';

  console.log('Using BCH Address:', address);

  // 1. Fetch UTXOs (Switched to http to avoid SSL version mismatch)
  let utxos = [];
  try {
    // Note: switched to http://
    const utxoUrl = `http://chipnet.imaginary.cash/explorer-api/addr/${address}/utxo`;
    const utxoRes = await fetch(utxoUrl);
    if (!utxoRes.ok) throw new Error(`Status ${utxoRes.status}`);
    utxos = await utxoRes.json();
  } catch (e) {
    console.error('❌ Failed to fetch UTXOs:', e.message);
    console.log('Trying fallback URL...');
    // Fallback to the main address-based API if the explorer-api path fails
    const fallbackUrl = `http://chipnet.imaginary.cash/api/addr/${address}/utxo`;
    const res = await fetch(fallbackUrl);
    utxos = await res.json();
  }

  if (utxos.length === 0) {
    console.error('❌ No UTXOs found. Please fund: https://chipnet.faucet.cash/');
    process.exit(1);
  }

  // 2. Build Transaction
  try {
    const tx = new bitcore.Transaction()
      .from(utxos.map(u => ({
        txid: u.txid,
        outputIndex: u.vout,
        script: u.scriptPubKey,
        satoshis: u.satoshis
      })))
      .to(vaultAddress, 5000) // Send a small amount
      .change(address)
      .sign(privateKey);

    console.log('✅ Transaction signed. Broadcasting to Imaginary.cash...');

    // 3. Broadcast (Switched to http://)
    const broadcastRes = await fetch('http://chipnet.imaginary.cash/explorer-api/tx/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawtx: tx.serialize() })
    });

    const result = await broadcastRes.json();
    if (result.txid) {
      console.log(`🚀 Success! TXID: ${result.txid}`);
      console.log(`View: http://chipnet.imaginary.cash/tx/${result.txid}`);
    } else {
      console.error('❌ Broadcast failed:', result);
    }
  } catch (err) {
    console.error('❌ build/broadcast error:', err.message);
  }
}

main();