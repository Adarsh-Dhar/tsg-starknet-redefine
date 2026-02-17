
import express, { Request, Response } from 'express';
import slashRouter from './routes/slash/route';
import vaultRouter from './routes/vault';
import { initBackendWallet, backendPrivateKey, serverPubKeyHex } from './backendWallet';

// Initialize backend wallet and export public key for routes
initBackendWallet();
export { backendPrivateKey, serverPubKeyHex };

const app = express();
const PORT = 3333;

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