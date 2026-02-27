import React, { useState, useEffect } from 'react';
import { Zap, Flame, Brain, TrendingUp, AlertCircle, Lock, ExternalLink } from 'lucide-react';
import Progress from './ui/progress'; //
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'; //

interface DashboardProps {
  brainrotScore: number;
  syncAddress: string | null;
  delegatedAmount: number; // New prop: total STRK delegated by user
  delegationTxHash?: string | null; // Optional: latest delegation tx hash
}

import { useNavigate } from 'react-router-dom';
const Dashboard: React.FC<DashboardProps> = ({ brainrotScore, syncAddress, delegatedAmount, delegationTxHash }) => {
  const [displayScore, setDisplayScore] = useState(brainrotScore);
  const navigate = useNavigate();

  // Neural Smoothing: Ticks the display score 1-by-1 to match actual data
  useEffect(() => {
    if (displayScore !== brainrotScore) {
      const timer = setTimeout(() => {
        setDisplayScore((prev) => {
          if (prev < brainrotScore) return prev + 1;
          if (prev > brainrotScore) return prev - 1;
          return prev;
        });
      }, 20); // Fast 20ms tick for real-time feel
      return () => clearTimeout(timer);
    }
  }, [brainrotScore, displayScore]);

  // Requirement: Minimum 1 STRK delegated
  if (delegatedAmount < 1) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 border border-rose-500/30 bg-rose-500/5 rounded-2xl backdrop-blur-md">
        <Lock className="w-12 h-12 text-rose-500 animate-pulse" />
        <h2 className="text-xl font-bold text-white text-center">Vault Locked</h2>
        <p className="text-sm text-slate-400 text-center max-w-xs">
          You must delegate at least 1 STRK to the vault to begin monitoring.
        </p>
        <a 
          href="/wallet" 
          className="px-6 py-2 bg-emerald-500 text-slate-900 rounded-lg font-bold hover:bg-emerald-400 transition-colors"
        >
          Delegate STRK
        </a>
        {delegationTxHash && (
          <div className="mt-2 text-xs text-slate-400 text-center">
            Last delegation tx:&nbsp;
            <a
              href={`https://starkscan.co/tx/${delegationTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 underline flex items-center gap-1"
            >
              {delegationTxHash.slice(0, 10)}...<ExternalLink size={14} />
            </a>
          </div>
        )}
      </div>
    );
  }

  const getStatus = (score: number) => {
    if (score >= 8000) return { label: "Peak Brainrot", color: "text-red-500", icon: <Flame className="animate-pulse" /> };
    if (score >= 5000) return { label: "Doomscrolling", color: "text-orange-500", icon: <Zap className="animate-bounce" /> };
    return { label: "Mind Sharp", color: "text-emerald-400", icon: <Brain /> };
  };

  const status = getStatus(displayScore);
  const percentage = Math.min((displayScore / 10000) * 100, 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col items-center text-center space-y-1 py-4">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-500/50">Neural Load</h2>
        <div className={`text-7xl font-black tracking-tighter tabular-nums ${status.color}`}>
          {displayScore.toLocaleString()}
        </div>
        <div className={`flex items-center gap-2 text-xs font-bold uppercase ${status.color}`}>
          {status.icon} {status.label}
        </div>
      </div>

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
      {/* Wallet Sync UI remains same */}
    </div>
  );
};

export default Dashboard;