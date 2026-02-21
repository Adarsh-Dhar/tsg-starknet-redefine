import { ElectrumNetworkProvider } from 'cashscript';

/**
 * Wait for a BCH transaction to be confirmed on-chain
 * @param txid string
 * @param confirmations number (default 1)
 * @returns Promise<boolean>
 */
export async function waitForBchConfirmation(txid: string, confirmations = 1): Promise<boolean> {
  const provider = new ElectrumNetworkProvider('chipnet');
  for (let i = 0; i < 30; i++) { // up to ~60s
    // BCH confirmation logic removed. File deprecated.
  }
  return false;
}
