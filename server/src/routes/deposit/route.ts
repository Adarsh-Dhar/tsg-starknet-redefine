import { Router, Request, Response } from 'express';
import { RpcProvider, Account, Contract, uint256, Signer, Call } from 'starknet';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import prisma from '../../lib/prisma.js';

const router = Router();
const transactionHistory = (prisma as any).transactionHistory;


// Starknet configuration - use Alchemy instead of Blast
const RPC_URL = process.env.STARKNET_RPC_URL || 'https://starknet-sepolia.public.blastapi.io';
const VAULT_ADDRESS = process.env.VAULT_ADDRESS || '0x032490c26a49c74f927669b9d5958aa7db74398d0e55b92a10d952c32e0c2630';
const STRK_TOKEN = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

// Load vault ABI
const vaultAbiPath = path.join(
  process.cwd(),
  '../grass_vault/target/dev/grass_vault_GravityVault.contract_class.json'
);

let VAULT_ABI: any = [
  {
    name: 'deposit',
    type: 'function',
    inputs: [
      { name: 'amount', type: 'core::integer::u256' },
    ],
    outputs: [],
    state_mutability: 'external',
  },
];

try {
  const abiData = JSON.parse(fs.readFileSync(vaultAbiPath, 'utf-8'));
  if (abiData.abi && Array.isArray(abiData.abi) && abiData.abi.length > 0) {
    VAULT_ABI = abiData.abi;
  }
} catch (error) {
  console.warn('[Deposit] Could not load vault ABI from file, using minimal ABI');
}

// STRK Token ABI (minimal for approve)
const STRK_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'amount', type: 'core::integer::u256' },
    ],
    outputs: [{ type: 'core::bool' }],
    state_mutability: 'external',
  },
];

// Zod schema for validation
const DepositRequestSchema = z.object({
  userAddress: z.string().min(1, 'User address is required'),
  amount: z.number().positive('Amount must be positive'),
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[Deposit] Received deposit request:', req.body);

    const validation = DepositRequestSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Invalid request', details: validation.error.issues });
      return;
    }

    const { userAddress, amount } = validation.data;

    // For now, just record the deposit intent in the database
    // Frontend will execute the actual contract transaction with user's wallet
    try {
      await transactionHistory.create({
        data: {
          txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
          address: userAddress,
          amount: amount,
          type: 'deposit',
          status: 'pending',
        },
      });
      console.log('[Deposit] Recorded deposit intent for', userAddress, amount, 'STRK');
    } catch (dbError) {
      console.error('[Deposit] Failed to save deposit intent:', dbError);
    }

    // Return vault info for frontend to execute the deposit
    res.json({
      success: true,
      message: 'Deposit recorded - frontend will execute with user wallet',
      userAddress,
      amount,
      vaultAddress: VAULT_ADDRESS,
      strkToken: STRK_TOKEN,
      nextSteps: 'Frontend should call approve() on STRK token, then deposit() on vault with same amount',
    });

  } catch (error: any) {
    console.error('[Deposit] Server error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message || 'Internal server error',
    });
  }
});

export default router;
