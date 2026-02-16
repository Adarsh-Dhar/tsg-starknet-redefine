
import { useState, useEffect } from 'react';
// @ts-ignore - bitcore types can sometimes conflict in Vite, this ensures it compiles
import bitcore from 'bitcore-lib-cash';

export function Settings() {
  const [wallet, setWallet] = useState<{ pubKey: string, address: string } | null>(null);
  const [vaultAddress, setVaultAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load wallet on mount if they already generated one
  useEffect(() => {
    chrome.storage.local.get(['bchPubKey', 'bchAddress', 'bchVaultAddress'], (res) => {
      if (res.bchPubKey) setWallet({ pubKey: res.bchPubKey, address: res.bchAddress });
      if (res.bchVaultAddress) setVaultAddress(res.bchVaultAddress);
    });
  }, []);

  const generateNativeWallet = async () => {
    setLoading(true);
    try {
      // 1. Generate pure JS Testnet Private Key
      const privateKey = new bitcore.PrivateKey('testnet');

      // 2. Derive the Address and Public Key Hex
      const address = privateKey.toAddress('testnet').toString();
      const pubKey = privateKey.toPublicKey().toString(); // Compressed hex string

      // 3. Save to Chrome Local Storage securely
      await chrome.storage.local.set({
        bchPrivateKey: privateKey.toString(),
        bchAddress: address,
        bchPubKey: pubKey
      });

      setWallet({ pubKey, address });

      // 4. Ask Backend to Generate the CashScript Vault
      // TODO: Replace with your actual backend endpoint
      /*
      const response = await fetch('http://localhost:8080/api/create-vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPubKeyHex: pubKey })
      });
      const data = await response.json();
      setVaultAddress(data.vaultAddress);
      chrome.storage.local.set({ bchVaultAddress: data.vaultAddress });
      */

    } catch (err) {
      console.error("Failed to generate wallet:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg mt-4 bg-slate-50 dark:bg-slate-900">
      <h3 className="font-bold text-lg mb-2">Enable AI Penalties</h3>
      
      {!wallet ? (
        <>
          <p className="text-sm text-gray-600 mb-4">
            Generate a native wallet to delegate penalty execution to the Touch Grass AI.
          </p>
          <button 
            onClick={generateNativeWallet}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white font-medium rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Native Wallet & Vault"}
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <div className="p-3 bg-white border border-slate-200 rounded shadow-sm">
            <p className="text-xs text-slate-500 font-mono mb-1">Your Personal BCH Address:</p>
            <p className="text-sm font-medium break-all">{wallet.address}</p>
          </div>
          
          <div className="p-3 bg-green-50 border border-green-300 rounded shadow-sm">
            <p className="text-xs text-green-700 font-bold mb-1">DELEGATION VAULT ACTIVE</p>
            <p className="text-xs text-gray-600 mb-1">Send testnet BCH here to fund penalties:</p>
            <p className="text-sm font-mono break-all text-green-900">
              {vaultAddress ? vaultAddress : "Awaiting Server Vault Calculation..."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}