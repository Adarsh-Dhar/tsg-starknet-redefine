import { useState, useEffect } from 'react';
import { GRAVITY_VAULT_ABI } from './abi';
import { Wallet, ArrowUpRight, ArrowDownLeft, ExternalLink } from 'lucide-react';
import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { uint256 } from 'starknet';

// Constants for your deployed setup
const VAULT_ADDRESS = "0x4a05d15f240be02f13ef2e09349a668f2faa7942cbde11008b737111c9351f3";
const STRK_TOKEN_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

export default function WalletPage() {
  const { address, account, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [pubKey, setPubKey] = useState('');

  // Fetch Public Key once account is connected
  useEffect(() => {
    const getPub = async () => {
      if (account && !pubKey) {
        try {
          // Only call getPubKey if signer exists and is valid
          if (account.signer && typeof account.signer.getPubKey === 'function') {
            const pk = await account.signer.getPubKey();
            // Only set if pk is valid, not zero, and not an error
            if (pk && pk !== '0' && pk !== undefined && pk !== null && !pk.toString().startsWith('Error')) {
              setPubKey(pk);
            } else {
              // Skip setting pubKey if invalid
              console.warn("PubKey fetch skipped: invalid or zero private key.");
            }
          }
        } catch (e) {
          // Only log if error is not the known zero private key error
          if (!(e instanceof Error) || !e.message?.includes('expected valid private key')) {
            console.error("PubKey error:", e);
          } else {
            console.warn("PubKey fetch skipped: invalid private key.");
          }
        }
      }
    };
    getPub();
  }, [account, pubKey]);

  const handleDelegate = async () => {
    if (!account || !amount) return;
    setLoading(true);
    setTxHash('');

    try {
      const amountInWei = uint256.bnToUint256(BigInt(Math.floor(parseFloat(amount) * 10 ** 18)));

      // Multicall: Approve + Deposit
      const { transaction_hash } = await account.execute([
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

      setTxHash(transaction_hash);
      setAmount('');
    } catch (error) {
      console.error("Delegation failed:", error);
      alert("Delegation failed. Check if you are on Sepolia.");
    } finally {
      setLoading(false);
    }
  };

  const handleUndelegate = async () => {
    if (!account || !amount) return;
    setLoading(true);

    try {
      const amountInWei = uint256.bnToUint256(BigInt(Math.floor(parseFloat(amount) * 10 ** 18)));
      const { transaction_hash } = await account.execute([
        {
          contractAddress: VAULT_ADDRESS,
          entrypoint: "reclaim",
          calldata: [amountInWei.low, amountInWei.high]
        }
      ]);
      setTxHash(transaction_hash);
      setAmount('');
    } catch (error) {
      console.error("Undelegate failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-8 rounded-2xl glass-effect glass-glow border border-emerald-500/20 bg-emerald-900/10 shadow-2xl flex flex-col items-center space-y-8 text-emerald-50">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-emerald-300 mb-2">Vault Stake</h2>
        <p className="text-emerald-400/60 text-sm">Lock STRK to start Touching Grass</p>
      </div>

      {!isConnected ? (
        <div className="flex flex-col gap-3 w-full">
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => connect({ connector })}
              className="flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-emerald-500 text-slate-900 font-bold text-lg hover:bg-emerald-400 transition-all active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              <Wallet className="w-6 h-6" />
              Connect {connector.name}
            </button>
          ))}
        </div>
      ) : (
        <div className="w-full space-y-6">
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-emerald-500/10 flex justify-between items-center overflow-hidden">
              <span className="text-emerald-300/60 text-xs uppercase font-bold tracking-widest">Address</span>
              <span className="text-emerald-100 font-mono text-xs truncate ml-4">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </div>
            {pubKey && (
              <div className="p-4 rounded-xl bg-slate-900/40 border border-emerald-500/10 flex justify-between items-center overflow-hidden">
                <span className="text-emerald-300/60 text-xs uppercase font-bold tracking-widest">PubKey</span>
                <span className="text-emerald-100 font-mono text-[10px] opacity-60 truncate ml-4 italic">
                  {pubKey}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-emerald-300/40 uppercase ml-1">Stake Amount (STRK)</label>
            <input
              type="number"
              placeholder="0.00"
              className="w-full px-5 py-4 rounded-xl bg-slate-900/60 border border-emerald-500/20 text-emerald-100 text-xl focus:ring-2 focus:ring-emerald-500/40 outline-none transition-all"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleDelegate}
              disabled={loading || !amount}
              className="flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-500 text-slate-900 font-bold hover:bg-emerald-400 disabled:opacity-30 transition-all"
            >
              <ArrowUpRight className="w-5 h-5" />
              {loading ? 'Sending...' : 'Delegate'}
            </button>
            <button
              onClick={handleUndelegate}
              disabled={loading || !amount}
              className="flex items-center justify-center gap-2 py-4 rounded-xl bg-slate-800 text-emerald-400 font-bold border border-emerald-500/20 hover:bg-slate-700 transition-all"
            >
              <ArrowDownLeft className="w-5 h-5" />
              Undelegate
            </button>
          </div>

          <div className="flex flex-col items-center gap-4">
            {txHash && (
              <a
                href={`https://sepolia.voyager.online/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-emerald-400/80 text-xs hover:text-emerald-300 transition-colors underline decoration-emerald-500/30"
              >
                Track on Voyager <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button 
              onClick={() => disconnect()}
              className="text-xs text-rose-400/50 hover:text-rose-400 font-bold tracking-widest uppercase transition-colors"
            >
              Disconnect Wallet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}