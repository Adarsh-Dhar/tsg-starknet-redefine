"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ethers_1 = require("ethers");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const router = (0, express_1.Router)();
// BEP-20 USDC ABI (Minimum required for transfers)
const USDC_ABI = [
    "function transferFrom(address from, address to, uint256 value) public returns (bool)",
    "function allowance(address owner, address spender) public view returns (uint256)",
    "function balanceOf(address owner) public view returns (uint256)"
];
// Provider and Wallet setup
// Use BSC Testnet RPC directly for clarity and reliability
const provider = new ethers_1.ethers.JsonRpcProvider("https://bsc-testnet-dataseed.bnbchain.org");
console.log('Loaded BACKEND_PRIVATE_KEY:', JSON.stringify(process.env.BACKEND_PRIVATE_KEY), 'Length:', process.env.BACKEND_PRIVATE_KEY?.length);
const backendWallet = new ethers_1.ethers.Wallet(process.env.BACKEND_PRIVATE_KEY, provider);
const usdcContract = new ethers_1.ethers.Contract(process.env.USDC_ADDRESS, USDC_ABI, backendWallet);
// Placeholder scoring functions
function calculateDissociationIndex(_mindsetMetadata) { return 0; }
function calculateExponentialScore(_mindsetMetadata) { return 0; }
// AI-Slash Pipeline
router.post('/ai-slash', async (req, res) => {
    const { userPublicKey, sessionTraceId, telemetryData, sessionDuration } = req.body;
    // Validate required fields
    if (!userPublicKey || !sessionTraceId || !telemetryData || !sessionDuration) {
        return res.status(400).json({ error: 'Missing required fields in request body.' });
    }
    // Validate BSC address
    if (!ethers_1.ethers.isAddress(userPublicKey)) {
        return res.status(400).json({ success: false, error: "Invalid BSC Address provided. Must be a 0x... hex string." });
    }
    try {
        // [AI Analysis Logic remains the same - as per previous turn]
        const exceedsThreshold = true; // Placeholder for intervention logic
        if (exceedsThreshold) {
            const amount = ethers_1.ethers.parseUnits("0.1", 18); // USDC on BSC typically uses 18 decimals
            // 1. Check Allowance
            const currentAllowance = await usdcContract.allowance(userPublicKey, backendWallet.address);
            if (currentAllowance < amount) {
                return res.status(400).json({ error_code: "INSUFFICIENT_ALLOWANCE", error: "User has not approved backend for slashing." });
            }
            // 2. Execute Slash via transferFrom
            const tx = await usdcContract.transferFrom(userPublicKey, backendWallet.address, amount);
            const receipt = await tx.wait();
            res.json({
                success: true,
                action_type: "BNB_SLASH_EXECUTION",
                receipt: {
                    transaction_hash: receipt.hash,
                    explorer_url: `https://bscscan.com/tx/${receipt.hash}`
                }
            });
        }
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
// Manual Slash
router.post('/slash', async (req, res) => {
    const { userPublicKey, amount, metrics, mindsetMetadata } = req.body;
    // Validate required fields
    if (!userPublicKey || !amount) {
        return res.status(400).json({ error: 'Missing userPublicKey or amount in request body.' });
    }
    // Validate BSC address
    if (!userPublicKey || !ethers_1.ethers.isAddress(userPublicKey)) {
        return res.status(400).json({
            success: false,
            error: "Invalid BSC Address provided. It must be a valid 0x... hex string."
        });
    }
    // Use explicit BSC Testnet provider for all contract interactions
    const provider = new ethers_1.ethers.JsonRpcProvider("https://bsc-testnet-dataseed.bnbchain.org");
    const backendWallet = new ethers_1.ethers.Wallet(process.env.BACKEND_PRIVATE_KEY, provider);
    const usdcContract = new ethers_1.ethers.Contract(process.env.USDC_ADDRESS, USDC_ABI, backendWallet);
    const dissociationIndex = calculateDissociationIndex(mindsetMetadata);
    const exponentialScore = calculateExponentialScore(mindsetMetadata);
    try {
        const amountWei = ethers_1.ethers.parseUnits(amount.toString(), 18);
        const tx = await usdcContract.transferFrom(userPublicKey, backendWallet.address, amountWei);
        const receipt = await tx.wait();
        res.json({
            success: true,
            txHash: receipt.hash,
            phenotype: "SEEKER",
            dissociationIndex,
            exponentialScore
        });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
// Refund
router.post('/refund', async (req, res) => {
    const { userPublicKey, amount } = req.body;
    try {
        const amountWei = ethers_1.ethers.parseUnits(amount.toString(), 18);
        // Check Treasury Balance
        const balance = await usdcContract.balanceOf(backendWallet.address);
        if (balance < amountWei) {
            return res.status(503).json({ error_code: "TREASURY_INSUFFICIENT" });
        }
        // Standard BEP-20 transfer from Backend to User
        const usdcInterface = new ethers_1.ethers.Interface(["function transfer(address to, uint256 value) public returns (bool)"]);
        const contractWithSigner = new ethers_1.ethers.Contract(process.env.USDC_ADDRESS, usdcInterface, backendWallet);
        const tx = await contractWithSigner.transfer(userPublicKey, amountWei);
        const receipt = await tx.wait();
        res.json({
            success: true,
            txHash: receipt.hash,
            type: 'refund'
        });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
exports.default = router;
