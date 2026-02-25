interface DashboardProps {
  syncAddress: string | null;
  brainrotScore: number;
}

export default function Dashboard({ syncAddress, brainrotScore }: DashboardProps) {
  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-6">
      {/* Brainrot Display Card */}
        <div className="w-full bg-slate-900/80 p-10 rounded-[40px] border border-emerald-500/20 text-center shadow-2xl">
          <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400/40 mb-4">
            Brainrot Intensity
        </h3>
        
          <div className="text-8xl font-black text-emerald-400 tabular-nums tracking-tighter">
          {brainrotScore.toFixed(2)}
        </div>
        
          <div className="mt-8 flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-100/30 uppercase">Live Node Active</span>
        </div>
      </div>

      {/* Connection Info */}
        <p className="text-[10px] font-mono opacity-20 truncate w-48 text-center">{syncAddress}</p>
      </div>
  );
}