


// In-memory vault address store (for dev only, not persistent!)
const _vaultStore: Record<string, string> = {};

/**
 * Get the user's vault address from DB (Redis or other DB)
 * @param walletAddress string
 * @returns vaultAddress string | null
 */
export async function getUserVaultAddress(walletAddress: string): Promise<string | null> {
  // In-memory only
  return _vaultStore[walletAddress] || null;
}

/**
 * Set the user's vault address in DB (Redis or other DB)
 * @param walletAddress string
 * @param vaultAddress string
 */
export async function setUserVaultAddress(walletAddress: string, vaultAddress: string): Promise<void> {
  _vaultStore[walletAddress] = vaultAddress;
}