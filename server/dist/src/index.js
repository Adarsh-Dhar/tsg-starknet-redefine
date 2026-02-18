import express from 'express';
import cors from 'cors';
import { initBackendWallet } from './backendWallet.js';
import slashRouter from './routes/slash/route.js';
import vaultRouter from './routes/vault/route.js';
import dataRouter, { dataRateLimiter } from './routes/data/route.js';
import { connectRedis } from './redisClient.js';
// Initialize backend wallet and persistent Redis connection
initBackendWallet();
connectRedis().then(() => {
    console.log('Redis connected (pooled)');
}).catch((err) => {
    console.error('Redis connection failed:', err);
});
const app = express();
const PORT = 3333;
// Enable CORS for all origins (only once, before routes)
app.use(cors());
// Middleware to parse JSON
app.use(express.json());
app.get('/', (req, res) => {
    res.send('Hello! Your Node.js + TypeScript server is running.');
});
// Mount routers on distinct sub-paths
app.use('/api/slash', slashRouter); // /api/slash/*
app.use('/api/vault', vaultRouter); // /api/vault/*
app.use('/api/data', dataRateLimiter, dataRouter); // /api/data/*
app.listen(PORT, () => {
    console.log(`Server is live at http://localhost:${PORT}`);
});
