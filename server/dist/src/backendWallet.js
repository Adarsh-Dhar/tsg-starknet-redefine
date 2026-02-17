"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverPubKeyHex = exports.backendPrivateKey = void 0;
exports.initBackendWallet = initBackendWallet;
const bitcore_mnemonic_1 = __importDefault(require("bitcore-mnemonic"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function initBackendWallet() {
    const mnemonicString = process.env.BCH_BACKEND_MNEMONIC;
    if (!mnemonicString)
        throw new Error("Missing BCH_BACKEND_MNEMONIC in .env");
    // 1. Create Mnemonic object
    const code = new bitcore_mnemonic_1.default(mnemonicString);
    // 2. Derive the HDPrivateKey (Standard path m/44'/145'/0'/0/0 for BCH)
    const hdPrivateKey = code.toHDPrivateKey("", 'testnet');
    const derived = hdPrivateKey.deriveChild("m/44'/145'/0'/0/0");
    // 3. Set global variables for use in routes
    exports.backendPrivateKey = derived.privateKey;
    exports.serverPubKeyHex = exports.backendPrivateKey.toPublicKey().toString();
    // Optionally, set SERVER_PUBKEY in process.env for legacy code
    process.env.SERVER_PUBKEY = exports.serverPubKeyHex;
    console.log("✅ Backend Wallet Initialized");
    console.log("Public Key (Hex):", exports.serverPubKeyHex);
    console.log("BCH Address:", exports.backendPrivateKey.toAddress('testnet').toString());
}
