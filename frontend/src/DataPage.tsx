import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  Cell
} from 'recharts';
import { 
  Database, Upload, Activity, History, AlertTriangle, 
  CheckCircle2, FileJson, ShieldAlert 
} from 'lucide-react';
import { useAccount } from "@starknet-react/core";

// --- Interfaces matching server route.ts ---
interface AuditAnalysis {
  startTime: string;
  isPathological: boolean;
}

export default function DataPage() {
  const { address, isConnected } = useAccount();
  
  // State for fetched data
  const [auditResults, setAuditResults] = useState<AuditAnalysis[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';

  // 1. Handle Batch Ingestion (POST /api/data/ingest)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('history_file', file);

    try {
      const response = await fetch(`${apiBase}/data/ingest`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();

      const [stats, setStats] = useState({ brainrotScore: 0, screenTimeMinutes: 0 });
      const [error, setError] = useState<string | null>(null);

      const refreshFromStorage = () => {
        chrome.storage.local.get(['realtime_stats', 'sync_error'], (res) => {
          if (res.realtime_stats) setStats(res.realtime_stats as { brainrotScore: number; screenTimeMinutes: number });
          if (res.sync_error) setError(res.sync_error as string);
          else setError(null);
        });
      };

      useEffect(() => {
        refreshFromStorage();

        // Listen for storage changes from background.js
        const listener = (changes: any) => {
          if (changes.realtime_stats || changes.sync_error) {
            refreshFromStorage();
          }
        };

        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
      }, []);

      console.log("Ingestion response:", data);
      
      if (response.ok) {
        setUploadStatus('success');
        // Automatically trigger an advanced audit on the uploaded data
        if (data.preview) triggerAdvancedAudit(data.preview);
      } else {
        setUploadStatus('error');
      }
    } catch (err) {
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  // 2. Advanced Historical Analysis (POST /api/data/audit/advanced)
  const triggerAdvancedAudit = async (historyData: any[]) => {
    try {
      const response = await fetch(`${apiBase}/data/audit/advanced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historyData }),
      });
      const data = await response.json();
      console.log("Audit response:", data);
      if (data.success) {
        setAuditResults(data.analysis);
      }
    } catch (err) {
      console.error("Audit failed:", err);
    }
  };

  // 3. Visualization Data (Based on server PHENOTYPE_CONFIG)
  const configMetrics = [
    { name: 'Zombie Threshold', value: 15, color: '#10b981' },
    { name: 'Doom Trigger', value: 3.5, color: '#f43f5e' },
  ];

  return (
    <div className="max-w-6xl mx-auto mt-8 p-6 space-y-8 text-emerald-50">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-emerald-500/20 pb-6">
        <div>
          <h1 className="text-4xl font-bold text-emerald-300 flex items-center gap-3">
            <Database className="w-10 h-10" /> Data Ingestion
          </h1>
          <p className="text-emerald-400/60 mt-2">Historical and real-time cognitive decay analysis.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* File Ingestion Section */}
        <div className="glass-effect p-6 rounded-2xl border border-emerald-500/20 bg-emerald-900/10">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
            <Upload className="text-emerald-400" /> Google Takeout
          </h2>
          <p className="text-sm text-emerald-400/60 mb-6 italic">
            Process `Watch History.json` through the streaming pipeline.
          </p>

          <label className="relative group cursor-pointer block">
            <input 
              type="file" 
              className="hidden" 
              accept=".json"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            <div className={`flex flex-col items-center p-10 border-2 border-dashed rounded-xl transition-all ${
              isUploading ? 'border-emerald-500/50 bg-emerald-500/5 cursor-wait' : 'border-emerald-500/20 group-hover:border-emerald-500/40'
            }`}>
              <FileJson className={`w-12 h-12 mb-3 ${isUploading ? 'animate-bounce' : 'text-emerald-500/40'}`} />
              <span className="text-sm font-bold uppercase tracking-widest text-emerald-300">
                {isUploading ? 'Streaming Pipeline Active' : 'Select JSON File'}
              </span>
            </div>
          </label>

          {uploadStatus === 'success' && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle2 className="w-4 h-4" /> Ingestion Complete
            </div>
          )}
        </div>

        {/* Scoring Configuration Visualizer */}
        <div className="lg:col-span-2 glass-effect p-6 rounded-2xl border border-emerald-500/20 bg-emerald-900/5">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
            <Activity className="text-emerald-400" /> Detection Thresholds
          </h2>
          <div style={{ height: '300px', width: '100%', minWidth: 200, minHeight: 200 }}>
            <ResponsiveContainer width="100%" height={300} minWidth={200} minHeight={200}>
              <BarChart data={configMetrics}>
                <XAxis dataKey="name" stroke="#10b981" fontSize={12} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#064e3b', border: '1px solid #10b981' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {configMetrics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Advanced Audit Results Table (POST /api/data/audit/advanced) */}
        <div className="lg:col-span-3 glass-effect p-6 rounded-2xl border border-emerald-500/20 bg-slate-900/40">
           <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-bold flex items-center gap-2">
                <History className="text-emerald-400" /> Historical Analysis
              </h2>
              {auditResults.length > 0 && (
                <span className="text-xs text-emerald-400/60 font-mono">
                  {auditResults.length} Sessions Analyzed
                </span>
              )}
           </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-xs uppercase text-emerald-500/40 border-b border-emerald-500/10">
                  <tr>
                    <th className="pb-4 px-4 font-bold tracking-widest">Session Start</th>
                    <th className="pb-4 px-4 font-bold tracking-widest text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {auditResults.map((session, idx) => (
                    <tr key={idx} className="border-b border-emerald-500/5 hover:bg-emerald-500/5 transition-colors">
                      <td className="py-4 px-4 font-mono">
                        {new Date(session.startTime).toLocaleString()}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center">
                          {session.isPathological ? (
                            <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 text-[10px] border border-rose-500/30 flex items-center gap-1 font-bold uppercase">
                              <ShieldAlert className="w-3 h-3" /> Doomscrolling Detected
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] border border-emerald-500/30 font-bold uppercase">
                              Healthy Session
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {auditResults.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-12 text-center text-emerald-500/20 italic">
                        No audit data available. Upload history to begin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
        </div>
      </div>
    </div>
  );
}