interface DashboardProps {
  syncAddress: string | null;
  brainrotScore: number;
}

export default function Dashboard({ syncAddress, brainrotScore }: DashboardProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
      <div className="w-full bg-slate-900 border-2 border-emerald-500/20 rounded-[3rem] p-12 shadow-2xl shadow-emerald-500/5">
        <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-emerald-500/40 mb-6">
          Terminal Brainrot Level
        </h3>
        <div className="text-8xl font-black text-emerald-400 tabular-nums tracking-tighter drop-shadow-sm">
          {brainrotScore.toFixed(2)}
        </div>
        <div className="mt-10 flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-100/40 uppercase">Passive Node Active</span>
        </div>
      </div>
      <div className="mt-8 text-[9px] font-mono opacity-20 truncate w-full">{syncAddress}</div>
    </div>
  );
}