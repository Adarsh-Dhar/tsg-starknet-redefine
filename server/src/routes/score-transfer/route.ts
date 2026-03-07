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
const VAULT_ADDRESS = process.env.VAULT_ADDRESS || '0x07b39de5a2105f65e9103098a89b0e4c47cae47b2ed4f4012c63d0af61ec416e';
const STRK_TOKEN = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
const SCORE_BASELINE_STRK = Number(process.env.SCORE_BASELINE_STRK || '1');

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

const ReconcileSchema = z.object({
  userAddress: z.string().min(1, 'User address is required'),
  targetBalance: z.number().positive('Target balance must be positive').optional().default(1),
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Global transaction queue to serialize blockchain operations
class TransactionQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          console.error('[TransactionQueue] Task failed:', error);
        }
        // Small delay between transactions
        await sleep(500);
      }
    }
    
    this.processing = false;
  }
}

const txQueue = new TransactionQueue();

async function executeWithNonceRetry(account: Account, calls: Call | Call[], maxRetries: number = 5) {
  return txQueue.enqueue(async () => {
    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Fetch fresh nonce before each attempt
        const nonce = await account.getNonce('pending');
        
        console.log(`[executeWithNonceRetry] Attempt ${attempt + 1}/${maxRetries}, using nonce: ${nonce}`);
        
        return await account.execute(calls as any, { nonce });
      } catch (error: any) {
        lastError = error;
        const message = String(error?.message || '');
        const errorCode = error?.baseError?.code;
        
        // Check if transaction already exists in mempool (code 59)
        const isDuplicateTx =
          errorCode === 59 ||
          message.includes('already exists in the mempool') ||
          message.includes('transaction with the same hash');
        
        // Check if it's a nonce error
        const isNonceError =
          message.includes('Invalid transaction nonce') ||
          message.includes('NonceTooOld') ||
          message.includes('NonceTooLarge') ||
          message.includes('account nonce');

        // If duplicate transaction, wait for it to clear from mempool
        if (isDuplicateTx) {
          const waitTime = 3000 + (attempt * 2000); // Increasing backoff: 3s, 5s, 7s, 9s, 11s
          console.warn(`[executeWithNonceRetry] Duplicate transaction detected (attempt ${attempt + 1}/${maxRetries}), waiting ${waitTime}ms...`);
          if (attempt < maxRetries - 1) {
            await sleep(waitTime);
            continue;
          }
        }
        
        // If nonce error, retry with exponential backoff
        if (isNonceError) {
          const waitTime = 1000 + (attempt * 1000); // Increasing backoff: 1s, 2s, 3s, 4s, 5s
          console.warn(`[executeWithNonceRetry] Nonce error detected (attempt ${attempt + 1}/${maxRetries}), waiting ${waitTime}ms...`);
          if (attempt < maxRetries - 1) {
            await sleep(waitTime);
            continue;
          }
        }

        // For other errors or max retries reached, throw
        throw error;
      }
    }
    
    // If all retries exhausted, throw last error
    throw lastError;
  });
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
      let result;
      try {
        result = await executeWithNonceRetry(account, [topUpVaultTokenCall, slashCall], 5);
      } catch (error: any) {
        const message = String(error?.message || '');
        const errorCode = error?.baseError?.code;
        
        const isDuplicateTx =
          errorCode === 59 ||
          message.includes('already exists in the mempool') ||
          message.includes('transaction with the same hash');
        
        if (isDuplicateTx) {
          console.warn('[ScoreTransfer-Deduct] Duplicate transaction detected - transaction already submitted');
          res.status(409).json({
            success: false,
            error: 'TRANSACTION_PENDING',
            message: 'Deduction transaction is already pending. Please wait for it to complete.',
            requestedAmount: requestedAmountToDeduct,
            partiallyExecuted: false,
          });
          return;
        }
        
        throw error;
      }

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

      // Get total amount deposited by this user
      const depositRecords = await transactionHistory.findMany({
        where: {
          address: userAddress,
          type: 'deposit',
          status: 'success',
        },
      });

      const totalDeposited = depositRecords.reduce((sum: number, tx: any) => sum + tx.amount, 0);

      // Query on-chain vault balance to calculate actual spent amount
      let currentVaultBalance = 0;
      let hasOnChainBalance = false;
      try {
        const provider = new RpcProvider({ nodeUrl: RPC_URL });
        const vaultContract = new Contract({
          abi: VAULT_ABI,
          address: VAULT_ADDRESS,
          providerOrAccount: provider,
        });
        const onChainBalanceRaw = await (vaultContract as any).get_balance(userAddress);
        const onChainBalanceWei = u256ToBigInt(onChainBalanceRaw);
        currentVaultBalance = Number(onChainBalanceWei) / 10 ** 18;
        hasOnChainBalance = true;
      } catch (error) {
        console.warn('[ScoreTransfer-Refund] Could not query vault balance, using historical records only:', error);
      }

      // Method 1: Historical tracking (deducted - refunded)
      const historicalAvailable = Math.max(0, totalDeducted - totalRefunded);

      // Method 2a: Deposit-based spent amount (requires reliable deposit history)
      const actualSpentFromDeposits = Math.max(0, totalDeposited - currentVaultBalance);

      // Method 2b: Baseline gap fallback for deployments where deposit history is incomplete.
      // At score 0, vault should be at SCORE_BASELINE_STRK (default 1 STRK).
      // If balance is below baseline, that gap is refundable.
      const baselineGap = Math.max(0, SCORE_BASELINE_STRK - currentVaultBalance);

      // If we have on-chain balance, trust the best on-chain-compatible source:
      // - when deposit history exists, use max(deposit-spent, baseline-gap)
      // - when deposit history is absent, use baseline-gap directly
      const onChainAvailable = totalDeposited > 0
        ? Math.max(actualSpentFromDeposits, baselineGap)
        : baselineGap;

      // Prefer on-chain-derived amount; fallback to historical only if on-chain read failed.
      const availableRefund = hasOnChainBalance ? onChainAvailable : historicalAvailable;

      console.log(`[ScoreTransfer-Refund] Refund calculation for ${userAddress}:`);
      console.log(`  Total deposited: ${totalDeposited.toFixed(6)} STRK`);
      console.log(`  Current vault balance: ${currentVaultBalance.toFixed(6)} STRK`);
      console.log(`  Baseline target: ${SCORE_BASELINE_STRK.toFixed(6)} STRK`);
      console.log(`  Baseline gap: ${baselineGap.toFixed(6)} STRK`);
      console.log(`  Actual spent from deposits: ${actualSpentFromDeposits.toFixed(6)} STRK`);
      console.log(`  Historical deducted: ${totalDeducted.toFixed(6)} STRK`);
      console.log(`  Historical refunded: ${totalRefunded.toFixed(6)} STRK`);
      console.log(`  Historical available: ${historicalAvailable.toFixed(6)} STRK`);
      console.log(`  On-chain available: ${onChainAvailable.toFixed(6)} STRK`);
      console.log(`  Final available refund: ${availableRefund.toFixed(6)} STRK`);

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

      console.log(`[ScoreTransfer-Refund] Executing refund for ${amountToRefund} STRK: top-up vault + unslash for ${userAddress}`);

      // Execute as multicall to keep token balance and internal balance in sync.
      // Note: Gas fees MUST be paid in ETH on Starknet (protocol requirement)
      let result;
      try {
        result = await executeWithNonceRetry(account, [topUpVaultTokenCall, unslashCall], 5);
      } catch (error: any) {
        const message = String(error?.message || '');
        const errorCode = error?.baseError?.code;
        
        // Check for duplicate transaction (already in mempool)
        const isDuplicateTx =
          errorCode === 59 ||
          message.includes('already exists in the mempool') ||
          message.includes('transaction with the same hash');
        
        if (isDuplicateTx) {
          console.warn('[ScoreTransfer-Refund] Duplicate transaction detected - transaction already submitted and pending');
          res.status(409).json({
            success: false,
            error: 'TRANSACTION_PENDING',
            message: 'Refund transaction is already pending. Please wait for it to complete before retrying.',
            availableRefund,
          });
          return;
        }
        
        const missingUnslash =
          message.includes('ENTRYPOINT_NOT_FOUND') ||
          message.includes('0x454e545259504f494e545f4e4f545f464f554e44');

        if (!missingUnslash) {
          throw error;
        }

        console.warn('[ScoreTransfer-Refund] unslash not found on vault; refund requires user wallet deposit fallback');
        res.status(409).json({
          success: false,
          error: 'REFUND_REQUIRES_DEPOSIT',
          message: 'Vault does not support unslash on this deployment. Approve wallet deposit to apply score decrease refund.',
          requiredDeposit: amountToRefund,
          availableRefund,
        });
        return;
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

/**
 * POST /api/score-transfer/reconcile-zero
 * Reconciles a user's vault balance to a target amount (default: 1 STRK).
 * Useful when score is reset to 0 and vault balance should return to baseline.
 */
router.post('/reconcile-zero', async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = ReconcileSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Invalid request', details: validation.error.issues });
      return;
    }

    const { userAddress, targetBalance } = validation.data;

    const provider = new RpcProvider({ nodeUrl: RPC_URL });
    const vaultContract = new Contract({
      abi: VAULT_ABI,
      address: VAULT_ADDRESS,
      providerOrAccount: provider,
    });

    const currentBalanceRaw = await (vaultContract as any).get_balance(userAddress);
    const currentBalanceWei = u256ToBigInt(currentBalanceRaw);
    const targetBalanceWei = BigInt(Math.floor(targetBalance * 10 ** 18));

    // No-op if already aligned (within 1 wei)
    if (currentBalanceWei === targetBalanceWei) {
      res.json({
        success: true,
        action: 'none',
        txHash: null,
        previousBalance: Number(currentBalanceWei) / 10 ** 18,
        newBalance: Number(currentBalanceWei) / 10 ** 18,
        targetBalance,
      });
      return;
    }

    if (!SERVER_PRIVATE_KEY) {
      res.status(500).json({
        success: false,
        error: 'SERVER_NOT_CONFIGURED',
        message: 'Missing STARKNET_PRIVATE_KEY for reconciliation.',
      });
      return;
    }

    const signer = new Signer(SERVER_PRIVATE_KEY);
    const account = new Account({
      provider,
      address: SERVER_ADDRESS,
      signer,
    });

    let txHash = '';
    let action: 'credit' | 'debit' = 'credit';
    let deltaWei = 0n;

    if (currentBalanceWei < targetBalanceWei) {
      // Need to credit user vault balance back up to target
      action = 'credit';
      deltaWei = targetBalanceWei - currentBalanceWei;
      const deltaU256 = uint256.bnToUint256(deltaWei);

      const topUpVaultTokenCall: Call = {
        contractAddress: STRK_TOKEN,
        entrypoint: 'transfer',
        calldata: CallData.compile({
          recipient: VAULT_ADDRESS,
          amount: deltaU256,
        }),
      };

      const unslashCall: Call = {
        contractAddress: VAULT_ADDRESS,
        entrypoint: 'unslash',
        calldata: CallData.compile({
          user: userAddress,
          amount: deltaU256,
        }),
      };

      try {
        const result = await executeWithNonceRetry(account, [topUpVaultTokenCall, unslashCall], 5);
        txHash = result.transaction_hash;
      } catch (error: any) {
        const message = String(error?.message || '');
        const errorCode = error?.baseError?.code;
        
        const isDuplicateTx =
          errorCode === 59 ||
          message.includes('already exists in the mempool') ||
          message.includes('transaction with the same hash');
        
        if (isDuplicateTx) {
          console.warn('[ScoreTransfer-ReconcileZero] Duplicate transaction detected');
          res.status(409).json({
            success: false,
            error: 'TRANSACTION_PENDING',
            message: 'Reconciliation transaction is already pending.',
          });
          return;
        }
        
        const missingUnslash =
          message.includes('ENTRYPOINT_NOT_FOUND') ||
          message.includes('0x454e545259504f494e545f4e4f545f464f554e44');

        if (missingUnslash) {
          res.status(409).json({
            success: false,
            error: 'RECONCILE_NOT_SUPPORTED',
            message: 'Vault does not support unslash on this deployment. User deposit is required to restore balance.',
            requiredDeposit: Number(deltaWei) / 10 ** 18,
            targetBalance,
            currentBalance: Number(currentBalanceWei) / 10 ** 18,
          });
          return;
        }

        throw error;
      }
    } else {
      // Need to reduce user vault balance down to target
      action = 'debit';
      deltaWei = currentBalanceWei - targetBalanceWei;
      const deltaU256 = uint256.bnToUint256(deltaWei);

      const slashCall: Call = {
        contractAddress: VAULT_ADDRESS,
        entrypoint: 'slash',
        calldata: CallData.compile({
          user: userAddress,
          amount: deltaU256,
        }),
      };

      let result;
      try {
        result = await executeWithNonceRetry(account, slashCall, 5);
      } catch (error: any) {
        const message = String(error?.message || '');
        const errorCode = error?.baseError?.code;
        
        const isDuplicateTx =
          errorCode === 59 ||
          message.includes('already exists in the mempool') ||
          message.includes('transaction with the same hash');
        
        if (isDuplicateTx) {
          console.warn('[ScoreTransfer-ReconcileZero] Duplicate transaction detected (debit path)');
          res.status(409).json({
            success: false,
            error: 'TRANSACTION_PENDING',
            message: 'Reconciliation transaction is already pending.',
          });
          return;
        }
        
        throw error;
      }
      txHash = result.transaction_hash;
    }

    await transactionHistory.create({
      data: {
        txHash,
        address: userAddress,
        amount: Number(deltaWei) / 10 ** 18,
        type: 'reconcile',
        status: 'success',
      },
    });

    res.json({
      success: true,
      action,
      txHash,
      previousBalance: Number(currentBalanceWei) / 10 ** 18,
      newBalance: targetBalance,
      targetBalance,
      adjustedAmount: Number(deltaWei) / 10 ** 18,
    });
  } catch (error: any) {
    console.error('[ScoreTransfer-ReconcileZero] Error:', error);
    res.status(400).json({
      success: false,
      error: error?.message || 'RECONCILE_FAILED',
      message: 'Failed to reconcile vault balance to target.',
    });
  }
});

export default router;
