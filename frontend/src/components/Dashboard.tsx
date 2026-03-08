import React, { useState, useEffect, useRef } from 'react';
import { useAccount, useBalance } from "@starknet-react/core";
import WalletPage from '../WalletPage';
import { Zap, Flame, Brain, TrendingUp, Lock, RotateCcw, History, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';
import Progress from './ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Contract, uint256, RpcProvider, type Abi } from 'starknet';
import GravityVaultAbiJson from '../abi/GravityVault.json';
import { executeDepositWithWallet, confirmDepositExecution } from '../lib/walletExecute';
import { PendingDepositsCard } from './PendingDepositsCard';

// Extract just the ABI from the compiled contract JSON
const GRAVITY_VAULT_ABI = (GravityVaultAbiJson as any).abi as Abi;
const STRK_TOKEN_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const DEFAULT_VAULT_ADDRESS = "0x07b39de5a2105f65e9103098a89b0e4c47cae47b2ed4f4012c63d0af61ec416e";
const VAULT_ADDRESS = (import.meta.env.VITE_VAULT_ADDRESS || DEFAULT_VAULT_ADDRESS).trim();
const RPC_URL = (import.meta.env.VITE_STARKNET_RPC || "https://starknet-sepolia.public.blastapi.io").trim();
const ENABLE_CLIENT_SCORE_TRANSFERS = false;

interface Transaction {
  txHash: string;
  amount: number;
  timestamp: string;
  type: string;
  status: string;
}

interface ScoreTransferResult {
  success: boolean;
  txHash?: string;
  error?: string;
  message?: string;
}

interface DashboardProps {
  brainrotScore: number;
  syncAddress: string | null;
  delegatedAmount?: number; // User's delegation allowance in wallet
  hasDelegated?: boolean;
  userEmail?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ brainrotScore, syncAddress, delegatedAmount = 0, hasDelegated, userEmail }) => {
  const { isConnected, address, account } = useAccount();
  const [displayScore, setDisplayScore] = useState<number>(brainrotScore);
  const [vaultBalance, setVaultBalance] = useState<number>(0); // Current vault balance (what's been deposited)
  const [allowanceRemaining, setAllowanceRemaining] = useState<number>(delegatedAmount); // User's remaining allowance
  const [totalDelegatedFromDB, setTotalDelegatedFromDB] = useState<number>(0); // Total ever delegated (from DB)
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [scoreTransferError, setScoreTransferError] = useState<string | null>(null);
  const [scoreTransferPending, setScoreTransferPending] = useState<boolean>(false);
  const [lastScoreTransferTx, setLastScoreTransferTx] = useState<string | null>(null);
  const initialDelegatedAmountRef = useRef<number>(delegatedAmount);
  const lastPersistedAmountRef = useRef<number>(delegatedAmount); // Track remaining allowance
  const previousScoreBucketRef = useRef<number>(Math.floor(brainrotScore / 100));
  const isScoreTransferInFlightRef = useRef<boolean>(false);
  const isReconcilingZeroRef = useRef<boolean>(false);
  const lastZeroReconcileAtRef = useRef<number>(0);

  useEffect(() => {
    setAllowanceRemaining(delegatedAmount);
  }, [delegatedAmount]);

  // Fetch actual vault balance from smart contract
  useEffect(() => {
    const fetchVaultBalance = async () => {
      if (!syncAddress) {
        return;
      }

      setIsLoadingBalance(true);
      try {
        const rpcProvider = new RpcProvider({ nodeUrl: RPC_URL });
        
        console.log('[Dashboard] Fetching vault balance for:', syncAddress);
        console.log('[Dashboard] Vault address:', VAULT_ADDRESS);
        
        // Create contract instance from ABI
        const contract = new Contract({ abi: GRAVITY_VAULT_ABI, address: VAULT_ADDRESS, providerOrAccount: rpcProvider });
        
        // Call get_balance function
        const result = await (contract as any).get_balance(syncAddress);
        
        console.log('[Dashboard] RPC response:', result);

        // Parse u256 response - handle multiple formats
        let balance = 0;
        if (result) {
          let amountBigInt: bigint;
          
          // Check if result is already a BigInt
          if (typeof result === 'bigint') {
            amountBigInt = result;
          } else if (result.low !== undefined && result.high !== undefined) {
            // u256 with low/high components
            const low = BigInt(result.low ?? '0');
            const high = BigInt(result.high ?? '0');
            amountBigInt = low + (high << 128n);
          } else if (Array.isArray(result)) {
            // Array format [low, high]
            const low = BigInt(result[0] ?? '0');
            const high = BigInt(result[1] ?? '0');
            amountBigInt = low + (high << 128n);
          } else {
            amountBigInt = BigInt('0');
          }
          
          balance = Number(amountBigInt) / 10 ** 18;
          console.log('[Dashboard] Parsed vault balance:', balance);
        }
        setVaultBalance(balance);
      } catch (error) {
        console.error('[Dashboard] Failed to fetch vault balance:', error);
        setVaultBalance(0);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchVaultBalance();
    // Refresh every 10 seconds
    const interval = setInterval(fetchVaultBalance, 10000);
    return () => clearInterval(interval);
  }, [syncAddress]);

  // Fetch transaction history from backend
  useEffect(() => {
    const fetchHistory = async () => {
      if (!syncAddress) return;

      setIsLoadingHistory(true);
      try {
        const response = await fetch(`http://localhost:3333/api/delegate/history/${syncAddress}?limit=10`);
        if (response.ok) {
          const data = await response.json();
          setTotalDelegatedFromDB(data.totalDelegated || 0);
          setTransactions(data.transactions || []);
        }
      } catch (error) {
        console.error('[Dashboard] Failed to fetch transaction history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
    // Refresh every 15 seconds
    const interval = setInterval(fetchHistory, 15000);
    return () => clearInterval(interval);
  }, [syncAddress]);

  // Log current state
  useEffect(() => {
    // This space is intentionally left blank after removing console.logs
  }, [syncAddress, delegatedAmount, vaultBalance, allowanceRemaining, hasDelegated]);

  useEffect(() => {
    if (displayScore !== brainrotScore) {
      const timer = setTimeout(() => {
        setDisplayScore((prev) => {
          if (prev < brainrotScore) return prev + 1;
          if (prev > brainrotScore) return prev - 1;
          return prev;
        });
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [brainrotScore, displayScore]);

  const executeRequiredDeposit = async (userAddressToUse: string, requiredDeposit: number): Promise<string | null> => {
    if (requiredDeposit <= 0) {
      return null;
    }

    // Prefer starknet-react account execution (more reliable than window provider APIs).
    if (account) {
      const amountInWei = uint256.bnToUint256(BigInt(Math.floor(requiredDeposit * 10 ** 18)));
      const txResponse = await account.execute([
        {
          contractAddress: STRK_TOKEN_ADDRESS,
          entrypoint: 'approve',
          calldata: [VAULT_ADDRESS, amountInWei.low, amountInWei.high],
        },
        {
          contractAddress: VAULT_ADDRESS,
          entrypoint: 'deposit',
          calldata: [amountInWei.low, amountInWei.high],
        },
      ]);

      const txHash = (txResponse as any)?.transaction_hash || '';
      if (txHash) {
        await confirmDepositExecution(userAddressToUse, txHash);
        return txHash;
      }
    }

    // Legacy fallback for environments that still expose wallet_invokeFunction.
    const tx = await executeDepositWithWallet(
      userAddressToUse,
      VAULT_ADDRESS,
      STRK_TOKEN_ADDRESS,
      requiredDeposit,
      GRAVITY_VAULT_ABI
    );

    if (tx?.transactionHash) {
      await confirmDepositExecution(userAddressToUse, tx.transactionHash);
      return tx.transactionHash;
    }

    return null;
  };

  // Tokenomics rule:
  // - every +100 score: deduct 0.01 STRK from vault using slash()
  // - every -100 score: refund 0.01 STRK to user using transfer()
  useEffect(() => {
    if (!ENABLE_CLIENT_SCORE_TRANSFERS) {
      return;
    }

    const currentBucket = Math.floor(brainrotScore / 100);
    const previousBucket = previousScoreBucketRef.current;

    if (currentBucket === previousBucket) {
      return;
    }

    const bucketDelta = currentBucket - previousBucket;
    const scoreChange = Math.abs(bucketDelta) * 500;

    console.log(`[Dashboard] Score bucket change detected: ${previousBucket} → ${currentBucket} (delta: ${bucketDelta}, change: ${scoreChange})`);

    previousScoreBucketRef.current = currentBucket;

    // Use syncAddress for extension context, fall back to address for web
    const userAddressToUse = syncAddress || address;

    // Only process if address is available
    if (!userAddressToUse) {
      console.log('[Dashboard] Score bucket changed but no address available yet');
      return;
    }

    // Determine if this is a deduction (score increased) or refund (score decreased)
    // bucketDelta > 0 means score increased, < 0 means score decreased
    const isScoreIncrease = bucketDelta > 0;
    const isScoreDecrease = bucketDelta < 0;

    console.log(`[Dashboard] isScoreIncrease: ${isScoreIncrease}, isScoreDecrease: ${isScoreDecrease}, bucketDelta: ${bucketDelta}`);

    const processScoreTransfer = async () => {
      if (isScoreTransferInFlightRef.current) {
        return;
      }
      isScoreTransferInFlightRef.current = true;
      setScoreTransferPending(true);
      setScoreTransferError(null);

      try {
        const endpoint = isScoreIncrease ? '/api/score-transfer/deduct' : '/api/score-transfer/refund';
        const payload = isScoreIncrease 
          ? { userAddress: userAddressToUse, scoreIncrease: scoreChange }
          : { userAddress: userAddressToUse, scoreDecrease: scoreChange };

        console.log(`[Dashboard] Processing ${isScoreIncrease ? 'deduction' : 'refund'} for score change of ${scoreChange}. Endpoint: ${endpoint}`, payload);

        const response = await fetch(`http://localhost:3333${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          const requiredDeposit = Number(data?.requiredDeposit || 0);
          const needsWalletDeposit = !isScoreIncrease && data?.error === 'REFUND_REQUIRES_DEPOSIT' && requiredDeposit > 0;

          if (needsWalletDeposit) {
            const txHash = await executeRequiredDeposit(userAddressToUse, requiredDeposit);
            if (txHash) {
              setLastScoreTransferTx(txHash);
              console.log(`[Dashboard] ✅ Refund fallback deposit successful! TX: ${txHash}`);
              return;
            }
          }

          const errorMsg = data.message || data.error || 'Unknown error';
          setScoreTransferError(errorMsg);
          console.error(`[Dashboard] Score transfer failed:`, errorMsg);
          return;
        }

        setLastScoreTransferTx(data.txHash);
        console.log(`[Dashboard] ✅ Score ${isScoreIncrease ? 'deduction' : 'refund'} successful! TX: ${data.txHash}`);

      } catch (error: any) {
        const errorMsg = error.message || 'Network or server error';
        setScoreTransferError(errorMsg);
        console.error('[Dashboard] Score transfer error:', error);
      } finally {
        isScoreTransferInFlightRef.current = false;
        setScoreTransferPending(false);
      }
    };

    processScoreTransfer();
  }, [brainrotScore, address, syncAddress]);

  const reconcileToTargetBalance = async (targetBalance: number = 1): Promise<boolean> => {
    const userAddressToUse = syncAddress || address;
    if (!userAddressToUse) {
      return false;
    }

    if (isReconcilingZeroRef.current) {
      return false;
    }

    isReconcilingZeroRef.current = true;
    setScoreTransferPending(true);
    setScoreTransferError(null);

    try {
      const response = await fetch('http://localhost:3333/api/score-transfer/reconcile-zero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: userAddressToUse, targetBalance }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        const requiredDeposit = Number(data?.requiredDeposit || 0);
        const needsWalletDeposit = data?.error === 'RECONCILE_NOT_SUPPORTED' && requiredDeposit > 0;

        if (needsWalletDeposit) {
          const txHash = await executeRequiredDeposit(userAddressToUse, requiredDeposit);
          if (txHash) {
            setLastScoreTransferTx(txHash);
            lastZeroReconcileAtRef.current = Date.now();
            return true;
          }
        }

        const errorMsg = data.message || data.error || 'Failed to reconcile vault balance';
        setScoreTransferError(errorMsg);
        return false;
      }

      if (data.txHash) {
        setLastScoreTransferTx(data.txHash);
      }

      lastZeroReconcileAtRef.current = Date.now();
      return true;
    } catch (error: any) {
      const errorMsg = error?.message || 'Network error during reconciliation';
      setScoreTransferError(errorMsg);
      return false;
    } finally {
      isReconcilingZeroRef.current = false;
      setScoreTransferPending(false);
    }
  };

  // Keep vault balance at 1 STRK baseline whenever score is 0.
  useEffect(() => {
    const userAddressToUse = syncAddress || address;
    if (!userAddressToUse) {
      return;
    }

    if (brainrotScore !== 0) {
      return;
    }

    // Avoid rapid repeated reconcile calls while chain state updates.
    const now = Date.now();
    if (now - lastZeroReconcileAtRef.current < 15000) {
      return;
    }

    if (vaultBalance < 0.9999 || vaultBalance > 1.0001) {
      reconcileToTargetBalance(1);
    }
  }, [brainrotScore, vaultBalance, syncAddress, address]);



  // AUTHORIZATION GATE: Must have address AND >= 1 STRK allowance remaining
  const isAuthorized = !!syncAddress && allowanceRemaining >= 1;

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-6 animate-in fade-in">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
          <Lock className="w-10 h-10 text-emerald-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-white uppercase tracking-tighter">Vault Access Required</h2>
          <p className="text-[10px] text-emerald-500/60 leading-relaxed uppercase font-bold">
            Stake 1.00+ STRK to unlock neural analytics
          </p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/10 w-full shadow-inner">
          <p className="text-[9px] text-emerald-500/40 uppercase font-black mb-1 tracking-widest">Current Allowance</p>
          <p className="text-lg font-mono font-bold text-white">
            {isLoadingBalance ? '...' : allowanceRemaining.toFixed(2)} / 1.00 STRK
          </p>
        </div>
        <a 
          href="http://localhost:5174" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="w-full py-3 bg-emerald-500 text-slate-950 font-black rounded-xl hover:bg-emerald-400 transition-all uppercase text-xs"
        >
          Open Portal
        </a>
      </div>
    );
  }

  // --- FINAL VIEW: Brainrot Score ---
  const getStatus = (score: number) => {
    if (score >= 8000) return { label: "Peak Brainrot", color: "text-red-500", icon: <Flame className="animate-pulse" /> };
    if (score >= 5000) return { label: "Doomscrolling", color: "text-orange-500", icon: <Zap className="animate-bounce" /> };
    return { label: "Mind Sharp", color: "text-emerald-400", icon: <Brain /> };
  };
  const status = getStatus(displayScore);
  const percentage = Math.min((displayScore / 10000) * 100, 100);

  const handleResetScore = async () => {
    if (!window.confirm('Reset brainrot score to 0?')) {
      return;
    }

    chrome.storage.local.set({
      realtime_stats: {
        brainrotScore: 0,
        screenTimeMinutes: 0
      }
    }, async () => {
      // After reset, normalize vault balance to baseline 1.00 STRK.
      const ok = await reconcileToTargetBalance(1);
      if (!ok && !window.confirm('Could not reconcile vault balance to 1.00 STRK. Continue anyway?')) {
        return;
      }

      // Force UI update
      window.location.reload();
    });
  };

  // Responsive grid: 1 column for popup, 2 columns for webapp
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Row - Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Neural Load Card */}
        <div className="flex flex-col items-center text-center space-y-1 py-4 bg-slate-900/40 rounded-2xl border border-emerald-500/10">
          <h2 className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-500/50">Neural Load</h2>
          <div className={`text-7xl font-black tracking-tighter tabular-nums ${status.color}`}>{displayScore.toLocaleString()}</div>
          <div className={`flex items-center gap-2 text-xs font-bold uppercase ${status.color}`}>{status.icon} {status.label}</div>
          <button
            onClick={handleResetScore}
            className="mt-3 px-3 py-1 text-[9px] font-bold uppercase rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-1 text-slate-400 hover:text-slate-200"
            title="Reset score to 0"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        </div>
        {/* Stats/Progress Card */}
        <Card className="border-emerald-500/20 bg-slate-900/40 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-mono text-slate-400 flex justify-between">
              <span>Progress</span>
              <span className="text-emerald-500">{Math.round(percentage)}%</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={percentage} className="h-2 bg-slate-950 border border-emerald-500/10" />
            <div className="flex justify-between text-[9px] font-mono text-slate-500">
              <span className="flex items-center gap-1"><TrendingUp size={10} className="text-red-500"/> +8 pts/sec</span>
              <span>-200 pts/min decay</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row - Delegation Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Vault Balance */}
        <Card className="border-emerald-500/20 bg-slate-900/40 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
              Vault Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-400 tabular-nums">
              {isLoadingBalance ? '...' : vaultBalance.toFixed(4)} STRK
            </div>
            <p className="text-[9px] text-slate-500 mt-1 font-mono">Deposited to vault</p>
          </CardContent>
        </Card>

        {/* Remaining Allowance */}
        <Card className="border-emerald-500/20 bg-slate-900/40 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
              Allowance Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-400 tabular-nums">
              {allowanceRemaining.toFixed(4)} STRK
            </div>
            <p className="text-[9px] text-slate-500 mt-1 font-mono">Can still deposit</p>
            <a
              href={`http://localhost:5174?email=${encodeURIComponent(userEmail || '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex mt-3 px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors"
            >
              Delegate More
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Pending Deposits Alert */}
      {address && <PendingDepositsCard userAddress={address} />}

      {/* Score Transfer Status Alert */}
      {scoreTransferPending && (
        <Card className="border-yellow-500/30 bg-yellow-500/5 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-mono text-yellow-400 uppercase tracking-widest flex items-center gap-2">
              <span className="animate-spin">⚡</span>
              Processing Score Transfer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[9px] text-yellow-300 font-mono">Executing 0.01 STRK transaction...</p>
          </CardContent>
        </Card>
      )}

      {scoreTransferError && (
        <Card className="border-red-500/30 bg-red-500/5 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-mono text-red-400 uppercase tracking-widest flex items-center gap-2">
              <AlertCircle size={12} />
              Transfer Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[9px] text-red-300 font-mono break-words">{scoreTransferError}</p>
          </CardContent>
        </Card>
      )}

      {lastScoreTransferTx && !scoreTransferPending && !scoreTransferError && (
        <Card className="border-emerald-500/30 bg-emerald-500/5 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle size={12} />
              Latest Transfer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-emerald-300 font-mono break-words">
                {lastScoreTransferTx.slice(0, 12)}...{lastScoreTransferTx.slice(-8)}
              </span>
              <a
                href={`https://sepolia.voyager.online/tx/${lastScoreTransferTx}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 transition-colors"
                title="View on Voyager"
              >
                <ExternalLink size={12} />
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom Row - Transaction History */}
      <Card className="border-emerald-500/20 bg-slate-900/40 backdrop-blur-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-[10px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <History size={12} />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="text-center py-4 text-slate-500 text-xs">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-4 text-slate-500 text-xs">No transactions yet</div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx, idx) => {
                const statusColor = 
                  tx.status === 'success' ? 'text-emerald-400' :
                  tx.status === 'pending' ? 'text-yellow-400' :
                  tx.status === 'reverted' ? 'text-red-400' :
                  'text-slate-400';
                
                const statusBg = 
                  tx.status === 'success' ? 'bg-emerald-500/10' :
                  tx.status === 'pending' ? 'bg-yellow-500/10' :
                  tx.status === 'reverted' ? 'bg-red-500/10' :
                  'bg-slate-500/10';

                return (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-3 bg-slate-950/50 rounded-lg border border-emerald-500/5 hover:border-emerald-500/20 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold uppercase ${statusColor}`}>{tx.type}</span>
                        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${statusBg} ${statusColor}`}>
                          {tx.status}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {new Date(tx.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-slate-400">
                          {tx.txHash.slice(0, 8)}...{tx.txHash.slice(-6)}
                        </span>
                        {tx.status === 'success' && (
                          <a
                            href={`https://sepolia.voyager.online/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-500 hover:text-emerald-400 transition-colors"
                            title="View on Voyager"
                          >
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-white tabular-nums">
                        {tx.amount.toFixed(4)} STRK
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;