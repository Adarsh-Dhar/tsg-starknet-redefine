import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma.js';
import { verifyDelegationTransaction } from '../../lib/transactionVerify.js';
import { z } from 'zod';

const router = Router();

// Zod schemas for validation
const DelegateRequestSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  amount: z.number().positive('Amount must be positive'),
  txHash: z.string().min(1, 'Transaction hash is required'),
});

const StatusRequestSchema = z.object({
  address: z.string().min(1, 'Address is required'),
});

/**
 * POST /api/delegate
 * Called by tsg-portal after successful Starknet transaction
 * Verifies the transaction on-chain and updates the delegation record
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const parsed = DelegateRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.issues,
      });
    }

    const { address, amount, txHash } = parsed.data;

    console.log(`[Delegate] New delegation request: address=${address}, amount=${amount}, txHash=${txHash}`);

    // Skip verification for balance refreshes from the portal
    const isBalanceRefresh = txHash === 'manual_refresh';
    
    if (!isBalanceRefresh) {
      // Verify the transaction on-chain only for real transactions
      const isValid = await verifyDelegationTransaction(
        txHash,
        address,
        BigInt(Math.floor(amount * 10 ** 18))
      );

      if (!isValid) {
        console.warn(`[Delegate] Transaction verification failed for ${txHash}`);
        return res.status(400).json({
          error: 'Transaction verification failed',
          message: 'The transaction could not be verified on-chain. Please check the transaction hash.',
        });
      }
    } else {
      console.log(`[Delegate] Balance refresh request - skipping on-chain verification`);
    }

    // Update or create the delegation record
    const delegation = await prisma.delegation.upsert({
      where: { address },
      update: {
        amountDelegated: amount,
        lastUpdated: new Date(),
        lastTxHash: txHash,
      },
      create: {
        address,
        amountDelegated: amount,
        lastTxHash: txHash,
      },
    });

    console.log(`[Delegate] Delegation updated for ${address}: ${amount} STRK`);

    return res.status(200).json({
      success: true,
      message: 'Delegation recorded successfully',
      delegation: {
        address: delegation.address,
        amountDelegated: delegation.amountDelegated,
        lastUpdated: delegation.lastUpdated,
      },
    });
  } catch (error) {
    console.error('[Delegate] Error processing delegation:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process delegation',
    });
  }
});

/**
 * GET /api/delegate/status/:address
 * Called by frontend extension to check delegation status
 * Returns the delegation amount for a given address
 */
router.get('/status/:address', async (req: Request<{ address: string }>, res: Response) => {
  try {
    const parsedStatus = StatusRequestSchema.safeParse({ address: req.params.address });
    if (!parsedStatus.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsedStatus.error.issues,
      });
    }

    const { address } = parsedStatus.data;

    console.log(`[Status] Checking delegation status for address: ${address}`);

    // Look up delegation in database
    const delegation = await prisma.delegation.findUnique({
      where: { address },
    });

    if (!delegation) {
      console.log(`[Status] No delegation found for address: ${address}`);
      return res.status(200).json({
        success: true,
        address,
        amountDelegated: 0,
        isDelegated: false,
        message: 'No delegation record found',
      });
    }

    console.log(`[Status] Found delegation for ${address}: ${delegation.amountDelegated} STRK`);

    return res.status(200).json({
      success: true,
      address: delegation.address,
      amountDelegated: delegation.amountDelegated,
      isDelegated: delegation.amountDelegated >= 1,
      lastUpdated: delegation.lastUpdated,
      lastTxHash: delegation.lastTxHash,
    });
  } catch (error) {
    console.error('[Status] Error fetching delegation status:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch delegation status',
    });
  }
});

/**
 * GET /api/delegate/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  return res.status(200).json({
    status: 'ok',
    message: 'Delegation API is healthy',
  });
});

export default router;
