import express, { Request, Response } from 'express';
import cors from 'cors';
import slashRouter from './routes/slash/route.js';
import vaultRouter from './routes/vault/route.js';
import dataRouter, { dataRateLimiter } from './routes/data/route.js';
import delegateRouter from './routes/delegate/route.js';

const app = express();
const PORT = 3333;

// Enable CORS for all origins (only once, before routes)
app.use(cors());
// Middleware to parse JSON
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Hello! Your Node.js + TypeScript server is running.');
});

// Mount routers on distinct sub-paths
app.use('/api/slash', slashRouter); // /api/slash/*
app.use('/api/vault', vaultRouter); // /api/vault/*
app.use('/api/data', dataRateLimiter, dataRouter); // /api/data/*
app.use('/api/delegate', delegateRouter); // /api/delegate/*

app.listen(PORT, () => {
  console.log(`Server is live at http://localhost:${PORT}`);
});