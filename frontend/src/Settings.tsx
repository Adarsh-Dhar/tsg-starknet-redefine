import { useState } from 'react';
import { ElectrumNetworkProvider, Contract } from 'cashscript';
// Make sure this path points to where you placed Delegation.json
import artifact from './Delegation.json'; 

export function DelegationSetup() {
  const [vaultAddress, setVaultAddress] = useState<string>('');

  const createDelegationVault = async () => {
    try {
      // 1. Connect to Chipnet (the active BCH testnet)
      const provider = new ElectrumNetworkProvider('chipnet');

      // 2. Define the Public Keys
      // TODO: Replace with the actual public key of the connected user's wallet
      const userPubKeyHex = "02be1b...placeholder...123456"; 
      
      // TODO: Replace with your backend server's permanent public key
      const serverPubKeyHex = "03cf2a...placeholder...789abc"; 

      // 3. Instantiate the Contract locally
      // This combines the logic in Delegation.json with the two public keys
      const contract = new Contract(artifact, [userPubKeyHex, serverPubKeyHex], { provider });

      // 4. The contract address is generated instantly and offline
      console.log('Unique Vault Address:', contract.address);
      setVaultAddress(contract.address);

      // 5. Fund the Vault
      // At this point, you would prompt the user's wallet to send a small amount
      // of testnet BCH (e.g., $5 worth) directly to `contract.address`.
      alert(`Please send testnet BCH to: ${contract.address} to activate penalties.`);

    } catch (error) {
      console.error("Failed to create delegation vault:", error);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 mt-4">
      <h3 className="text-lg font-bold mb-2">Enable AI Penalties</h3>
      <p className="text-sm text-gray-600 mb-4">
        Delegate penalty execution to the Touch Grass AI. You can reclaim your unspent funds at any time.
      </p>
      
      <button 
        onClick={createDelegationVault}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
      >
        Authorize & Fund Vault
      </button>

      {vaultAddress && (
        <div className="mt-4 p-3 bg-white border border-green-200 rounded">
          <p className="text-xs font-mono text-gray-500">Vault Address:</p>
          <p className="text-sm font-bold break-all">{vaultAddress}</p>
        </div>
      )}
    </div>
  );
}