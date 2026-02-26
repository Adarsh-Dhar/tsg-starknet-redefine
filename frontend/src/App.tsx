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
  const [brainrotScore, setBrainrotScore] = useState<number>(0);
  const [syncAddress, setSyncAddress] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = () => {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.get(['realtime_stats', 'starknet_address'], (res) => {
          if (res.starknet_address) setSyncAddress(res.starknet_address as string);
          const stats = res.realtime_stats as { brainrotScore: number } | undefined;
          if (stats && typeof stats.brainrotScore === 'number') {
            setBrainrotScore(stats.brainrotScore);
          }
        });
      }
    };

    // Load immediately on mount
    loadStats();

    // Poll every second — scores update continuously without waiting for messages
    const intervalId = setInterval(loadStats, 1000);

    // Still listen for background push messages as a fast path
    const listener = (msg: any) => {
      if (msg.type === "UI_REFRESH") loadStats();
    };
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(listener);
    }

    return () => {
      clearInterval(intervalId);
      if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(listener);
      }
    };
  }, []); // empty deps — loadStats is defined inside, no closure risk

  return (
    <Routes>
      <Route path="/" element={
        <Dashboard 
          syncAddress={syncAddress}
          brainrotScore={brainrotScore} 
        />
      } />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/wallet" element={<WalletPage />} />
      <Route path="/data" element={<DataPage />} />
    </Routes>
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