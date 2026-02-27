import { useState, useEffect } from 'react';
import { GRAVITY_VAULT_ABI } from './abi';
import { Wallet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { uint256, Contract, Abi } from 'starknet';

const VAULT_ADDRESS = "0x0602c5436e8dc621d2003f478d141a76b27571d29064fbb9786ad21032eb4769";
const STRK_TOKEN_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const EXTENSION_ID = "khehdcnoacelhjahplhodneiomdlbmed"; 

interface WalletPageProps {
  minimal?: boolean;
}

export default function WalletPage({ minimal = false }: WalletPageProps) {
  const { address, account, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  // Removed pubKey state, not needed for sidebar sync
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  const syncWithExtension = async () => {
    if (!isConnected || !address || !account) return;
    setSyncStatus('syncing');
    console.log("WalletPage: Starting Sync...");

    try {
      // 1. Fetch Public Key directly via high-level contract call
      const accountAbi: Abi = [
        { name: "get_public_key", type: "function", inputs: [], outputs: [{ name: "pk", type: "felt" }], state_mutability: "view" },
        { name: "getPublicKey", type: "function", inputs: [], outputs: [{ name: "pk", type: "felt" }], state_mutability: "view" }
      ];
      const contract = new Contract({
        abi: accountAbi,
        address: address,
        providerOrAccount: account
      });
      let fetchedPk = "";
      try {
        const res = await contract.get_public_key();
        fetchedPk = res.toString();
      } catch (e) {
        const res = await contract.getPublicKey();
        fetchedPk = res.toString();
      }
      console.log("WalletPage: PK Found:", fetchedPk);

      // 2. Sync with Sidebar via Message
      if (window.chrome && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage(EXTENSION_ID, {
          type: "WALLET_SYNC",
          address: address,
          pubKey: fetchedPk
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Sync Failed:", chrome.runtime.lastError.message);
            setSyncStatus('error');
          } else {
            console.log("✅ Sync Success acknowledged by sidebar");
            setSyncStatus('success');
          }
        });
      } else {
        setSyncStatus('success');
      }
    } catch (err) {
      console.error("❌ Fatal Sync Error:", err);
      setSyncStatus('error');
    }
  };

  // Trigger sync when connection changes
  useEffect(() => {
    if (isConnected && address) {
      syncWithExtension();
    }
  }, [isConnected, address]);

  // Manual re-trigger sync
  const handleCheckConnection = () => {
    syncWithExtension();
  };

  const handleDelegate = async () => {
    if (!account || !amount) return;
    setLoading(true);
    try {
      const amountInWei = uint256.bnToUint256(BigInt(Math.floor(parseFloat(amount) * 10 ** 18)));
      await account.execute([
        { 
          contractAddress: STRK_TOKEN_ADDRESS, 
          entrypoint: "approve", 
          calldata: [VAULT_ADDRESS, amountInWei.low, amountInWei.high] 
        },
        { 
          contractAddress: VAULT_ADDRESS, 
          entrypoint: "deposit", 
          calldata: [amountInWei.low, amountInWei.high] 
        }
      ]);
    } catch (e) {
      console.error("Delegate error:", e);
      alert("Transaction Failed");
    } finally {
      setLoading(false);
    }
  };

  return minimal ? (
    !isConnected ? (
      <div className="space-y-3">
        {connectors.map((c) => (
          <button 
            key={c.id} 
            onClick={() => connect({ connector: c })} 
            className="w-full p-4 rounded-xl bg-emerald-500 text-slate-900 font-bold hover:bg-emerald-400 transition-all active:scale-[0.98]"
          >
            Connect {c.name}
          </button>
        ))}
      </div>
    ) : (
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-emerald-500/10">
          <div className="text-[10px] text-emerald-400/50 uppercase font-bold mb-1">Sidebar Sync Status</div>
          <div className="flex items-center gap-2 text-xs">
            {syncStatus === 'success' ? (
              <><CheckCircle2 className="w-4 h-4 text-emerald-400" /> <span className="text-emerald-400">Synced & Active</span></>
            ) : syncStatus === 'error' ? (
              <><AlertCircle className="w-4 h-4 text-rose-400" /> <span className="text-rose-400">Connection Failed</span></>
            ) : (
              <><div className="w-3 h-3 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /> <span className="text-emerald-300/60">Linking with Sidebar...</span></>
            )}
            <button
              className="ml-2 px-2 py-1 text-[10px] rounded bg-emerald-700/30 text-emerald-200 hover:bg-emerald-700/60 transition"
              onClick={handleCheckConnection}
              disabled={syncStatus === 'syncing'}
            >
              Check Connection
            </button>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="text-[9px] text-white/30 uppercase font-bold mb-1 tracking-tighter">Your Address</div>
            <div className="text-[10px] font-mono text-emerald-100/60 truncate">{address}</div>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] text-emerald-300/40 uppercase font-bold ml-1">Stake Amount</label>
          <input 
            type="number" 
            placeholder="Amount (STRK)" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            className="w-full p-4 rounded-xl bg-slate-900/60 border border-emerald-500/20 text-white outline-none focus:border-emerald-400 transition-colors" 
          />
        </div>
        <button 
          onClick={handleDelegate} 
          disabled={loading || !amount} 
          className="w-full py-4 rounded-xl bg-emerald-500 text-slate-900 font-bold disabled:opacity-30 transition-all hover:brightness-110"
        >
          {loading ? 'Processing Transaction...' : 'Delegate to Vault'}
        </button>
        <button onClick={() => disconnect()} className="w-full text-[10px] text-rose-400/40 hover:text-rose-400 uppercase tracking-widest mt-2 py-2">
          Disconnect Wallet
        </button>
      </div>
    )
  ) : (
    <div className="max-w-md mx-auto p-6 rounded-2xl glass-effect border border-emerald-500/20 bg-emerald-900/5">
      <h2 className="text-2xl font-bold text-emerald-400 text-center mb-6 flex items-center justify-center gap-2">
        <Wallet className="w-6 h-6" /> Vault Management
      </h2>
      {!isConnected ? (
        <div className="space-y-3">
          {connectors.map((c) => (
            <button 
              key={c.id} 
              onClick={() => connect({ connector: c })} 
              className="w-full p-4 rounded-xl bg-emerald-500 text-slate-900 font-bold hover:bg-emerald-400 transition-all active:scale-[0.98]"
            >
              Connect {c.name}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-emerald-500/10">
            <div className="text-[10px] text-emerald-400/50 uppercase font-bold mb-1">Sidebar Sync Status</div>
            <div className="flex items-center gap-2 text-xs">
              {syncStatus === 'success' ? (
                <><CheckCircle2 className="w-4 h-4 text-emerald-400" /> <span className="text-emerald-400">Synced & Active</span></>
              ) : syncStatus === 'error' ? (
                <><AlertCircle className="w-4 h-4 text-rose-400" /> <span className="text-rose-400">Connection Failed</span></>
              ) : (
                <><div className="w-3 h-3 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /> <span className="text-emerald-300/60">Linking with Sidebar...</span></>
              )}
              <button
                className="ml-2 px-2 py-1 text-[10px] rounded bg-emerald-700/30 text-emerald-200 hover:bg-emerald-700/60 transition"
                onClick={handleCheckConnection}
                disabled={syncStatus === 'syncing'}
              >
                Check Connection
              </button>
            </div>
            <div className="mt-3 pt-3 border-t border-white/5">
              <div className="text-[9px] text-white/30 uppercase font-bold mb-1 tracking-tighter">Your Address</div>
              <div className="text-[10px] font-mono text-emerald-100/60 truncate">{address}</div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-emerald-300/40 uppercase font-bold ml-1">Stake Amount</label>
            <input 
              type="number" 
              placeholder="Amount (STRK)" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              className="w-full p-4 rounded-xl bg-slate-900/60 border border-emerald-500/20 text-white outline-none focus:border-emerald-400 transition-colors" 
            />
          </div>
          <button 
            onClick={handleDelegate} 
            disabled={loading || !amount} 
            className="w-full py-4 rounded-xl bg-emerald-500 text-slate-900 font-bold disabled:opacity-30 transition-all hover:brightness-110"
          >
            {loading ? 'Processing Transaction...' : 'Delegate to Vault'}
          </button>
          <button onClick={() => disconnect()} className="w-full text-[10px] text-rose-400/40 hover:text-rose-400 uppercase tracking-widest mt-2 py-2">
            Disconnect Wallet
          </button>
        </div>
      )}
    </div>
  );
}