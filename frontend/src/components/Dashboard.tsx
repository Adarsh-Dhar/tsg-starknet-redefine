interface DashboardProps {
  syncAddress: string | null;
  brainrotScore: number;
}

export default function Dashboard({ syncAddress, brainrotScore }: DashboardProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-4 sm:p-6 text-center w-full max-w-full">
      <div className="w-full max-w-md bg-slate-900 border-2 border-emerald-500/20 rounded-3xl p-6 sm:p-12 shadow-2xl shadow-emerald-500/5 mx-auto">
        <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-emerald-500/40 mb-6">
          Terminal Brainrot Level
        </h3>
        <div className="text-6xl sm:text-8xl font-black text-emerald-400 tabular-nums tracking-tighter drop-shadow-sm break-words">
          {brainrotScore.toFixed(2)}
        </div>
        <div className="mt-8 sm:mt-10 flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-100/40 uppercase">Passive Node Active</span>
        </div>
      </div>
      <div className="mt-6 sm:mt-8 text-[9px] font-mono opacity-20 truncate w-full max-w-md mx-auto">{syncAddress}</div>
    </div>
  );
}