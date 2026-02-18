import bitcore from 'bitcore-lib-cash';
import * as bip39 from 'bip39';

const mnemonic = process.argv[2];
if (!mnemonic) {
  console.error('Usage: node get-wif-from-mnemonic.js "<mnemonic phrase>"');
  process.exit(1);
}

const seed = bip39.mnemonicToSeedSync(mnemonic);
const hdPrivateKey = bitcore.HDPrivateKey.fromSeed(seed, bitcore.Networks.testnet);
const derived = hdPrivateKey.deriveChild("m/44'/1'/0'/0/0");
const wif = derived.privateKey.toWIF();
console.log('WIF:', wif);
