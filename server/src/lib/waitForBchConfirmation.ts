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
    // getRawTransaction returns a raw hex string, so we need to fetch confirmations from a block explorer API
    try {
      const res = await fetch(`https://chipnet.imaginary.cash/api/tx/${txid}`);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.confirmations === 'number' && data.confirmations >= confirmations) {
          return true;
        }
      }
    } catch (e) {
      // ignore and retry
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  return false;
}
