import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma.js';

const router = Router();
const transactionHistory = (prisma as any).transactionHistory;

// Zod schema for validation
const ExecuteDepositSchema = z.object({
  userAddress: z.string().min(1, 'User address is required'),
  transactionHash: z.string().min(1, 'Transaction hash is required'),
});

/**
 * POST /api/execute-deposit
 * Called by frontend after user executes approve + deposit with their wallet
 * Marks the pending deposit as complete with the actual transaction hash
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[ExecuteDeposit] Received execution confirmation:', req.body);

    const validation = ExecuteDepositSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Invalid request', details: validation.error.issues });
      return;
    }

    const { userAddress, transactionHash } = validation.data;

    try {
      // Update the pending deposit record with the actual transaction hash
      const updated = await transactionHistory.updateMany({
        where: {
          address: userAddress,
          status: 'pending',
          type: 'deposit',
        },
        data: {
          txHash: transactionHash,
          status: 'success',
        },
      });

      console.log(`[ExecuteDeposit] Updated ${updated.count} pending deposits with TX: ${transactionHash}`);

      res.json({
        success: true,
        message: 'Deposit execution recorded',
        userAddress,
        transactionHash,
        recordsUpdated: updated.count,
      });
    } catch (dbError) {
      console.error('[ExecuteDeposit] Database error:', dbError);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Failed to update deposit records',
      });
    }
  } catch (error: any) {
    console.error('[ExecuteDeposit] Server error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message || 'Internal server error',
    });
  }
});

export default router;
