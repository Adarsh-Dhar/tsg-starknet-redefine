import React, { useState, useEffect, useRef } from 'react';
import { useAccount, useBalance } from "@starknet-react/core";
import WalletPage from '../WalletPage';
import { Zap, Flame, Brain, TrendingUp, Lock, RotateCcw } from 'lucide-react';
import Progress from './ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Contract, uint256, RpcProvider, type Abi } from 'starknet';
import GravityVaultAbiJson from '../abi/GravityVault.json';

// Extract just the ABI from the compiled contract JSON
const GRAVITY_VAULT_ABI = (GravityVaultAbiJson as any).abi as Abi;
const STRK_TOKEN_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const VAULT_ADDRESS = "0x0602c5436e8dc621d2003f478d141a76b27571d29064fbb9786ad21032eb4769";
const RPC_URL = "https://starknet-sepolia.public.blastapi.io";

interface DashboardProps {
  brainrotScore: number;
  syncAddress: string | null;
  delegatedAmount?: number;
  hasDelegated?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ brainrotScore, syncAddress, delegatedAmount = 0, hasDelegated }) => {
  const { isConnected, address } = useAccount();
  const [displayScore, setDisplayScore] = useState<number>(brainrotScore);
  const [contractDelegatedAmount, setContractDelegatedAmount] = useState<number>(delegatedAmount);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const initialDelegatedAmountRef = useRef<number>(delegatedAmount);
  const lastPersistedAmountRef = useRef<number>(delegatedAmount);
  const previousScoreBucketRef = useRef<number>(Math.floor(brainrotScore / 100));

  // Fetch actual delegated amount from smart contract
  useEffect(() => {
    const fetchContractBalance = async () => {
      if (!syncAddress) {
        return;
      }

      // Check if we're in a Chrome extension context
      const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
      
      if (isExtension) {
        // In extension, only initialize once from the FIRST delegatedAmount prop received
        // Use ref to prevent re-initialization when prop updates from backend
        if (contractDelegatedAmount === delegatedAmount && initialDelegatedAmountRef.current === delegatedAmount) {
          // First initialization - store the initial amount
          setContractDelegatedAmount(delegatedAmount);
        }
        // If contractDelegatedAmount differs from current delegatedAmount prop, don't reset it
        // This allows tokenomics to control the value
        return;
      }

      setIsLoadingBalance(true);
      try {
        // Create standalone RPC provider (works in web app context)
        const rpcProvider = new RpcProvider({ nodeUrl: RPC_URL });
        
         const vault = new Contract({
          abi: GRAVITY_VAULT_ABI,
          address: VAULT_ADDRESS,
          providerOrAccount: rpcProvider
        });

        const result = await vault.get_balance(syncAddress);
        
        if (result) {
          const amountBigInt = uint256.uint256ToBN(result);
          const amount = Number(amountBigInt) / 10 ** 18;
          setContractDelegatedAmount(amount);
        }
      } catch (error) {
        console.error('[Dashboard] Failed to fetch contract balance (using database value):', error);
        // Fallback to database value on error
        setContractDelegatedAmount(delegatedAmount);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchContractBalance();
    // Refresh every 10 seconds (only in web app context)
    const interval = setInterval(fetchContractBalance, 10000);
    return () => clearInterval(interval);
  }, [syncAddress, delegatedAmount]);

  // Log current state
  useEffect(() => {
    // This space is intentionally left blank after removing console.logs
  }, [syncAddress, delegatedAmount, contractDelegatedAmount, hasDelegated]);

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

  // Tokenomics rule:
  // - every +100 score: subtract (current delegated / 100)
  // - every -100 score: add (current delegated / 100)
  useEffect(() => {
    const currentBucket = Math.floor(brainrotScore / 100);
    const previousBucket = previousScoreBucketRef.current;

    if (currentBucket === previousBucket) {
      return;
    }

    const bucketDelta = currentBucket - previousBucket;
    const movedBuckets = Math.abs(bucketDelta);

    setContractDelegatedAmount((currentAmount) => {
      if (currentAmount <= 0) {
        return 0;
      }

      const tokenPer100 = currentAmount / 100;
      const totalTokenDelta = movedBuckets * tokenPer100 * (bucketDelta > 0 ? -1 : 1);
      const nextAmount = Math.max(0, currentAmount + totalTokenDelta);

      return nextAmount;
    });

    previousScoreBucketRef.current = currentBucket;
  }, [brainrotScore]);

  // Execute real STRK transfer when delegated amount decreases (score bucket crossed)
  useEffect(() => {
    if (!syncAddress) return;
    
    // Only proceed if the amount actually changed
    const amountChanged = Math.abs(contractDelegatedAmount - lastPersistedAmountRef.current) > 0.0001;
    if (!amountChanged) return;

    // Calculate transfer amount (how much STRK is being removed from delegation)
    const transferAmount = lastPersistedAmountRef.current - contractDelegatedAmount;
    
    // Only execute transfer if amount decreased (delegation reduced)
    if (transferAmount <= 0.0001) return;

    const executeTransfer = async () => {
      try {
        console.log(`[Dashboard] Executing STRK transfer: ${transferAmount.toFixed(6)} STRK from ${syncAddress}`);
        
        // Call backend to execute the STRK transfer
        const response = await fetch('http://localhost:3333/api/transfer/strk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromAddress: syncAddress,
            toAddress: syncAddress, // Transfer to self (or treasury if configured)
            amount: Number(transferAmount.toFixed(6))
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Dashboard] Failed to execute STRK transfer:', response.status, errorText);
          return;
        }

        const data = await response.json();
        const realTxHash = data.transactionHash;

        console.log(`[Dashboard] STRK transfer successful. TX Hash: ${realTxHash}`);

        // Now persist the delegation with the real transaction hash
        const persistResponse = await fetch('http://localhost:3333/api/delegate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: syncAddress,
            amount: Number(contractDelegatedAmount.toFixed(6)),
            txHash: realTxHash
          })
        });

        if (!persistResponse.ok) {
          console.error('[Dashboard] Failed to persist delegation with tx hash:', persistResponse.status);
          return;
        }

        // Update ref to track this as persisted
        lastPersistedAmountRef.current = contractDelegatedAmount;

        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({ delegated_amount: contractDelegatedAmount });
        }

        console.log(`[Dashboard] Delegation updated: ${contractDelegatedAmount.toFixed(6)} STRK with TX: ${realTxHash}`);

      } catch (error) {
        console.error('[Dashboard] Error executing STRK transfer:', error);
      }
    };

    executeTransfer();
  }, [contractDelegatedAmount, syncAddress]);

  // AUTHORIZATION GATE: Must have address AND >= 1 STRK (from contract)
  const isAuthorized = !!syncAddress && contractDelegatedAmount >= 1;

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
          <p className="text-[9px] text-emerald-500/40 uppercase font-black mb-1 tracking-widest">Current Stake</p>
          <p className="text-lg font-mono font-bold text-white">
            {isLoadingBalance ? '...' : contractDelegatedAmount.toFixed(2)} / 1.00 STRK
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

  const handleResetScore = () => {
    if (window.confirm('Reset brainrot score to 0?')) {
      chrome.storage.local.set({ 
        realtime_stats: { 
          brainrotScore: 0, 
          screenTimeMinutes: 0 
        } 
      }, () => {
        // Force UI update
        window.location.reload();
      });
    }
  };

  // Responsive grid: 1 column for popup, 2 columns for webapp
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
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
  );
};

export default Dashboard;