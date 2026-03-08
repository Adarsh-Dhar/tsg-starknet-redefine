import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma.js';
import { z } from 'zod';

const router = Router();
const HISTORY_DEBUG_LOGS = process.env.HISTORY_DEBUG_LOGS === 'true';

const HistoryRequestSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  limit: z.number().int().positive().max(100).optional().default(10),
});

/**
 * GET /api/delegate/history/:address
 * Fetch delegation history for a specific address
 * Returns recent transactions and delegation updates
 */
router.get('/history/:address', async (req: Request<{ address: string }>, res: Response) => {
  try {
    const parsed = HistoryRequestSchema.safeParse({
      address: req.params.address,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
    });

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.issues,
      });
    }

    const { address, limit } = parsed.data;

    if (HISTORY_DEBUG_LOGS) {
      console.log(`[History] Fetching transaction history for ${address}, limit: ${limit}`);
    }

    // Get delegation record (which stores the latest state)
    const delegation = await prisma.delegation.findUnique({
      where: { address },
    });

    // Fetch transaction history using raw query 
    let transactions: any[] = [];
    try {
      // Use literal SQL string (properly escaped address)
      const escapedAddress = address.replace(/'/g, "''");
      const query = `SELECT id, txHash, address, amount, type, status, timestamp FROM "TransactionHistory" WHERE address = '${escapedAddress}' ORDER BY timestamp DESC LIMIT ${limit}`;
      if (HISTORY_DEBUG_LOGS) {
        console.log(`[History] Running SQL: ${query}`);
      }
      transactions = await (prisma as any).$queryRawUnsafe(query);
      if (HISTORY_DEBUG_LOGS) {
        console.log(`[History] Query returned ${transactions.length} rows`);
        console.log(`[History] Data: ${JSON.stringify(transactions)}`);
      }
    } catch (queryError) {
      console.error(`[History] Query failed:`, queryError);
      transactions = [];
    }

    // If no delegation and no transactions, return 404
    if (!delegation && transactions.length === 0) {
      return res.status(404).json({
        error: 'No delegation found',
        message: 'This address has no delegation history',
      });
    }

    return res.status(200).json({
      success: true,
      address,
      totalDelegated: delegation?.amountDelegated || 0,
      lastUpdated: delegation?.lastUpdated || new Date(),
      transactions: transactions.map(tx => ({
        txHash: tx.txHash,
        amount: tx.amount,
        timestamp: tx.timestamp,
        type: tx.type,
        status: tx.status,
      })),
    });
  } catch (error) {
    console.error('[History] Error fetching transaction history:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch transaction history',
    });
  }
});

export default router;
