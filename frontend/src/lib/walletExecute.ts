import { Contract, uint256, type Abi } from 'starknet';

/**
 * Execute approve + deposit with the user's connected wallet
 * This function communicates with the StarkNet wallet to sign and submit transactions
 */
export async function executeDepositWithWallet(
  userAddress: string,
  vaultAddress: string,
  strkTokenAddress: string,
  amount: number,
  vaultAbi: Abi
): Promise<{ transactionHash: string } | null> {
  try {
    // Convert amount to u256 (multiply by 10^18 for decimals)
    const amountBigInt = BigInt(Math.floor(amount * 10 ** 18));
    const amountU256 = uint256.bnToUint256(amountBigInt);

    // STRK Token ABI for approve
    const STRK_ABI: Abi = [
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

    // Create contract instances
    const strk = new Contract(STRK_ABI, strkTokenAddress);
    const vault = new Contract(vaultAbi, vaultAddress);

    // Create the approve call
    const approveCall = strk.populate('approve', [vaultAddress, amountU256]);
    
    // Create the deposit call
    const depositCall = vault.populate('deposit', [amountU256]);

    console.log('[WalletExecute] Approve call:', approveCall);
    console.log('[WalletExecute] Deposit call:', depositCall);

    // Try to get wallet provider from window (starknet-react injects this)
    const provider = (window as any).starknet;
    
    if (!provider) {
      console.error('[WalletExecute] No wallet provider found. Is wallet connected?');
      return null;
    }

    console.log('[WalletExecute] Found wallet provider, executing calls...');

    // Send the transaction through the wallet
    // The wallet will prompt user to sign
    const result = await provider.request({
      type: 'wallet_invokeFunction',
      payload: {
        transactions: [approveCall, depositCall],
      },
    });

    console.log('[WalletExecute] Transaction result:', result);

    return result as { transactionHash: string };

  } catch (error) {
    console.error('[WalletExecute] Error executing with wallet:', error);
    return null;
  }
}

/**
 * Notify backend that wallet execution is complete with a transaction hash
 * This marks the pending deposit as "success" with the actual tx hash
 */
export async function confirmDepositExecution(
  userAddress: string,
  txHash: string
): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:3333/api/execute-deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAddress,
        transactionHash: txHash,
      }),
    });

    if (!response.ok) {
      console.error('[ConfirmDeposit] Server error:', response.status);
      return false;
    }

    const data = await response.json();
    console.log('[ConfirmDeposit] Backend confirmed deposit. Records updated:', data.recordsUpdated);
    return data.success;
  } catch (error: any) {
    console.error('[ConfirmDeposit] Error confirming deposit:', error.message);
    return false;
  }
}
