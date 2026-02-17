"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverPubKeyHex = exports.backendPrivateKey = void 0;
const express_1 = __importDefault(require("express"));
const slashRouter = require('./routes/slash/route');
const vaultRouter = require('./routes/vault');
const backendWallet_1 = require("./backendWallet");
Object.defineProperty(exports, "backendPrivateKey", { enumerable: true, get: function () { return backendWallet_1.backendPrivateKey; } });
Object.defineProperty(exports, "serverPubKeyHex", { enumerable: true, get: function () { return backendWallet_1.serverPubKeyHex; } });
const cors_1 = __importDefault(require("cors"));
// Initialize backend wallet and export public key for routes
(0, backendWallet_1.initBackendWallet)();
const app = (0, express_1.default)();
const PORT = 3333;
// Enable CORS for all origins
app.use((0, cors_1.default)());
// Middleware to parse JSON
app.use(express_1.default.json());
app.get('/', (req, res) => {
    res.send('Hello! Your Node.js + TypeScript server is running.');
});
// Mount the slash router
app.use('/api', slashRouter);
app.use('/api', vaultRouter);
app.listen(PORT, () => {
    console.log(`Server is live at http://localhost:${PORT}`);
});
