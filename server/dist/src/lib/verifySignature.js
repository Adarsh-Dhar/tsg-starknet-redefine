// Utility for verifying ECDSA signatures (secp256k1) for Bitcoin Cash/Ethereum addresses
import { ethers } from "ethers";
/**
 * Verifies a message signature against a wallet address (Ethereum/BCH P2PKH)
 * @param message - The original message string
 * @param signature - The signature (hex string)
 * @param walletAddress - The public address to verify against
 * @returns true if valid, false otherwise
 */
export async function verifySignature(message, signature, walletAddress) {
    try {
        // Ethereum-style recovery
        const recovered = ethers.verifyMessage(message, signature);
        if (recovered.toLowerCase() === walletAddress.toLowerCase())
            return true;
        // TODO: Add BCH P2PKH signature verification if needed
        return false;
    }
    catch (e) {
        return false;
    }
}
