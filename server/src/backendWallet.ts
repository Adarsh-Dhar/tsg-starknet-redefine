import bitcore from 'bitcore-lib-cash';
import Mnemonic from 'bitcore-mnemonic';
import dotenv from 'dotenv';

dotenv.config();

export let backendPrivateKey: bitcore.PrivateKey;
export let serverPubKeyHex: string;

export function initBackendWallet() {
  const mnemonicString = process.env.BCH_BACKEND_MNEMONIC;
  if (!mnemonicString) throw new Error("Missing BCH_BACKEND_MNEMONIC in .env");

  // 1. Create Mnemonic object
  const code = new Mnemonic(mnemonicString);

  // 2. Derive the HDPrivateKey (Standard path m/44'/145'/0'/0/0 for BCH)
  const hdPrivateKey = code.toHDPrivateKey("", 'testnet');
  const derived = hdPrivateKey.deriveChild("m/44'/145'/0'/0/0");

  // 3. Set global variables for use in routes
  backendPrivateKey = derived.privateKey;
  serverPubKeyHex = backendPrivateKey.toPublicKey().toString();

  // Optionally, set SERVER_PUBKEY in process.env for legacy code
  process.env.SERVER_PUBKEY = serverPubKeyHex;

  console.log("✅ Backend Wallet Initialized");
  console.log("Public Key (Hex):", serverPubKeyHex);
  console.log("BCH Address:", backendPrivateKey.toAddress('testnet').toString());
}
