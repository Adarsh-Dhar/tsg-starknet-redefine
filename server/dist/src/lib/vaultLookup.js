import { redis } from '../redisClient.js';
/**
 * Get the user's vault address from DB (Redis or other DB)
 * @param walletAddress string
 * @returns vaultAddress string | null
 */
export async function getUserVaultAddress(walletAddress) {
    // Example: Store vault address in Redis with key `vault:<walletAddress>`
    const key = `vault:${walletAddress}`;
    const vaultAddress = await redis.get(key);
    return vaultAddress || null;
}
/**
 * Set the user's vault address in DB (Redis or other DB)
 * @param walletAddress string
 * @param vaultAddress string
 */
export async function setUserVaultAddress(walletAddress, vaultAddress) {
    const key = `vault:${walletAddress}`;
    await redis.set(key, vaultAddress);
}
