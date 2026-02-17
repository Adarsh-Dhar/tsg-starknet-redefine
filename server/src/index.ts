import express, { Request, Response } from 'express';
import cors from 'cors';
import { initBackendWallet } from './backendWallet';
import slashRouter from './routes/slash/route';
import vaultRouter from './routes/vault';

// Initialize backend wallet
initBackendWallet();

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

app.listen(PORT, () => {
  console.log(`Server is live at http://localhost:${PORT}`);
});