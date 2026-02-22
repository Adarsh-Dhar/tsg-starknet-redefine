// Error Boundary for React
import React, { Component } from 'react';

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, info: any) {
    // Log error if needed
    console.error('ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return <div className="text-red-500 p-8 text-center">Something went wrong. Please reload or contact support.</div>;
    }
    return this.props.children;
  }
}
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Trophy, Lightbulb, Wallet as WalletIcon, DatabaseIcon } from 'lucide-react';
import Dashboard from './components/Dashboard';
import LeaderboardPage from './LeaderboardPage';
import InsightsPage from './InsightsPage';
import WalletPage from './WalletPage';
import DataPage from './DataPage';

// Starknet React Imports
import { StarknetConfig, braavos, argent, useInjectedConnectors, voyager } from "@starknet-react/core";
import { sepolia } from "@starknet-react/chains";
import { RpcProvider } from "starknet";

function AppContent() {
  const location = useLocation();

  return (
    <div className="h-full bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">
      <nav className="border-b border-emerald-500/10 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-green-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                <span className="text-slate-900 font-bold text-xl">G</span>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                Touch Grass
              </h1>
            </div>
            
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    location.pathname === path
                      ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_0_12px_rgba(16,185,129,0.1)]'
                      : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${location.pathname === path ? 'animate-pulse' : ''}`} />
                  <span className="font-medium text-sm">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Routes>
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
  // Set up Sepolia Provider (Alchemy RPC)
  // Provider factory for Sepolia
  const providerFactory = (chain: { id: bigint; }) => {
    if (chain.id === sepolia.id) {
      return new RpcProvider({
        nodeUrl: "https://starknet-sepolia.g.alchemy.com/v2/ttO_pNTAABnXF_9T1g7sSRQfRN1wbcip"
      });
    }
    return null;
  };

  // Configure connectors (Braavos, Argent X, Injected)
  const connectors = [
    braavos(),
    argent(),
  ];

  return (
    <ErrorBoundary>
      <StarknetConfig
        chains={[sepolia]}
        provider={providerFactory}
        connectors={connectors}
        explorer={voyager}
      >
        <Router>
          <AppContent />
        </Router>
      </StarknetConfig>
    </ErrorBoundary>
  );
}