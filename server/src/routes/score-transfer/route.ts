import { Router, Request, Response } from 'express';
import { RpcProvider, Account, Contract, uint256, CallData, Signer, type Call } from 'starknet';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import prisma from '../../lib/prisma.js';

const router = Router();
const transactionHistory = (prisma as any).transactionHistory;
const delegation = (prisma as any).delegation;

// Starknet configuration
const RPC_URL = process.env.STARKNET_RPC_URL || 'https://starknet-sepolia.public.blastapi.io';
const VAULT_ADDRESS = process.env.VAULT_ADDRESS || '0x032490c26a49c74f927669b9d5958aa7db74398d0e55b92a10d952c32e0c2630';
const STRK_TOKEN = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

// Server account credentials
const SERVER_ADDRESS = process.env.STARKNET_ACCOUNT_ADDRESS || '0x4a05d15f240be02f13ef2e09349a668f2faa7942cbde11008b737111c9351f3';
const SERVER_PRIVATE_KEY = process.env.STARKNET_PRIVATE_KEY || '';

// Load vault ABI
const vaultAbiPath = path.join(
  process.cwd(),
  '../grass_vault/target/dev/grass_vault_GravityVault.contract_class.json'
);

let VAULT_ABI: any = [];

try {
  const abiData = JSON.parse(fs.readFileSync(vaultAbiPath, 'utf-8'));
  if (abiData.abi && Array.isArray(abiData.abi) && abiData.abi.length > 0) {
    VAULT_ABI = abiData.abi;
  }
} catch (error) {
  console.warn('[ScoreTransfer] Could not load vault ABI from file');
  // Use minimal ABI
  VAULT_ABI = [
    {
      name: 'slash',
      type: 'function',
      inputs: [
        { name: 'user', type: 'core::starknet::contract_address::ContractAddress' },
        { name: 'amount', type: 'core::integer::u256' },
      ],
      outputs: [],
      state_mutability: 'external',
    },
    {
      name: 'transfer',
      type: 'function',
      inputs: [
        { name: 'user', type: 'core::starknet::contract_address::ContractAddress' },
        { name: 'recipient', type: 'core::starknet::contract_address::ContractAddress' },
        { name: 'amount', type: 'core::integer::u256' },
      ],
      outputs: [],
      state_mutability: 'external',
    },
    {
      name: 'unslash',
      type: 'function',
      inputs: [
        { name: 'user', type: 'core::starknet::contract_address::ContractAddress' },
        { name: 'amount', type: 'core::integer::u256' },
      ],
      outputs: [],
      state_mutability: 'external',
    },
    {
      name: 'get_balance',
      type: 'function',
      inputs: [
        { name: 'account', type: 'core::starknet::contract_address::ContractAddress' },
      ],
      outputs: [{ type: 'core::integer::u256' }],
      state_mutability: 'view',
    },
  ];
}

// Zod schemas for validation
const DeductSchema = z.object({
  userAddress: z.string().min(1, 'User address is required'),
  scoreIncrease: z.number().int().positive('Score increase must be positive'),
});

const RefundSchema = z.object({
  userAddress: z.string().min(1, 'User address is required'),
  scoreDecrease: z.number().int().positive('Score decrease must be positive'),
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function executeWithNonceRetry(account: Account, calls: Call | Call[]) {
  try {
    return await account.execute(calls as any);
  } catch (error: any) {
    const message = String(error?.message || '');
    const isNonceError =
      message.includes('Invalid transaction nonce') ||
      message.includes('NonceTooOld') ||
      message.includes('account nonce');

    if (!isNonceError) {
      throw error;
    }

    await sleep(1200);
    return await account.execute(calls as any);
  }
}

function u256ToBigInt(value: any): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(value);
  if (typeof value === 'string') return BigInt(value);

  if (value && value.low !== undefined && value.high !== undefined) {
    return (BigInt(value.high) << 128n) + BigInt(value.low);
  }

  if (Array.isArray(value) && value.length >= 2) {
    return (BigInt(value[1]) << 128n) + BigInt(value[0]);
  }

  return 0n;
}

/**
 * POST /api/score-transfer/deduct
 * Called by frontend when user's score increases by 100-point buckets
 * Deducts 0.01 STRK per 100-point bucket using vault.slash()
 */
router.post('/deduct', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[ScoreTransfer-Deduct] Received deduction request:', req.body);

    const validation = DeductSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Invalid request', details: validation.error.issues });
      return;
    }

    const { userAddress, scoreIncrease } = validation.data;

    // Calculate number of 100-point buckets crossed
    const bucketsCrossed = Math.floor(scoreIncrease / 100);
    const requestedAmountToDeduct = bucketsCrossed * 0.01;

    if (requestedAmountToDeduct <= 0) {
      res.status(400).json({ error: 'Score increase must be at least 100 for deduction' });
      return;
    }

    let attemptedAmount = requestedAmountToDeduct;

    try {
      // Check if server is properly configured
      if (!SERVER_PRIVATE_KEY) {
        console.warn('[ScoreTransfer-Deduct] Server not configured with private key, creating mock response');
        // Create mock transaction for testing
        const mockTxHash = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`;
        
        await transactionHistory.create({
          data: {
            txHash: mockTxHash,
            address: userAddress,
            amount: requestedAmountToDeduct,
            type: 'deduct',
            status: 'success',
          },
        });

        res.json({
          success: true,
          txHash: mockTxHash,
          amount: requestedAmountToDeduct,
          bucketsCrossed,
          message: '[MOCK] Deduction recorded',
        });
        return;
      }

      // Initialize RPC provider
      const provider = new RpcProvider({ nodeUrl: RPC_URL });

      // Create server account with Signer
      const signer = new Signer(SERVER_PRIVATE_KEY);
      const account = new Account({
        provider: provider,
        address: SERVER_ADDRESS,
        signer: signer,
      });

      // Cap deduction to actual on-chain user vault balance to avoid INSUFFICIENT_FUNDS failures
      const vaultContract = new Contract({
        abi: VAULT_ABI,
        address: VAULT_ADDRESS,
        providerOrAccount: provider,
      });

      const onChainBalanceRaw = await (vaultContract as any).get_balance(userAddress);
      const onChainBalanceWei = u256ToBigInt(onChainBalanceRaw);
      const requestedAmountWei = BigInt(Math.floor(requestedAmountToDeduct * 10 ** 18));
      const executableAmountWei = requestedAmountWei > onChainBalanceWei ? onChainBalanceWei : requestedAmountWei;

      if (executableAmountWei <= 0n) {
        res.status(400).json({
          success: false,
          error: 'INSUFFICIENT_FUNDS',
          message: 'User has no available deposited balance in vault for deduction.',
          requestedAmount: requestedAmountToDeduct,
          availableAmount: 0,
        });
        return;
      }

      const amountToDeduct = Number(executableAmountWei) / 10 ** 18;
      attemptedAmount = amountToDeduct;
      const amountU256 = uint256.bnToUint256(executableAmountWei);

      // Create Call object for slash function
      const slashCall: Call = {
        contractAddress: VAULT_ADDRESS,
        entrypoint: 'slash',
        calldata: CallData.compile({
          user: userAddress,
          amount: amountU256,
        }),
      };

      // Keep vault token balance solvent for slash transfer.
      // We top up vault token balance first, then slash in the same multicall.
      // Net STRK effect on delegate wallet is ~0 (ignoring gas), but avoids token underflow in vault.
      const topUpVaultTokenCall: Call = {
        contractAddress: STRK_TOKEN,
        entrypoint: 'transfer',
        calldata: CallData.compile({
          recipient: VAULT_ADDRESS,
          amount: amountU256,
        }),
      };

      console.log(`[ScoreTransfer-Deduct] Executing slash for ${amountToDeduct} STRK from ${userAddress} (with vault top-up sync)`);

      // Execute slash function via server account
      // Note: Gas fees MUST be paid in ETH on Starknet (protocol requirement)
      const result = await executeWithNonceRetry(account, [topUpVaultTokenCall, slashCall]);

      const txHash = result.transaction_hash;

      // Record in database
      await transactionHistory.create({
        data: {
          txHash,
          address: userAddress,
          amount: amountToDeduct,
          type: 'deduct',
          status: 'success',
        },
      });

      res.json({
        success: true,
        txHash,
        amount: amountToDeduct,
        requestedAmount: requestedAmountToDeduct,
        bucketsCrossed,
        partiallyExecuted: executableAmountWei < requestedAmountWei,
      });
    } catch (error: any) {
      console.error('[ScoreTransfer-Deduct] Execution error:', error);

      // Record failed transaction
      const mockTxHash = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`;
      await transactionHistory.create({
        data: {
          txHash: mockTxHash,
          address: userAddress,
          amount: attemptedAmount,
          type: 'deduct',
          status: 'failed',
        },
      });

      const errorMessage = error.message || 'INSUFFICIENT_FUNDS_OR_NOT_AUTHORIZED';
      const hasVaultBalanceError = errorMessage.includes('INSUFFICIENT_FUNDS');
      const hasVaultTokenLiquidityError =
        errorMessage.includes('u256_sub Overflow') ||
        errorMessage.includes('0x753235365f737562204f766572666c6f77');
      
      res.status(400).json({
        success: false,
        error: errorMessage,
        message: hasVaultTokenLiquidityError
          ? 'Vault token liquidity is insufficient for slash transfer. Please run one refund first (or top up vault token balance) and retry.'
          : hasVaultBalanceError
            ? 'User has insufficient deposited balance in vault for this deduction.'
            : 'Failed to execute deduction. Check vault balance and permissions.',
      });
    }
  } catch (error: any) {
    console.error('[ScoreTransfer-Deduct] Server error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * POST /api/score-transfer/refund
 * Called by frontend when user's score decreases by 100-point buckets
 * Refunds 0.01 STRK per 100-point bucket using vault.transfer()
 * Only refunds STRK that was previously deducted (not full vault balance)
 */
router.post('/refund', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[ScoreTransfer-Refund] Received refund request:', req.body);

    const validation = RefundSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Invalid request', details: validation.error.issues });
      return;
    }

    const { userAddress, scoreDecrease } = validation.data;

    // Calculate number of 100-point buckets crossed
    const bucketsCrossed = Math.floor(scoreDecrease / 100);
    const amountToRefund = bucketsCrossed * 0.01;

    if (amountToRefund <= 0) {
      res.status(400).json({ error: 'Score decrease must be at least 100 for refund' });
      return;
    }

    try {
      // Get total amount ever deducted for this user
      const deductedRecords = await transactionHistory.findMany({
        where: {
          address: userAddress,
          type: 'deduct',
          status: 'success',
        },
      });

      const totalDeducted = deductedRecords.reduce((sum: number, tx: any) => sum + tx.amount, 0);

      // Get total amount already refunded
      const refundedRecords = await transactionHistory.findMany({
        where: {
          address: userAddress,
          type: 'refund',
          status: 'success',
        },
      });

      const totalRefunded = refundedRecords.reduce((sum: number, tx: any) => sum + tx.amount, 0);

      // Calculate available refund (can't refund more than was deducted)
      const availableRefund = totalDeducted - totalRefunded;

      if (amountToRefund > availableRefund) {
        res.status(400).json({
          success: false,
          error: 'INSUFFICIENT_REFUNDABLE_BALANCE',
          message: `Cannot refund ${amountToRefund.toFixed(6)} STRK. Only ${availableRefund.toFixed(6)} STRK available to refund.`,
          availableRefund,
        });
        return;
      }

      // Check if server is properly configured
      if (!SERVER_PRIVATE_KEY) {
        console.warn('[ScoreTransfer-Refund] Server not configured with private key, creating mock response');
        // Create mock transaction for testing
        const mockTxHash = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`;
        
        await transactionHistory.create({
          data: {
            txHash: mockTxHash,
            address: userAddress,
            amount: amountToRefund,
            type: 'refund',
            status: 'success',
          },
        });

        res.json({
          success: true,
          txHash: mockTxHash,
          amount: amountToRefund,
          bucketsCrossed,
          message: '[MOCK] Refund recorded',
        });
        return;
      }

      // Initialize RPC provider
      const provider = new RpcProvider({ nodeUrl: RPC_URL });

      // Create server account with Signer
      const signer = new Signer(SERVER_PRIVATE_KEY);
      const account = new Account({
        provider: provider,
        address: SERVER_ADDRESS,
        signer: signer,
      });

      // Convert amount to u256 (18 decimals)
      const amountWei = BigInt(Math.floor(amountToRefund * 10 ** 18));
      const amountU256 = uint256.bnToUint256(amountWei);

      // 1) Transfer STRK from delegate wallet back into vault token balance
      //    so future slash operations stay solvent at token level.
      const topUpVaultTokenCall: Call = {
        contractAddress: STRK_TOKEN,
        entrypoint: 'transfer',
        calldata: CallData.compile({
          recipient: VAULT_ADDRESS,
          amount: amountU256,
        }),
      };

      // 2) Credit back user internal vault balance (reverse slash accounting)
      const unslashCall: Call = {
        contractAddress: VAULT_ADDRESS,
        entrypoint: 'unslash',
        calldata: CallData.compile({
          user: userAddress,
          amount: amountU256,
        }),
      };

      // Legacy vault fallback (no unslash): transfer(user,user,amount)
      const legacyRefundTransferCall: Call = {
        contractAddress: VAULT_ADDRESS,
        entrypoint: 'transfer',
        calldata: CallData.compile({
          user: userAddress,
          recipient: userAddress,
          amount: amountU256,
        }),
      };

      console.log(`[ScoreTransfer-Refund] Executing refund for ${amountToRefund} STRK: top-up vault + unslash for ${userAddress}`);

      // Execute as multicall to keep token balance and internal balance in sync.
      // Fallback to legacy transfer() if unslash is unavailable on older vault deployments.
      // Note: Gas fees MUST be paid in ETH on Starknet (protocol requirement)
      let result;
      try {
        result = await executeWithNonceRetry(account, [topUpVaultTokenCall, unslashCall]);
      } catch (error: any) {
        const message = String(error?.message || '');
        const missingUnslash =
          message.includes('ENTRYPOINT_NOT_FOUND') ||
          message.includes('0x454e545259504f494e545f4e4f545f464f554e44');

        if (!missingUnslash) {
          throw error;
        }

        console.warn('[ScoreTransfer-Refund] unslash not found on vault; falling back to legacy transfer(user,user,amount)');
        result = await executeWithNonceRetry(account, legacyRefundTransferCall);
      }

      const txHash = result.transaction_hash;

      // Record in database
      await transactionHistory.create({
        data: {
          txHash,
          address: userAddress,
          amount: amountToRefund,
          type: 'refund',
          status: 'success',
        },
      });

      res.json({
        success: true,
        txHash,
        amount: amountToRefund,
        bucketsCrossed,
        availableRefund: availableRefund - amountToRefund,
      });
    } catch (error: any) {
      console.error('[ScoreTransfer-Refund] Execution error:', error);

      // Record failed transaction
      const mockTxHash = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`;
      await transactionHistory.create({
        data: {
          txHash: mockTxHash,
          address: userAddress,
          amount: amountToRefund,
          type: 'refund',
          status: 'failed',
        },
      });

      const errorMessage = error.message || 'INSUFFICIENT_FUNDS_OR_NOT_AUTHORIZED';
      
      res.status(400).json({
        success: false,
        error: errorMessage,
        message: errorMessage.includes('INSUFFICIENT') 
          ? 'Vault has insufficient STRK balance for this refund' 
          : 'Failed to execute refund. Check vault balance and permissions.',
      });
    }
  } catch (error: any) {
    console.error('[ScoreTransfer-Refund] Server error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message || 'Internal server error',
    });
  }
});

export default router;
