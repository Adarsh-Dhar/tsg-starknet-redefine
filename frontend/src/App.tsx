import { useState, useEffect, JSX } from 'react';
import { HashRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Database, Wallet, BarChart3, Settings as SettingsIcon, AlertCircle } from 'lucide-react';
import DataPage from './DataPage';
import WalletPage from './WalletPage';
import InsightsPage from './InsightsPage';
import LeaderboardPage from './LeaderboardPage';
import Dashboard from './components/Dashboard';

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

// Interface for server data structure
interface RealtimeStats {
  screenTimeMinutes: number;
  brainrotScore: number;
}

// Interface for Chrome Storage response
interface StorageResponse {
  starknet_address?: string;
  realtime_stats?: RealtimeStats;
  dailyGoal?: number;
  screenTime?: number;
  tx_status?: string;
}

// ErrorBoundary omitted for brevity, can be re-added if needed



export default function App() {
  // Determine if we are in extension mode (side panel)
  const [isExtension, setIsExtension] = useState(false);
  // Global stats and sync address state
  const [globalStats, setGlobalStats] = useState({ brainrotScore: 0, screenTimeMinutes: 0 });
  const [syncAddress, setSyncAddress] = useState<string | null>(null);

  useEffect(() => {
    // Environment detection for Chrome Extension
    if (window.location.protocol === 'chrome-extension:') {
      setIsExtension(true);
    } else {
      // Fallback for side panel detection
      const checkMode = () => setIsExtension(window.innerWidth <= 450);
      checkMode();
      window.addEventListener('resize', checkMode);
      return () => window.removeEventListener('resize', checkMode);
    }
  }, []);

  // Centralized chrome.storage listener for stats and address
  useEffect(() => {
    const refresh = () => {
      chrome.storage.local.get(['realtime_stats', 'starknet_address'], (res) => {
        if (res.realtime_stats) setGlobalStats(res.realtime_stats as RealtimeStats);
        if (res.starknet_address) setSyncAddress(res.starknet_address as string);
      });
    };
    refresh();
    chrome.storage.onChanged.addListener(refresh);
    return () => chrome.storage.onChanged.removeListener(refresh);
  }, []);

  return (
    <Router>
      <div className={`min-h-screen bg-slate-950 text-emerald-50 flex flex-col ${
        isExtension ? 'w-[400px] h-[820px] overflow-hidden' : 'w-full'
      }`}>
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 pb-24">
          <Routes>
            {/* Pass actual stats and address to Dashboard */}
            <Route path="/" element={<Dashboard brainrotScore={globalStats.brainrotScore} syncAddress={syncAddress} />} />
            <Route path="/data" element={<DataPage />} />
            <Route path="/insights" element={<InsightsPage screenTime={globalStats.screenTimeMinutes} dailyGoal={180} />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
          </Routes>
        </main>
        {/* Persistent Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md border-t border-emerald-500/20 px-6 py-3">
          <div className="flex justify-between items-center max-w-lg mx-auto">
            <NavButton to="/" icon={<LayoutDashboard size={24} />} label="Home" />
            <NavButton to="/data" icon={<Database size={24} />} label="Data" />
            <NavButton to="/insights" icon={<BarChart3 size={24} />} label="Stats" />
            <NavButton to="/leaderboard" icon={<BarChart3 size={24} />} label="Ranks" />
            <NavButton to="/wallet" icon={<Wallet size={24} />} label="Wallet" />
          </div>
        </nav>
      </div>
    </Router>
  );
}

function NavButton({ to, icon, label }: { to: string; icon: JSX.Element; label: string }) {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${
        isActive ? 'text-emerald-400' : 'text-emerald-500/40 hover:text-emerald-300'
      }`}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
    </NavLink>
  );
}