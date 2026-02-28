import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { Wallet, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { uint256 } from 'starknet';

// Use constants from your existing project
const VAULT_ADDRESS = "0x0602c5436e8dc621d2003f478d141a76b27571d29064fbb9786ad21032eb4769";
const STRK_TOKEN_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

function App() {
  const { address, account, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTransaction = async (type: 'delegate' | 'undelegate') => {
    if (!account || !amount) return;
    setLoading(true);
    try {
      const amountInWei = uint256.bnToUint256(BigInt(Math.floor(parseFloat(amount) * 10 ** 18)));
      
      const calls = type === 'delegate' ? [
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
      ] : [
        { 
          contractAddress: VAULT_ADDRESS, 
          entrypoint: "withdraw", 
          calldata: [amountInWei.low, amountInWei.high] 
        }
      ];

      await account.execute(calls);
    } catch (e) {
      console.error(`${type} error:`, e);
      alert("Transaction Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30">
      {/* Top Right Connect Button */}
      <nav className="absolute top-0 right-0 p-6">
        {!isConnected ? (
          connectors.map((connector) => (
            connector.id === 'braavos' && (
              <button
                key={connector.id}
                onClick={() => connect({ connector })}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-slate-950 rounded-xl font-bold hover:bg-emerald-400 transition-all active:scale-95"
              >
                <Wallet size={18} /> Connect Braavos
              </button>
            )
          ))
        ) : (
          <button 
            onClick={() => disconnect()}
            className="text-xs text-rose-400/60 hover:text-rose-400 uppercase tracking-widest transition-colors"
          >
            Disconnect {address?.slice(0, 6)}...
          </button>
        )}
      </nav>

      {/* Centered Delegation UI */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-[400px] p-8 rounded-3xl border border-emerald-500/20 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-emerald-400 tracking-tight">Gravity Vault</h1>
            <p className="text-slate-400 text-sm mt-1 font-mono">STARKNET DELEGATION</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] text-emerald-400/50 uppercase font-bold tracking-widest ml-1">
                Amount (STRK)
              </label>
              <input 
                type="number" 
                placeholder="0.00" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                className="w-full p-4 rounded-2xl bg-slate-950/50 border border-emerald-500/10 text-white text-xl font-bold outline-none focus:border-emerald-500/40 transition-all placeholder:text-slate-700" 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleTransaction('delegate')}
                disabled={loading || !isConnected || !amount}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 disabled:opacity-20 transition-all group"
              >
                <ArrowDownCircle className="group-hover:translate-y-0.5 transition-transform" />
                Delegate
              </button>
              
              <button 
                onClick={() => handleTransaction('undelegate')}
                disabled={loading || !isConnected || !amount}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-emerald-500/20 text-emerald-400 font-bold hover:bg-emerald-500/5 disabled:opacity-20 transition-all group"
              >
                <ArrowUpCircle className="group-hover:-translate-y-0.5 transition-transform" />
                Undelegate
              </button>
            </div>

            {!isConnected && (
              <p className="text-[10px] text-center text-rose-400/60 uppercase font-bold tracking-tighter">
                Please connect your wallet to interact
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;