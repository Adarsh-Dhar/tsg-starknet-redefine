import { useState, useEffect } from 'react';
import { GRAVITY_VAULT_ABI } from './abi';
import { Wallet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { uint256, Contract } from 'starknet';

const VAULT_ADDRESS = "0x0602c5436e8dc621d2003f478d141a76b27571d29064fbb9786ad21032eb4769";
const STRK_TOKEN_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const EXTENSION_ID = "khehdcnoacelhjahplhodneiomdlbmed"; // Ensure this matches your chrome://extensions ID

export default function WalletPage() {
  const { address, account, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [pubKey, setPubKey] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  const syncWithExtension = async () => {
    if (!isConnected || !address || !account) return;
    
    setSyncStatus('syncing');
    try {
      // 1. Fetch Public Key via Contract Call (Bypasses Private Key crash)
      const accountAbi = [
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
        const res = await contract.call("get_public_key");
        fetchedPk = res.toString();
      } catch {
        const res = await contract.call("getPublicKey");
        fetchedPk = res.toString();
      }

      setPubKey(fetchedPk);

      // 2. Message the Extension
      if (window.chrome && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage(EXTENSION_ID, {
          type: "WALLET_SYNC",
          address: address,
          pubKey: fetchedPk
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Sync Error:", chrome.runtime.lastError.message);
            setSyncStatus('error');
          } else {
            console.log("✅ Sidebar synced");
            setSyncStatus('success');
          }
        });
      }
    } catch (e) {
      console.error("❌ Failed to fetch PK:", e);
      setSyncStatus('error');
    }
  };

  useEffect(() => {
    if (isConnected) syncWithExtension();
  }, [isConnected, address]);

  const handleDelegate = async () => {
    if (!account || !amount) return;
    setLoading(true);
    try {
      const amountInWei = uint256.bnToUint256(BigInt(Math.floor(parseFloat(amount) * 10 ** 18)));
      await account.execute([
        { contractAddress: STRK_TOKEN_ADDRESS, entrypoint: "approve", calldata: [VAULT_ADDRESS, amountInWei.low, amountInWei.high] },
        { contractAddress: VAULT_ADDRESS, entrypoint: "deposit", calldata: [amountInWei.low, amountInWei.high] }
      ]);
    } catch (e) {
      alert("Tx Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 rounded-2xl glass-effect border border-emerald-500/20 bg-emerald-900/5">
      <h2 className="text-2xl font-bold text-emerald-400 text-center mb-6 flex items-center justify-center gap-2">
        <Wallet className="w-6 h-6" /> Vault Management
      </h2>

      {!isConnected ? (
        <div className="space-y-3">
          {connectors.map((c) => (
            <button key={c.id} onClick={() => connect({ connector: c })} className="w-full p-4 rounded-xl bg-emerald-500 text-slate-900 font-bold hover:bg-emerald-400 transition-all">
              Connect {c.name}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-emerald-500/10">
            <div className="text-[10px] text-emerald-400/50 uppercase font-bold mb-1">Status</div>
            <div className="flex items-center gap-2 text-xs">
              {syncStatus === 'success' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <AlertCircle className="w-3 h-3 text-yellow-500" />}
              <span className={syncStatus === 'success' ? 'text-emerald-400' : 'text-yellow-500'}>
                {syncStatus === 'success' ? 'Synced with Sidebar' : 'Syncing...'}
              </span>
            </div>
            <div className="mt-3 text-[10px] font-mono text-emerald-100/40 truncate">ADDR: {address}</div>
          </div>

          <input 
            type="number" 
            placeholder="Amount (STRK)" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            className="w-full p-4 rounded-xl bg-slate-900/60 border border-emerald-500/20 text-white outline-none focus:border-emerald-400 transition-colors" 
          />
          
          <button onClick={handleDelegate} disabled={loading} className="w-full py-4 rounded-xl bg-emerald-500 text-slate-900 font-bold disabled:opacity-50">
            {loading ? 'Processing...' : 'Delegate to Vault'}
          </button>
          
          <button onClick={() => disconnect()} className="w-full text-[10px] text-rose-400/40 hover:text-rose-400 uppercase tracking-widest mt-2">
            Disconnect Wallet
          </button>
        </div>
      )}
    </div>
  );
}