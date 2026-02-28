
import React, { useState, useEffect } from 'react';
import { useAccount, useBalance } from "@starknet-react/core";
import WalletPage from '../WalletPage';
import { Zap, Flame, Brain, TrendingUp, Lock } from 'lucide-react';
import Progress from './ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const STRK_TOKEN_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const VAULT_ADDRESS = "0x0602c5436e8dc621d2003f478d141a76b27571d29064fbb9786ad21032eb4769";

interface DashboardProps {
  brainrotScore: number;
  syncAddress: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ brainrotScore, syncAddress }) => {
  const { isConnected, address } = useAccount();
  // Check for delegation balance in the vault
  const { data: delegationBalance, isLoading } = useBalance({
    address: address,
    token: STRK_TOKEN_ADDRESS,
    watch: true,
  });
  const [displayScore, setDisplayScore] = useState<number>(brainrotScore);

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

  // --- GATE 1: Wallet Connection ---
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center p-10 space-y-6">
        <h2 className="text-xl font-bold text-emerald-400">Connect to Start</h2>
        <WalletPage minimal />
      </div>
    );
  }

  // --- GATE 2: Delegation Check ---
  const delegatedAmount = delegationBalance ? Number(delegationBalance.formatted) : 0;
  if (delegatedAmount < 1) {
    return (
      <div className="max-w-md mx-auto p-8 rounded-2xl glass-effect border border-rose-500/30 bg-rose-900/10 text-center space-y-4">
        <Lock className="w-12 h-12 text-rose-500 mx-auto animate-pulse" />
        <h2 className="text-xl font-bold text-white">Minimum Delegation Required</h2>
        <p className="text-sm text-slate-400">
          You must delegate at least 1 STRK to the vault to unlock your Brainrot monitoring.
        </p>
        <div className="pt-4">
          <WalletPage minimal />
        </div>
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

  // Responsive grid: 1 column for popup, 2 columns for webapp
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
      {/* Neural Load Card */}
      <div className="flex flex-col items-center text-center space-y-1 py-4 bg-slate-900/40 rounded-2xl border border-emerald-500/10">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-500/50">Neural Load</h2>
        <div className={`text-7xl font-black tracking-tighter tabular-nums ${status.color}`}>{displayScore.toLocaleString()}</div>
        <div className={`flex items-center gap-2 text-xs font-bold uppercase ${status.color}`}>{status.icon} {status.label}</div>
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