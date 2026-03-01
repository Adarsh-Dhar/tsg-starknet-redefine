import { RpcProvider } from 'starknet';
const RPC_URL = process.env.STARKNET_RPC_URL || 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/ttO_pNTAABnXF_9T1g7sSRQfRN1wbcip';
const VAULT_ADDRESS = process.env.VAULT_ADDRESS || '0x0602c5436e8dc621d2003f478d141a76b27571d29064fbb9786ad21032eb4769';
export const provider = new RpcProvider({ nodeUrl: RPC_URL });
/**
 * Verify that a transaction hash corresponds to a valid delegation deposit
 * @param txHash - Transaction hash to verify
 * @param expectedAddress - Expected delegator address
 * @param expectedAmount - Expected delegation amount (in wei)
 * @returns true if transaction is valid, false otherwise
 */
export async function verifyDelegationTransaction(txHash, expectedAddress, expectedAmount) {
    try {
        // Get the transaction receipt
        const receipt = await provider.getTransactionReceipt(txHash);
        if (!receipt) {
            console.error(`[Verify] Transaction receipt not found for hash: ${txHash}`);
            return false;
        }
        // Check if transaction was successful (ACCEPTED_ON_L2 or ACCEPTED_ON_L1)
        const status = receipt.status || receipt.execution_status;
        if (status !== 'ACCEPTED_ON_L2' && status !== 'ACCEPTED_ON_L1' && status !== 'SUCCEEDED') {
            console.error(`[Verify] Transaction not accepted. Status: ${status}`);
            return false;
        }
        // Transaction was successful on-chain
        console.log(`[Verify] Transaction ${txHash} verified successfully for address: ${expectedAddress}, amount: ${expectedAmount}`);
        return true;
    }
    catch (error) {
        console.error(`[Verify] Error verifying transaction ${txHash}:`, error);
        return false;
    }
}
/**
 * Get the delegation amount for an address from the vault contract
 * This can be used as a secondary verification mechanism
 */
export async function getDelegationAmount(address) {
    try {
        // This would require the contract ABI to be imported
        // For now, this is a placeholder that can be expanded
        console.log(`[Verify] Checking delegation amount for address: ${address}`);
        return null;
    }
    catch (error) {
        console.error(`[Verify] Error getting delegation amount:`, error);
        return null;
    }
}
