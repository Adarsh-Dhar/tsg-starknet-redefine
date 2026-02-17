
import path from 'path';
import dotenv from 'dotenv';
import Mnemonic from 'bitcore-mnemonic';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Access the type through the default export and use 'any' if the 
// specific namespace member is failing to resolve in your d.ts file
export let backendPrivateKey: any; 
export let serverPubKeyHex: string;

export function initBackendWallet() {
  const mnemonicString = process.env.BCH_BACKEND_MNEMONIC;
  if (!mnemonicString) throw new Error("Missing BCH_BACKEND_MNEMONIC in .env");

  try {
    const code = new Mnemonic(mnemonicString);

    // Derive the HDPrivateKey using 'testnet' for Chipnet compatibility
    const hdPrivateKey = code.toHDPrivateKey("", 'testnet');
    const derived = hdPrivateKey.deriveChild("m/44'/145'/0'/0/0");

    // Initialize the variables
    backendPrivateKey = derived.privateKey;
    serverPubKeyHex = backendPrivateKey.toPublicKey().toString();

    console.log("✅ Backend Wallet Initialized");
    console.log("Public Key (Hex):", serverPubKeyHex);
    console.log("BCH Address:", backendPrivateKey.toAddress().toString());
  } catch (error: any) {
    console.error("❌ Failed to initialize wallet:", error.message);
    throw error;
  }
}