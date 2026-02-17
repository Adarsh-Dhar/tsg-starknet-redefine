"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverPubKeyHex = exports.backendPrivateKey = void 0;
exports.initBackendWallet = initBackendWallet;
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const bitcore_mnemonic_1 = __importDefault(require("bitcore-mnemonic"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
function initBackendWallet() {
    const mnemonicString = process.env.BCH_BACKEND_MNEMONIC;
    if (!mnemonicString)
        throw new Error("Missing BCH_BACKEND_MNEMONIC in .env");
    try {
        const code = new bitcore_mnemonic_1.default(mnemonicString);
        // Derive the HDPrivateKey using 'testnet' for Chipnet compatibility
        const hdPrivateKey = code.toHDPrivateKey("", 'testnet');
        const derived = hdPrivateKey.deriveChild("m/44'/145'/0'/0/0");
        // Initialize the variables
        exports.backendPrivateKey = derived.privateKey;
        exports.serverPubKeyHex = exports.backendPrivateKey.toPublicKey().toString();
        console.log("✅ Backend Wallet Initialized");
        console.log("Public Key (Hex):", exports.serverPubKeyHex);
        console.log("BCH Address:", exports.backendPrivateKey.toAddress().toString());
    }
    catch (error) {
        console.error("❌ Failed to initialize wallet:", error.message);
        throw error;
    }
}
