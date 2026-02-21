import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, CartesianGrid, AreaChart, Area 
} from 'recharts';
import { 
  Database, Upload, Activity, History, AlertTriangle, 
  CheckCircle2, FileJson, TrendingUp 
} from 'lucide-react';
import { useAccount } from "@starknet-react/core";

// --- Types based on your server route.ts ---
interface Metric {
  variance: number;
  velocity: number;
}

interface AuditSession {
  startTime: string;
  videoCount: number;
  metrics: Metric;
  isPathological: boolean;
}

export default function DataPage() {
  const { address, isConnected } = useAccount();
  const [auditData, setAuditData] = useState<AuditSession[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // 1. Handle File Ingestion (POST /api/data/ingest)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('history_file', file);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
      const response = await fetch(`${apiBase}/data/ingest`, {
        method: 'POST',
        body: formData,
      });
      if (response.ok) setUploadStatus('success');
      else setUploadStatus('error');
    } catch (err) {
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  // 2. Mock Real-time stats (Mirroring scoring engine in route.ts)
  const realTimeStats = [
    { name: 'Variance', value: 12, limit: 15 },
    { name: 'Velocity', value: 4.2, limit: 3.5 },
  ];

  return (
    <div className="max-w-5xl mx-auto mt-8 p-6 space-y-8 text-emerald-50">
      {/* Header Section */}
      <div className="flex justify-between items-end border-b border-emerald-500/20 pb-6">
        <div>
          <h1 className="text-4xl font-bold text-emerald-300 flex items-center gap-3">
            <Database className="w-10 h-10" /> Data Analytics
          </h1>
          <p className="text-emerald-400/60 mt-2">Monitor cognitive decay metrics and historical audits.</p>
        </div>
        <div className="text-right">
          <span className="text-xs uppercase font-bold text-emerald-500/40 tracking-widest">Active Wallet</span>
          <p className="font-mono text-sm">{address ? `${address.slice(0, 10)}...` : 'Not Connected'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Real-time Monitor (Scoring Engine View) */}
        <div className="md:col-span-2 glass-effect p-6 rounded-2xl border border-emerald-500/20 bg-emerald-900/5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className="text-emerald-400" /> Real-time Phenotype
            </h2>
            <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 animate-pulse">
              Live Feed
            </div>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={realTimeStats}>
                <XAxis dataKey="name" stroke="#10b981" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#064e3b', border: '1px solid #10b981' }}
                  itemStyle={{ color: '#ecfdf5' }}
                />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* File Ingestion Card */}
        <div className="glass-effect p-6 rounded-2xl border border-emerald-500/20 bg-emerald-900/10 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
              <Upload className="text-emerald-400" /> Ingest History
            </h2>
            <p className="text-sm text-emerald-400/60 mb-6">Upload Google Takeout `Watch History.json` to analyze past decay.</p>
          </div>

          <label className="relative group cursor-pointer">
            <input 
              type="file" 
              className="hidden" 
              accept=".json"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            <div className={`flex flex-col items-center p-8 border-2 border-dashed rounded-xl transition-all ${
              isUploading ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-emerald-500/20 group-hover:border-emerald-500/40'
            }`}>
              <FileJson className={`w-12 h-12 mb-2 ${isUploading ? 'animate-bounce' : 'text-emerald-500/40'}`} />
              <span className="text-sm font-bold uppercase tracking-widest text-emerald-300">
                {isUploading ? 'Streaming...' : 'Select JSON'}
              </span>
            </div>
          </label>

          {uploadStatus === 'success' && (
            <div className="mt-4 flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle2 className="w-4 h-4" /> Batch Enqueued Successfully
            </div>
          )}
        </div>

        {/* Audit Analysis Section (POST /api/data/audit/advanced) */}
        <div className="md:col-span-3 glass-effect p-6 rounded-2xl border border-emerald-500/20 bg-slate-900/40">
           <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
              <History className="text-emerald-400" /> Historical Pathological Audit
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-xs uppercase text-emerald-500/40 border-b border-emerald-500/10">
                  <tr>
                    <th className="pb-4 px-4 font-bold tracking-widest">Session Start</th>
                    <th className="pb-4 px-4 font-bold tracking-widest">Velocity</th>
                    <th className="pb-4 px-4 font-bold tracking-widest">Variance</th>
                    <th className="pb-4 px-4 font-bold tracking-widest">Diagnosis</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr className="border-b border-emerald-500/5 hover:bg-emerald-500/5 transition-colors">
                    <td className="py-4 px-4 font-mono">2026-02-21 14:20</td>
                    <td className="py-4 px-4">4.2 v/m</td>
                    <td className="py-4 px-4">12.8</td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 rounded-md bg-rose-500/20 text-rose-400 text-xs border border-rose-500/30 flex items-center gap-1 w-fit">
                        <AlertTriangle className="w-3 h-3" /> Pathological
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
        </div>
      </div>
    </div>
  );
}