import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bitcore from 'bitcore-lib-cash';
import Mnemonic from 'bitcore-mnemonic';

// Setup __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Exported variables initialized by the function
export let backendPrivateKey: any;
export let serverPubKeyHex: string;

/**
 * Initializes the backend wallet using a mnemonic from environment variables.
 * This should be called in your index.ts entry point.
 */
export function initBackendWallet() {
  const mnemonicString = process.env.BCH_BACKEND_MNEMONIC;
  if (!mnemonicString) {
    throw new Error("Missing BCH_BACKEND_MNEMONIC in .env");
  }

  try {
    const code = new Mnemonic(mnemonicString);

    // Derive the HDPrivateKey using 'testnet' for Chipnet/BCH Testnet compatibility
    const hdPrivateKey = code.toHDPrivateKey("", 'testnet');
    
    // Standard derivation path for BCH: m/44'/145'/0'/0/0
    const derived = hdPrivateKey.deriveChild("m/44'/145'/0'/0/0");

    // Initialize global variables
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