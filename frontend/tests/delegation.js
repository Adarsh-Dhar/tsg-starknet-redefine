import bitcore from 'bitcore-lib-cash';
import fetch from 'node-fetch';

async function main() {
  const wif = 'cRu1v354n9JVYJtMNAjqRBPkszNGxRJxHEbH6uB5rNo8QJSreqTk';
  const privateKey = bitcore.PrivateKey.fromWIF(wif);
  const address = 'bchtest:qr9ra8740euwwyxmand72tm5uaran43g4yer0y2qs7';
  const vaultAddress = 'bchtest:pvaultplaceholder123456789';

  console.log('🔍 Querying Chipnet Ledger via Chaingraph...');

  // 1. GraphQL Query for UTXOs
  const query = {
    query: `
    query GetUtxos($address: String!) {
      address_by_pkh(address: $address) {
        utxos {
          tx_hash
          output_index
          value_satoshis
          script_pubkey
        }
      }
    }`,
    variables: { address: address }
  };

  try {
    const res = await fetch('https://chipnet.chaingraph.cash/v1/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query)
    });

    const result = await res.json();
    const data = result.data?.address_by_pkh?.[0];

    if (!data || !data.utxos || data.utxos.length === 0) {
      console.log('❌ Result: 0 UTXOs found.');
      console.log('This means the faucet transaction did not reach this node yet.');
      return;
    }

    const utxos = data.utxos.map(u => ({
      txid: u.tx_hash.replace('\\x', ''),
      vout: u.output_index,
      satoshis: parseInt(u.value_satoshis),
      script: u.script_pubkey.replace('\\x', '')
    }));

    console.log(`✅ Success! Found ${utxos.length} UTXOs.`);

    // 2. Build Transaction
    const tx = new bitcore.Transaction()
      .from(utxos.map(u => ({
        txid: u.txid,
        outputIndex: u.vout,
        script: u.script,
        satoshis: u.satoshis
      })))
      .to(vaultAddress, 5000)
      .change(address)
      .sign(privateKey);

    console.log('✅ Tx Signed. Raw Hex:', tx.serialize());

  } catch (err) {
    console.error('⚠️ System Error:', err.message);
  }
}

main();