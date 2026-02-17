import express, { Request, Response } from 'express';
const slashRouter = require('./routes/slash/route');
const vaultRouter = require('./routes/vault');
import { initBackendWallet, backendPrivateKey, serverPubKeyHex } from './backendWallet';
import cors from 'cors';

// Initialize backend wallet and export public key for routes
initBackendWallet();
export { backendPrivateKey, serverPubKeyHex };


const app = express();
const PORT = 3333;

// Enable CORS for all origins
app.use(cors());
// Middleware to parse JSON
app.use(express.json());


app.get('/', (req: Request, res: Response) => {
  res.send('Hello! Your Node.js + TypeScript server is running.');
});

// Mount the slash router
app.use('/api', slashRouter);
app.use('/api', vaultRouter);

app.listen(PORT, () => {
  console.log(`Server is live at http://localhost:${PORT}`);
});