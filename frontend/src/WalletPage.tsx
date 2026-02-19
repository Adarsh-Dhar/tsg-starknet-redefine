import { useState, useEffect } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, ExternalLink } from 'lucide-react';
import { connect, disconnect } from '@starknet-io/get-starknet';
import { Contract, uint256 } from 'starknet';

// Constants for your deployed setup
const VAULT_ADDRESS = "0x0683bc21ada95e6c96ef268d5e28851ba6c029a743c97b6a368ec6a191bfae90";
const STRK_TOKEN_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

export default function WalletPage() {
  const [connection, setConnection] = useState<any>(null);
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');

  const handleConnect = async () => {
    try {
      const selectedWallet = await connect({
        modalMode: "alwaysAsk",
        modalTheme: "dark",
      });

      if (selectedWallet && selectedWallet.name) {
        setConnection(selectedWallet);
        console.log("Connected wallet:", selectedWallet.name);
        console.log("Account address:", selectedWallet);
        setAddress(selectedWallet.id);
      }
    } catch (error) {
      console.error("Braavos connection failed:", error);
    }
  };

  const handleDelegate = async () => {
    if (!connection || !amount) return;
    setLoading(true);
    setTxHash('');

    try {
      // 1. Format the amount to 18 decimals (STRK)
      const amountInWei = uint256.bnToUint256(BigInt(Math.floor(parseFloat(amount) * 10 ** 18)));

      // 2. Multicall: Bundle Approve and Deposit so user signs once
      const { transaction_hash } = await connection.account.execute([
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
      alert("Transaction failed. Make sure you have enough STRK and gas.");
    } finally {
      setLoading(false);
    }
  };

  const handleUndelegate = async () => {
    if (!connection) return;
    setLoading(true);

    try {
      const { transaction_hash } = await connection.account.execute({
        contractAddress: VAULT_ADDRESS,
        entrypoint: "reclaim",
        calldata: []
      });
      setTxHash(transaction_hash);
    } catch (error) {
      console.error("Undelegate failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-8 rounded-2xl glass-effect glass-glow border border-emerald-500/20 bg-emerald-900/10 shadow-2xl flex flex-col items-center space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-emerald-300 mb-2">Starknet Vault</h2>
        <p className="text-emerald-400/60 text-sm">Lock STRK to start Touching Grass</p>
      </div>

      {!connection ? (
        <button
          onClick={handleConnect}
          className="group relative flex items-center gap-3 px-8 py-4 rounded-xl bg-emerald-500 text-slate-900 font-bold text-lg hover:bg-emerald-400 transition-all active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
        >
          <Wallet className="w-6 h-6" />
          Connect Braavos
        </button>
      ) : (
        <div className="w-full space-y-6">
          <div className="p-4 rounded-xl bg-slate-900/40 border border-emerald-500/10 flex justify-between items-center">
            <span className="text-emerald-300/60 text-sm uppercase tracking-wider font-bold">Account</span>
            <span className="text-emerald-100 font-mono text-sm">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-emerald-300/40 uppercase ml-1">Amount (STRK)</label>
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
              disabled={loading}
              className="flex items-center justify-center gap-2 py-4 rounded-xl bg-slate-800 text-emerald-400 font-bold border border-emerald-500/20 hover:bg-slate-700 transition-all"
            >
              <ArrowDownLeft className="w-5 h-5" />
              Undelegate
            </button>
          </div>

          {txHash && (
            <a
              href={`https://sepolia.voyager.online/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 text-emerald-400/80 text-xs hover:text-emerald-300 transition-colors pt-2"
            >
              View on Voyager <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}