import React, { Component, useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Trophy, Lightbulb, Wallet as WalletIcon, DatabaseIcon, AlertCircle } from 'lucide-react';
import Dashboard from './components/Dashboard';
import LeaderboardPage from './LeaderboardPage';
import InsightsPage from './InsightsPage';
import WalletPage from './WalletPage';
import DataPage from './DataPage';

// Starknet React Imports
import { StarknetConfig, braavos, argent, voyager } from "@starknet-react/core";
import { sepolia } from "@starknet-react/chains";
import { RpcProvider } from "starknet";

// 1. Properly define the Starknet Window object for TypeScript
declare global {
  interface Window {
    starknet?: {
      account?: {
        execute: (transactions: any[]) => Promise<{ transaction_hash: string }>;
      };
      enable: () => Promise<string[]>;
      isConnected: boolean;
    };
  }
}

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, info: any) { console.error('ErrorBoundary caught:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="text-rose-500 p-8 text-center glass-effect m-4 rounded-xl border border-rose-500/20">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <h2 className="font-bold">System Error</h2>
          <p className="text-xs opacity-60">Something went wrong. Please reload the extension.</p>
        </div>
      );
    }
    return this.props.children;
  }
}


function AppContent() {
  const location = useLocation();
  const [syncAddress, setSyncAddress] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [stats, setStats] = useState({ screenTime: 0, percentage: 0 });

  // Function to pull data from storage without refreshing the whole app
  const loadData = () => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['starknet_address'], (res) => {
        if (typeof res.starknet_address === 'string' && res.starknet_address.length > 0) {
          setSyncAddress(res.starknet_address);
        } else {
          setSyncAddress(null);
        }
      });
    }
  };

  // Load real-time stats from storage
  const loadRealtimeStats = () => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['realtime_stats'], (res) => {
        if (res.realtime_stats) {
          setStats({
            screenTime: Math.round(res.realtime_stats as any),
            percentage: Math.min(100, (res.realtime_stats as any / 180) * 100)
          });
        }
      });
    }
  };

  // 2. Handle Message Passing & UI Refresh
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      const listener = (msg: any) => {
        if (msg.type === "UI_REFRESH") {
          loadData();
          loadRealtimeStats(); // Pull newest YT data
        }
      };
      chrome.runtime.onMessage.addListener(listener);
      loadData(); // Initial check
      loadRealtimeStats(); // Initial stats
      return () => chrome.runtime.onMessage.removeListener(listener);
    }
  }, []);

  return (
    <div className="h-full bg-slate-950 text-slate-200 font-sans">
      <nav className="border-b border-emerald-500/10 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <span className="text-slate-900 font-bold">G</span>
              </div>
              <h1 className="text-xl font-bold text-emerald-400">Touch Grass</h1>
            </div>
            
            <div className="flex items-center gap-2">
              {syncAddress && (
                <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-mono">
                  {syncAddress.slice(0, 6)}...{syncAddress.slice(-4)}
                </div>
              )}
              {txStatus && (
                <div className={`px-2 py-1 rounded border text-[10px] font-mono ${
                  txStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  Tx: {txStatus}
                </div>
              )}
            </div>
          </div>
          
          {/* Mobile/Sidebar Navigation Icons */}
          <div className="flex justify-around py-2 border-t border-emerald-500/5">
            {[
              { path: '/', icon: LayoutDashboard },
              { path: '/leaderboard', icon: Trophy },
              { path: '/insights', icon: Lightbulb },
              { path: '/wallet', icon: WalletIcon },
              { path: '/data', icon: DatabaseIcon },
            ].map(({ path, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`p-2 rounded-lg transition-colors ${
                  location.pathname === path 
                    ? 'text-emerald-400 bg-emerald-500/10' 
                    : 'text-slate-400 hover:text-emerald-300'
                }`}
              >
                <Icon className="w-5 h-5" />
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard syncAddress={syncAddress} screenTime={stats.screenTime} dailyGoal={180} percentage={stats.percentage} />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/insights" element={<InsightsPage screenTime={stats.screenTime} dailyGoal={180} />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/data" element={<DataPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const providerFactory = (chain: any) => {
    if (chain.id === sepolia.id) {
      return new RpcProvider({ nodeUrl: "https://starknet-sepolia.g.alchemy.com/v2/ttO_pNTAABnXF_9T1g7sSRQfRN1wbcip" });
    }
    return null;
  };

  return (
    <ErrorBoundary>
      <StarknetConfig 
        chains={[sepolia]} 
        provider={providerFactory} 
        connectors={[braavos(), argent()]} 
        explorer={voyager}
      >
        <Router>
          <AppContent />
        </Router>
      </StarknetConfig>
    </ErrorBoundary>
  );
}