"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const backendWallet_1 = require("./backendWallet");
const route_1 = __importDefault(require("./routes/slash/route"));
const route_2 = __importDefault(require("./routes/vault/route"));
// Initialize backend wallet
(0, backendWallet_1.initBackendWallet)();
const app = (0, express_1.default)();
const PORT = 3333;
// Enable CORS for all origins (only once, before routes)
app.use((0, cors_1.default)());
// Middleware to parse JSON
app.use(express_1.default.json());
app.get('/', (req, res) => {
    res.send('Hello! Your Node.js + TypeScript server is running.');
});
// Mount routers on distinct sub-paths
app.use('/api/slash', route_1.default); // /api/slash/*
app.use('/api/vault', route_2.default); // /api/vault/*
app.listen(PORT, () => {
    console.log(`Server is live at http://localhost:${PORT}`);
});
