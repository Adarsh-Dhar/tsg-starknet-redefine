import React from 'react';
import { 
  Zap, 
  Flame, 
  Brain, 
  TrendingUp, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import Progress from './ui/progress';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from './ui/card';

interface DashboardProps {
  brainrotScore: number;
  syncAddress: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ brainrotScore, syncAddress }) => {
  // Logic for dynamic status labels and styling based on score severity
  const getBrainrotStatus = (score: number) => {
    if (score >= 8000) return { 
      label: "Peak Brainrot", 
      color: "text-red-500", 
      glow: "shadow-red-500/20", 
      icon: <Flame className="animate-pulse" /> 
    };
    if (score >= 5000) return { 
      label: "Doomscrolling", 
      color: "text-orange-500", 
      glow: "shadow-orange-500/20", 
      icon: <Zap className="animate-bounce" /> 
    };
    if (score >= 2000) return { 
      label: "Mind Foggy", 
      color: "text-yellow-500", 
      glow: "shadow-yellow-500/20", 
      icon: <AlertCircle /> 
    };
    return { 
      label: "Mind Sharp", 
      color: "text-emerald-400", 
      glow: "shadow-emerald-500/20", 
      icon: <Brain /> 
    };
  };

  const status = getBrainrotStatus(brainrotScore);
  const percentage = Math.min((brainrotScore / 10000) * 100, 100);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Central Score Display */}
      <div className="flex flex-col items-center justify-center text-center space-y-1 py-4">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-500/50">
          Neural Load Monitor
        </h2>
        <div className={`text-7xl font-black tracking-tighter tabular-nums transition-colors duration-500 ${status.color}`}>
          {brainrotScore.toLocaleString()}
        </div>
        <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${status.color}`}>
          {status.icon}
          {status.label}
        </div>
      </div>

      {/* Main Stats Card using the provided Card components */}
      <Card className={`border-emerald-500/20 bg-slate-900/40 backdrop-blur-md shadow-lg transition-all duration-500 ${status.glow}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-[10px] font-mono uppercase tracking-widest text-slate-400 flex justify-between items-center">
            <span>Progress to Max</span>
            <span className="text-emerald-500">{Math.round(percentage)}%</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress 
            value={percentage} 
            className="h-2 bg-slate-950 border border-emerald-500/10"
          />
          <div className="flex justify-between items-center text-[9px] font-mono text-slate-500">
            <div className="flex items-center gap-1">
              <TrendingUp size={10} className="text-red-500" />
              <span>+500/min on Shorts</span>
            </div>
            <span>-200/min rest decay</span>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Sync Status Card */}
      <Card className="border-emerald-500/10 bg-slate-900/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Sync Node Status</p>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${syncAddress ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-slate-600'}`} />
              <p className="text-[11px] font-mono text-slate-300">
                {syncAddress ? `${syncAddress.slice(0, 6)}...${syncAddress.slice(-4)}` : "Disconnected"}
              </p>
            </div>
          </div>
          {syncAddress && (
            <div className="p-2 hover:bg-emerald-500/10 rounded-full transition-colors cursor-pointer group">
              <ExternalLink size={14} className="text-slate-600 group-hover:text-emerald-400" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Footer Info */}
      <div className="text-center pt-2">
        <p className="text-[9px] text-slate-600 leading-relaxed uppercase tracking-tighter italic">
          Activity is automatically logged by the background worker.<br />
          Avoid YouTube Shorts to recover cognitive integrity.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;