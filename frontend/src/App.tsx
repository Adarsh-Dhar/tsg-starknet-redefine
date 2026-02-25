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
    // Content script handler for EXECUTE_TX from extension background
    useEffect(() => {
      // Robustly check for chrome.runtime.onMessage
      if (
        typeof chrome !== 'undefined' &&
        chrome.runtime?.onMessage &&
        (window as any).starknet
      ) {
        const starknet = (window as any).starknet;

        const messageListener = async (msg: any, sender: any, sendResponse: any) => {
          if (msg.type === 'EXECUTE_TX' && starknet.account) {
            try {
              const { transaction_hash } = await starknet.account.execute(msg.tx);
              chrome.storage.local.set({ tx_status: 'success' });
              sendResponse({ success: true, transaction_hash });
            } catch (e) {
              console.error("Tx failed", e);
              chrome.storage.local.set({ tx_status: 'fail' });
              sendResponse({ success: false });
            }
          }
          return true; // Keep the message channel open for async response
        };

        chrome.runtime.onMessage.addListener(messageListener);

        // Cleanup listener on unmount
        return () => chrome.runtime.onMessage.removeListener(messageListener);
      }
    }, []);
  const location = useLocation();
  const [syncAddress, setSyncAddress] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  // Sync state with chrome storage for extension context
  useEffect(() => {
    // Only run this effect if chrome.storage.onChanged and addListener exist (extension context)
    const hasStorageListener =
      typeof chrome !== 'undefined' &&
      chrome.storage &&
      chrome.storage.onChanged &&
      typeof chrome.storage.onChanged.addListener === 'function';

    let removeListener: (() => void) | undefined;

    if (hasStorageListener) {
      // 1. Initial check
      chrome.storage.local.get(['starknet_address', 'tx_status'], (res) => {
        if (res.starknet_address) setSyncAddress(res.starknet_address as string);
        if (res.tx_status) setTxStatus(res.tx_status as string);
      });
      // 2. Listen for background.js saving the data
      const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
        if (areaName === 'local') {
          if (changes.starknet_address) {
            console.log("Syncing new address to popup:", changes.starknet_address.newValue);
            setSyncAddress(changes.starknet_address.newValue as string);
            setTimeout(() => window.location.reload(), 100);
          }
          if (changes.tx_status) {
            setTxStatus(changes.tx_status.newValue as string);
          }
        }
      };
      if (chrome.storage.onChanged && typeof chrome.storage.onChanged.addListener === 'function') {
        chrome.storage.onChanged.addListener(listener as any);
        removeListener = () => {
          if (chrome.storage.onChanged && typeof chrome.storage.onChanged.removeListener === 'function') {
            chrome.storage.onChanged.removeListener(listener as any);
          }
        };
      }
    }
    // Always return a cleanup function
    return () => {
      if (removeListener) removeListener();
    };
  }, []);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Function to load wallet sync data
  const loadData = () => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['starknet_address'], (res) => {
        if (res.starknet_address) {
          setSyncAddress(res.starknet_address as string);
          setSyncError(null);
        } else {
          setSyncError("No wallet data found. Please connect in the web tab.");
        }
      });
    }
  };

  // Listen for UI_REFRESH messages and load data
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      const listener = (msg: any) => {
        if (msg.type === "UI_REFRESH") {
          console.log("\uD83D\uDD04 Sidebar Refreshing...");
          loadData();
        }
      };
      chrome.runtime.onMessage.addListener(listener);
      loadData(); // Initial load
      return () => chrome.runtime.onMessage.removeListener(listener);
    }
  }, []);

  return (
    <div className="h-full bg-slate-950 text-slate-200 font-sans">
      {/* Render Error in UI if applicable */}
      {syncError && location.pathname === '/wallet' && (
        <div className="p-2 text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/50 rounded mb-4">
          {syncError}
        </div>
      )}
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
            {/* Tx Status Badge (shows if tx is pending/success/fail) */}
            {txStatus && (
              <div className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 font-mono ml-2">
                Tx: {txStatus}
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