// In-memory vault address store (for dev only, not persistent!)
const _vaultStore = {};
/**
 * Get the user's vault address from DB (Redis or other DB)
 * @param walletAddress string
 * @returns vaultAddress string | null
 */
export async function getUserVaultAddress(walletAddress) {
    // In-memory only
    return _vaultStore[walletAddress] || null;
}
/**
 * Set the user's vault address in DB (Redis or other DB)
 * @param walletAddress string
 * @param vaultAddress string
 */
export async function setUserVaultAddress(walletAddress, vaultAddress) {
    _vaultStore[walletAddress] = vaultAddress;
}
