import React, { Component, useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Trophy, Lightbulb, Wallet as WalletIcon, DatabaseIcon } from 'lucide-react';
import Dashboard from './components/Dashboard';
import LeaderboardPage from './LeaderboardPage';
import InsightsPage from './InsightsPage';
import WalletPage from './WalletPage';
import DataPage from './DataPage';

// Starknet React Imports
import { StarknetConfig, braavos, argent, voyager } from "@starknet-react/core";
import { sepolia } from "@starknet-react/chains";
import { RpcProvider } from "starknet";

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, info: any) { console.error('ErrorBoundary caught:', error, info); }
  render() {
    if (this.state.hasError) {
      return <div className="text-red-500 p-8 text-center">Something went wrong. Please reload.</div>;
    }
    return this.props.children;
  }
}

function AppContent() {
  const location = useLocation();
  const [syncAddress, setSyncAddress] = useState<string | null>(null);

  // Sync state with chrome storage for extension context
    useEffect(() => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        // 1. Initial check
        chrome.storage.local.get(['starknet_address'], (res) => {
          if (res.starknet_address) setSyncAddress(res.starknet_address as string);
        });
        // 2. Listen for background.js saving the data
        const listener = (changes: { starknet_address: { newValue: React.SetStateAction<string | null>; }; }, area: string) => {
          if (area === 'local' && changes.starknet_address) {
            setSyncAddress(changes.starknet_address.newValue);
            window.location.reload(); // Force reload to refresh provider state
          }
        };
        chrome.storage.onChanged.addListener(listener as any);
        return () => chrome.storage.onChanged.removeListener(listener as any);
      }
    }, []);

  return (
    <div className="h-full bg-slate-950 text-slate-200 font-sans">
      <nav className="border-b border-emerald-500/10 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <span className="text-slate-900 font-bold">G</span>
              </div>
              <h1 className="text-xl font-bold text-emerald-400">Touch Grass</h1>
            </div>
            {/* Sync Status Badge (Optional - shows if synced with web tab) */}
            {syncAddress && (
              <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-mono">
                Synced: {syncAddress.slice(0, 6)}...
              </div>
            )}
            <div className="hidden md:flex items-center space-x-1">
              {[
                { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
                { path: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
                { path: '/insights', icon: Lightbulb, label: 'Insights' },
                { path: '/wallet', icon: WalletIcon, label: 'Wallet' },
                { path: '/data', icon: DatabaseIcon, label: 'Data' },
              ].map(({ path, icon: Icon, label }) => (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    location.pathname === path 
                      ? 'text-emerald-400 bg-emerald-500/10' 
                      : 'text-slate-400 hover:text-emerald-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          {/* Note: In the extension, screenTime/dailyGoal usually come from storage/syncAddress context */}
          <Route path="/" element={<Dashboard screenTime={0} dailyGoal={0} percentage={0} />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/insights" element={<InsightsPage screenTime={0} dailyGoal={0} />} />
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