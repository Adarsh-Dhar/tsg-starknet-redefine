"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Delegation_json_1 = __importDefault(require("../../../../contract/Delegation.json"));
const backendWallet_1 = require("../../backendWallet");
const router = (0, express_1.Router)();
router.post('/create-vault', async (req, res) => {
    console.log("1");
    try {
        console.log('Received vault creation request with body:', req.body);
        if (!req.is('application/json')) {
            return res.status(400).json({ error: 'Invalid content-type, expected application/json' });
        }
        const { userPubKeyHex } = req.body;
        if (!userPubKeyHex) {
            return res.status(400).json({ error: 'Missing userPubKeyHex in request body' });
        }
        // Dynamically import cashscript ESM
        const cashscript = await Promise.resolve().then(() => __importStar(require('cashscript')));
        const provider = new cashscript.ElectrumNetworkProvider('chipnet');
        // Use the real backend public key from wallet
        const contract = new cashscript.Contract(Delegation_json_1.default, [userPubKeyHex, backendWallet_1.serverPubKeyHex], { provider });
        res.json({ vaultAddress: contract.address });
    }
    catch (err) {
        console.error('Vault creation error:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});
exports.default = router;
