import { Router, Request, Response } from 'express';
import { Account, Contract, RpcProvider, CallData, uint256, Signer } from 'starknet';
import prisma from '../../lib/prisma.js';

const router = Router();
const transactionHistory = (prisma as any).transactionHistory;

const STRK_TOKEN = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
const VAULT_ADDRESS = '0x0602c5436e8dc621d2003f478d141a76b27571d29064fbb9786ad21032eb4769';
const RPC_URL = 'https://starknet-sepolia.public.blastapi.io';

const STRK_ABI = [
  {
    type: 'function',
    name: 'transferFrom',
    inputs: [
      { name: 'from_', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'to', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'value', type: 'core::integer::u256' },
    ],
    outputs: [{ type: 'core::bool' }],
    state_mutability: 'external',
  },
] as any;

const VAULT_ABI = [
  {
    type: 'function',
    name: 'deposit',
    inputs: [{ name: 'amount', type: 'core::integer::u256' }],
    outputs: [],
    state_mutability: 'external',
  },
] as any;

// Get backend account
function getAccount(): Account {
  const accountAddress = '0x4a05d15f240be02f13ef2e09349a668f2faa7942cbde11008b737111c9351f3';
  const privateKey = '0x25baeea1b44be5f61c7f0f9cec53947959583023a03ef096d77a4495492818';
  const provider = new RpcProvider({ nodeUrl: RPC_URL });
  const signer = new Signer(privateKey);
  return new Account({
    provider: provider,
    address: accountAddress,
    signer: signer,
  });
}

/**
 * POST /api/execute-pending-deposits/:userAddress
 * Execute all pending deposits for a user via backend account
 * User must have approved backend account as spender for STRK token
 */
router.post('/:userAddress', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userAddress } = req.params;
    console.log(`[ExecutePendingDeposits] Processing pending deposits for ${userAddress}`);

    // Fetch pending deposits for this user
    const pendingDeposits = await transactionHistory.findMany({
      where: {
        address: userAddress,
        status: 'pending',
        type: 'deposit',
      },
    });

    if (pendingDeposits.length === 0) {
      res.json({
        success: true,
        message: 'No pending deposits',
        executed: 0,
      });
      return;
    }

    console.log(`[ExecutePendingDeposits] Found ${pendingDeposits.length} pending deposits for ${userAddress}`);

    // Sum up total amount to deposit
    let totalAmount = 0n;
    for (const deposit of pendingDeposits) {
      const amount = BigInt(Math.floor(deposit.amount * 10 ** 18));
      totalAmount += amount;
    }

    console.log(`[ExecutePendingDeposits] Total amount: ${totalAmount.toString()} wei`);

    try {
      const account = getAccount();

      // Create STRK contract for transferFrom
      const strk = new Contract({
        abi: STRK_ABI,
        address: STRK_TOKEN,
        providerOrAccount: account,
      });

      const vault = new Contract({
        abi: VAULT_ABI,
        address: VAULT_ADDRESS,
        providerOrAccount: account,
      });

      // Convert amount to u256
      const amountU256 = uint256.bnToUint256(totalAmount);

      // Create calls: transferFrom user tokens to vault, then deposit
      const transferCall = strk.populate('transferFrom', [
        userAddress,
        VAULT_ADDRESS,
        amountU256,
      ]);

      const depositCall = vault.populate('deposit', [amountU256]);


      console.log(`[ExecutePendingDeposits] Executing transfer and deposit calls...`);

      // Execute both calls atomically
      const response = await account.execute([transferCall, depositCall]);
      const txHash = response.transaction_hash;

      console.log(`[ExecutePendingDeposits] Transaction submitted! TX: ${txHash}`);

      // Update all pending deposits to success with this tx hash
      const updated = await transactionHistory.updateMany({
        where: {
          address: userAddress,
          status: 'pending',
          type: 'deposit',
        },
        data: {
          txHash: txHash,
          status: 'success',
        },
      });

      console.log(`[ExecutePendingDeposits] Updated ${updated.count} records with tx hash`);

      res.json({
        success: true,
        message: `Executed ${updated.count} deposits`,
        transactionHash: txHash,
        executed: updated.count,
        totalAmount: (totalAmount / BigInt(10 ** 18)).toString(),
      });
    } catch (error: any) {
      console.error('[ExecutePendingDeposits] Blockchain error:', error.message);

      // Record error in database for these deposits
      await transactionHistory.updateMany({
        where: {
          address: userAddress,
          status: 'pending',
          type: 'deposit',
        },
        data: {
          status: 'failed',
        },
      });

      res.status(400).json({
        success: false,
        error: 'BLOCKCHAIN_ERROR',
        message: error.message || 'Failed to execute transaction on blockchain',
        hint: 'Make sure you have approved the vault as a spender on your STRK token',
      });
    }
  } catch (error: any) {
    console.error('[ExecutePendingDeposits] Server error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message || 'Internal server error',
    });
  }
});

export default router;
