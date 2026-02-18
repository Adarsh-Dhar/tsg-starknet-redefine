import { useState, useEffect } from 'react';
import { ElectrumNetworkProvider, Contract, SignatureTemplate } from 'cashscript';
import artifact from '../Delegation.json';
import * as bitcore from 'bitcore-lib-cash';

export default function WalletPage() {

  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState<{ privateKey: string; address: string; pubKey: string } | null>(null);
  const [vaultAddress, setVaultAddress] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);

  // On mount, generate or load wallet from localStorage (for web context)
  useEffect(() => {
    const storedPriv = localStorage.getItem('bchPrivateKey');
    const storedAddr = localStorage.getItem('bchAddress');
    const storedPub = localStorage.getItem('bchPubKey');
    if (storedPriv && storedAddr && storedPub) {
      setWallet({ privateKey: storedPriv, address: storedAddr, pubKey: storedPub });
    } else {
      // Generate new wallet using bitcore-lib-cash
      const privateKeyObj = new bitcore.PrivateKey();
      const privateKey = privateKeyObj.toWIF();
      const address = privateKeyObj.toAddress().toString();
      const pubKey = privateKeyObj.toPublicKey().toString();
      localStorage.setItem('bchPrivateKey', privateKey);
      localStorage.setItem('bchAddress', address);
      localStorage.setItem('bchPubKey', pubKey);
      setWallet({ privateKey, address, pubKey });
    }
  }, []);

  // Fetch vault address from backend
  const fetchVaultAddress = async (pubKey: string) => {
    try {
      // Log the pubKey value and length before sending
      console.log('[DEBUG] Sending userPubKeyHex:', pubKey);
      console.log('[DEBUG] Type:', typeof pubKey, 'Length:', pubKey ? pubKey.length : 'null');
      // Ensure endpoint matches backend: /api/vault/create-vault
      const res = await fetch('http://localhost:3333/api/vault/create-vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPubKeyHex: pubKey })
      });
      const data = await res.json();
      if (data.vaultAddress) {
        setVaultAddress(data.vaultAddress);
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ bchVaultAddress: data.vaultAddress });
        }
      }
    } catch (err) {
      alert('Failed to fetch vault address: ' + err);
    }
  };

  // On wallet load, fetch vault address
  useEffect(() => {
    if (wallet && wallet.pubKey) {
      fetchVaultAddress(wallet.pubKey);
    }
  }, [wallet]);

  // Note: You need the server's public key to initialize the contract on the frontend
  // You can fetch this from your backend or hardcode it if it's static
  const serverPubKeyHex = "03..."; // TODO: Replace with actual server pubkey

  // Delegation button logic: fund vault if empty, else trigger backend penalty
  const executeDelegationTx = async () => {
    if (!wallet || !vaultAddress) return alert('Wallet or vault not initialized!');
    setLoading(true);
    try {
      // 1. Initialize the provider for Chipnet
      const provider = new ElectrumNetworkProvider('chipnet');
      // 2. Initialize the Contract instance
      const contract = new Contract(
        artifact as any,
        [wallet.pubKey, serverPubKeyHex],
        { provider }
      );
      // 3. Check if vault is funded (has UTXOs)
      const contractUtxos = await contract.getUtxos();
      if (!contractUtxos.length) {
        // Vault is empty, fund it with a small deposit
        // Build and broadcast a funding transaction from user's wallet
        // (This is a simplified example, production code should handle UTXO selection, fees, etc.)
        const userPrivKey = bitcore.PrivateKey.fromWIF(wallet.privateKey);
        const userAddress = wallet.address;
        // Fetch UTXOs for user
        const utxoRes = await fetch(`https://chipnet.imaginary.cash/api/address/${userAddress}/utxos`);
        const utxos = await utxoRes.json();
        if (!utxos.length) throw new Error('No BCH in wallet to fund vault');
        const utxo = utxos[0];
        const tx = new bitcore.Transaction()
          .from(utxo)
          .to(vaultAddress, 10000) // 10,000 sats (0.0001 BCH)
          .change(userAddress)
          .fee(500)
          .sign(userPrivKey);
        // Broadcast
        const broadcastRes = await fetch('https://chipnet.imaginary.cash/api/tx/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawtx: tx.serialize() })
        });
        const broadcastData = await broadcastRes.json();
        if (broadcastData.txid) {
          setTxHash(broadcastData.txid);
          alert(`Vault funded! TXID: ${broadcastData.txid}`);
        } else {
          throw new Error('Failed to broadcast funding transaction');
        }
      } else {
        // Vault is already funded, trigger backend penalty logic
        const slashRes = await fetch('http://localhost:3333/api/slash/ai-slash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userPublicKey: wallet.pubKey,
            sessionTraceId: 'frontend-trigger',
            telemetryData: {},
            sessionDuration: 0
          })
        });
        const slashData = await slashRes.json();
        if (slashData.success && slashData.txid) {
          setTxHash(slashData.txid);
          alert(`Penalty executed! TXID: ${slashData.txid}`);
        } else {
          throw new Error(slashData.error || 'Penalty execution failed');
        }
      }
    } catch (err: any) {
      let errorMsg = 'Delegation Failed: ';
      if (err instanceof Error) {
        errorMsg += err.message;
        if (err.stack) {
          errorMsg += '\nStack: ' + err.stack;
        }
      } else if (typeof err === 'object' && err !== null) {
        try {
          errorMsg += JSON.stringify(err);
        } catch (e) {
          errorMsg += '[object with circular refs]';
        }
      } else {
        errorMsg += String(err);
      }
      // Also log to console for developer debugging
      console.error('Delegation Error:', err);
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-xl shadow-lg text-center max-w-md">
        <h1 className="text-2xl font-bold mb-4">Touch Grass Wallet Connect</h1>
        {wallet && vaultAddress ? (
          <>
            <div className="mb-4">
              <div className="text-xs text-gray-500 mb-1">Your BCH Address:</div>
              <div className="font-mono text-sm break-all">{wallet.address}</div>
              <div className="text-xs text-gray-500 mt-2 mb-1">Vault Address:</div>
              <div className="font-mono text-sm break-all">{vaultAddress}</div>
            </div>
            <button
              onClick={executeDelegationTx}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg"
            >
              {/* You can use an icon here if you have one, e.g. <Zap className="w-5 h-5" /> */}
              {loading ? 'Delegating...' : 'Delegate Control (Send 0.0001 BCH)'}
            </button>
              {txHash && (
                <div className="mt-4 p-2 bg-green-100 border border-green-400 rounded">
                  <div className="text-xs text-green-700 font-bold">Delegation TX Hash:</div>
                  <div className="font-mono text-xs break-all">{txHash}</div>
                  <a
                    href={`https://chipnet.imaginary.cash/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline text-xs"
                  >
                    View on Block Explorer
                  </a>
                </div>
              )}
            <p className="text-[10px] text-center text-slate-400 mt-2">
              This locks a small deposit into your personal AI-enforced vault.
            </p>
          </>
        ) : (
          <button
            disabled
            className="px-6 py-3 bg-gray-300 text-gray-500 font-bold rounded-lg"
          >
            Loading wallet...
          </button>
        )}
      </div>
    </div>
  );
}