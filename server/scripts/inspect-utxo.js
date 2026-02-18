// Script to inspect a UTXO at a given address and print locking script and value
// Usage: node inspect-utxo.js <address>


import { ElectrumNetworkProvider } from 'cashscript';


const provider = new ElectrumNetworkProvider('chipnet');


async function inspectUtxos(address) {
  const utxos = await provider.getUtxos(address);
  if (!utxos.length) {
    console.log('No UTXOs found for address:', address);
    return;
  }
  for (const utxo of utxos) {
    console.log('---');
    console.log('TxID:', utxo.txid);
    console.log('Vout:', utxo.vout);
    console.log('Satoshis:', utxo.satoshis);
    console.log('Locking Bytecode:', utxo.lockingBytecode);
  }
}

const address = process.argv[2];
if (!address) {
  console.error('Usage: pnpm exec ts-node server/scripts/inspect-utxo.js <address>');
  process.exit(1);
}

inspectUtxos(address).catch(console.error);
