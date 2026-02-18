import { redis } from '../redisClient';

/**
 * Get the user's vault address from DB (Redis or other DB)
 * @param walletAddress string
 * @returns vaultAddress string | null
 */
export async function getUserVaultAddress(walletAddress: string): Promise<string | null> {
  // Example: Store vault address in Redis with key `vault:<walletAddress>`
  const key = `vault:${walletAddress}`;
  const vaultAddress = await redis.get(key);
  return vaultAddress || null;
}
