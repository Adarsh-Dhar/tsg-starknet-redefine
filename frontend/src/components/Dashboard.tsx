import React from 'react';
import { useAccount } from "@starknet-react/core";
import { AlertCircle, Clock, Zap, Wallet, CheckCircle2 } from 'lucide-react';

interface DashboardProps {
  screenTime: number;
  dailyGoal: number;
  percentage: number;
  syncAddress?: string | null;
}

export default function Dashboard({ screenTime, dailyGoal, percentage, syncAddress }: DashboardProps) {
  const { isConnected: directConnected, status } = useAccount();

  // Logic: Show dashboard if directly connected OR if we have a synced address from the web tab
  const isActuallyConnected = directConnected || !!syncAddress;

  const handleConnect = () => {
    // Open the full web DApp to handle wallet injection
    window.open('http://localhost:5173/#/wallet', '_blank');
  };

  if (status === "connecting") return <div className="p-12 text-center text-emerald-500 animate-pulse">Initializing Neural Link...</div>;

  if (!isActuallyConnected) {
    return (
      <div className="glass-effect rounded-2xl p-12 flex flex-col items-center border border-rose-500/20">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4 opacity-50" />
        <div className="text-rose-400 font-bold text-center mb-6">
          Connection Required
          <p className="text-xs font-normal opacity-60 mt-2">Open the web dashboard to link your Starknet wallet</p>
        </div>
        <button
          onClick={handleConnect}
          className="flex items-center gap-3 px-8 py-3 rounded-xl bg-emerald-500 text-slate-900 font-bold hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
        >
          <Wallet className="w-5 h-5" />
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[400px] mx-auto">
      <div className="glass-effect rounded-2xl p-8 flex flex-col items-center border border-emerald-500/10">
        <div className="text-4xl font-bold text-white mb-1">{Math.round(percentage)}%</div>
        <div className="text-xs font-bold uppercase text-emerald-300/40">Daily Cap</div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-effect rounded-xl p-4 border border-emerald-500/10">
          <Clock className="w-4 h-4 text-emerald-400 mb-2" />
          <div className="text-xl font-bold text-emerald-400">{screenTime}m</div>
        </div>
        <div className="glass-effect rounded-xl p-4 border border-emerald-500/10">
          <Zap className="w-4 h-4 text-yellow-400 mb-2" />
          <div className="text-xl font-bold text-yellow-400">{dailyGoal}m</div>
        </div>
        <div className="glass-effect rounded-xl p-4 border border-emerald-500/10">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-2" />
          <div className="text-xl font-bold text-emerald-400">{Math.max(0, dailyGoal - screenTime)}m</div>
        </div>
      </div>
    </div>
  );
}