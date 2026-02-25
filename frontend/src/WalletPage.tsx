import { useState, useEffect } from 'react';
import { GRAVITY_VAULT_ABI } from './abi';
import { Wallet, ArrowUpRight, ArrowDownLeft, ExternalLink } from 'lucide-react';
import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { uint256 } from 'starknet';

const VAULT_ADDRESS = "0x0602c5436e8dc621d2003f478d141a76b27571d29064fbb9786ad21032eb4769";
const STRK_TOKEN_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

export default function WalletPage() {
    // Bridge: Send sign transaction request to extension
    const sendSignTxToExtension = (tx: any) => {
      // !!! CHECK THIS ID IN chrome://extensions !!!
      const EXTENSION_ID = "khehdcnoacelhjahplhodneiomdlbmed";
      if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(EXTENSION_ID, {
          type: "SIGN_TX",
          tx
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Tx sync failed:", chrome.runtime.lastError.message);
          } else {
            console.log("Tx request sent to extension!");
          }
        });
      }
    };
  const { address, account, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [pubKey, setPubKey] = useState('');

  // Sync wallet info to extension storage (for sidebar bridge)
  useEffect(() => {
    const syncWithExtension = async () => {
      if (isConnected && address && account) {
        const pk = await account.signer.getPubKey();
        const EXTENSION_ID = "khehdcnoacelhjahplhodneiomdlbmed"; // Update if needed

        if (window.chrome && chrome.runtime?.sendMessage) {
          console.log("Attempting sync with ID:", EXTENSION_ID);
          let didRespond = false;
          const timeout = setTimeout(() => {
            if (!didRespond) {
              console.error("❌ Sync Timeout: Extension did not respond. Check if extension is running and ID is correct.");
              alert("Extension Sync Timeout: No response from extension. Ensure the Extension ID is correct and extension is running.");
            }
          }, 2000); // 2s timeout

          chrome.runtime.sendMessage(EXTENSION_ID, {
            type: "WALLET_SYNC",
            address,
            pubKey: pk
          }, (response) => {
            didRespond = true;
            clearTimeout(timeout);
            if (chrome.runtime.lastError) {
              console.error("❌ Sync Failed:", chrome.runtime.lastError.message);
              alert(`Extension Sync Error: ${chrome.runtime.lastError.message}. Ensure the Extension ID is correct.`);
            } else if (response?.success) {
              console.log("✅ Sync Confirmed by Extension");
            } else {
              console.warn("⚠️ Extension responded but did not confirm sync.", response);
            }
          });
        } else {
          console.warn("⚠️ Chrome API not found. If this is the web tab, ensure the extension is installed.");
        }
      }
    };
    syncWithExtension();
  }, [isConnected, address, account]);

  // Handle Delegate
  const handleDelegate = async (val?: string) => {
    const targetAmount = val || amount;
    if (!account || !targetAmount) return;
    setLoading(true);
    try {
      const amountInWei = uint256.bnToUint256(BigInt(Math.floor(parseFloat(targetAmount) * 10 ** 18)));
      const tx = [
        { contractAddress: STRK_TOKEN_ADDRESS, entrypoint: "approve", calldata: [VAULT_ADDRESS, amountInWei.low, amountInWei.high] },
        { contractAddress: VAULT_ADDRESS, entrypoint: "deposit", calldata: [amountInWei.low, amountInWei.high] }
      ];
      // If running in extension sidebar, send to extension
      if (window.location.origin.startsWith('chrome-extension://')) {
        sendSignTxToExtension(tx);
        setLoading(false);
        return;
      }
      // Otherwise, execute directly
      const { transaction_hash } = await account.execute(tx);
      setTxHash(transaction_hash);
    } catch (e) { alert("Transaction Failed"); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto p-8 rounded-2xl glass-effect border border-emerald-500/20 bg-emerald-900/10">
      <h2 className="text-3xl font-bold text-emerald-300 text-center mb-8">Vault Stake</h2>
      {!isConnected ? (
        <div className="flex flex-col gap-3">
          {connectors.map((c) => (
            <button key={c.id} onClick={() => connect({ connector: c })} className="flex items-center justify-center gap-3 p-4 rounded-xl bg-emerald-500 text-slate-900 font-bold">
              Connect {c.name}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-900/40 border border-emerald-500/10">
            <div className="text-xs text-emerald-300/60 uppercase font-bold mb-1">Address</div>
            <div className="text-emerald-100 font-mono text-xs truncate">{address}</div>
            {pubKey && <div className="text-[10px] text-emerald-100/40 mt-2 italic truncate">PK: {pubKey}</div>}
          </div>
          <input type="number" placeholder="Amount (STRK)" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-4 rounded-xl bg-slate-900/60 border border-emerald-500/20 text-white outline-none" />
          <button onClick={() => handleDelegate()} disabled={loading} className="w-full py-4 rounded-xl bg-emerald-500 text-slate-900 font-bold">
            {loading ? 'Processing...' : 'Delegate'}
          </button>
          <button onClick={() => disconnect()} className="w-full text-xs text-rose-400/50 hover:text-rose-400 uppercase tracking-widest">Disconnect</button>
        </div>
      )}
    </div>
  );
}