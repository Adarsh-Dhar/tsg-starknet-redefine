import React from 'react';
import { useAccount } from "@starknet-react/core";
import { CheckCircle2, AlertCircle, Clock, Zap } from 'lucide-react';

interface DashboardProps {
  screenTime: number;
  dailyGoal: number;
  percentage: number;
}

const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
};

export default function Dashboard({ screenTime, dailyGoal, percentage }: DashboardProps) {
  const { isConnected, status } = useAccount();

  // Handle Wallet States before rendering sensitive data
  if (status === "connecting") {
    return (
      <div className="glass-effect glass-glow rounded-2xl p-12 flex flex-col items-center justify-center border border-emerald-500/20">
        <div className="text-emerald-500 animate-pulse font-mono tracking-widest text-sm uppercase">
          Initializing Neural Link...
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="glass-effect glass-glow rounded-2xl p-12 flex flex-col items-center justify-center border border-rose-500/20">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4 opacity-50" />
        <div className="text-rose-400 font-bold text-center">
          Connection Required
          <p className="text-xs font-normal text-rose-400/60 mt-2">Please connect your Starknet wallet to view metrics</p>
        </div>
      </div>
    );
  }

  const remaining = Math.max(0, dailyGoal - screenTime);
  const isGood = percentage < 50;
  const isWarning = percentage >= 50 && percentage < 100;
  const isExceeded = percentage >= 100;

  // Define stroke colors based on status
  const getStrokeColor = () => {
    if (isGood) return 'url(#gradientGood)';
    if (isWarning) return 'url(#gradientWarning)';
    return 'url(#gradientExceeded)';
  };

  return (
    <div className="space-y-6">
      {/* Main Circle Progress */}
      <div className="glass-effect glass-glow rounded-2xl p-8 flex flex-col items-center justify-center border border-emerald-500/10">
        <div className="relative w-48 h-48 mb-6">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="rgba(16, 185, 129, 0.1)"
              strokeWidth="12"
            />
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke={getStrokeColor()}
              strokeWidth="12"
              strokeDasharray={`${(Math.min(percentage, 100) / 100) * 565.48} 565.48`}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
            <defs>
              <linearGradient id="gradientGood" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
              <linearGradient id="gradientWarning" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
              <linearGradient id="gradientExceeded" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#f87171" />
              </linearGradient>
            </defs>
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-white mb-1">{Math.round(percentage)}%</div>
            <div className="text-xs font-bold uppercase tracking-tighter text-emerald-300/40">Daily Cap</div>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-1">{formatTime(screenTime)}</h2>
          <p className="text-xs text-emerald-300/50 uppercase tracking-widest font-bold">Total Exposure</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-effect rounded-xl p-6 border border-emerald-500/10">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-300/60">Current</h3>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{formatTime(screenTime)}</div>
        </div>

        <div className="glass-effect rounded-xl p-6 border border-emerald-500/10">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-4 h-4 text-yellow-400" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-300/60">Limit</h3>
          </div>
          <div className="text-2xl font-bold text-yellow-400">{formatTime(dailyGoal)}</div>
        </div>

        <div className="glass-effect rounded-xl p-6 border border-emerald-500/10">
          <div className="flex items-center gap-3 mb-4">
            {isExceeded ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-300/60">{isExceeded ? 'Over' : 'Safe'}</h3>
          </div>
          <div className={`text-2xl font-bold ${isExceeded ? 'text-rose-400' : 'text-emerald-400'}`}>
            {formatTime(isExceeded ? screenTime - dailyGoal : remaining)}
          </div>
        </div>
      </div>

      {/* Dynamic Status Notification */}
      <div className={`glass-effect rounded-xl p-5 border ${isGood ? 'border-emerald-500/20 bg-emerald-500/5' : isWarning ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
        <div className="flex items-center gap-4">
          {isGood ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <AlertCircle className="w-6 h-6 text-yellow-400" />}
          <div>
            <h3 className={`font-bold text-sm ${isGood ? 'text-emerald-300' : isWarning ? 'text-yellow-300' : 'text-rose-300'}`}>
              {isGood ? 'Optimal Cognitive Load' : isWarning ? 'Attention Exhaustion Imminent' : 'Terminal Brainrot Risk'}
            </h3>
            <p className="text-xs text-emerald-100/60 mt-1">
              {isGood ? "You're maintaining a healthy digital balance." : isWarning ? "Consider disengaging within the next 15 minutes." : "Threshold exceeded. Slashing protocol activated."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}