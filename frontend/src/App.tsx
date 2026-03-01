import { useState, useEffect, JSX } from 'react';
import { HashRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Database, 
  Wallet, 
  BarChart3, 
  Trophy 
} from 'lucide-react';

// Page Imports
import DataPage from './DataPage';
import WalletPage from './WalletPage';
import InsightsPage from './InsightsPage';
import LeaderboardPage from './LeaderboardPage';
import Dashboard from './components/Dashboard';

// Interface for server data structure
interface RealtimeStats {
  screenTimeMinutes: number;
  brainrotScore: number;
}

export default function App() {
  // 1. Responsive State & Environment Detection
  const [isExtension, setIsExtension] = useState(false);
  
  // 2. Data Synchronization State
  const [globalStats, setGlobalStats] = useState<RealtimeStats>({ 
    brainrotScore: 0, 
    screenTimeMinutes: 0 
  });
  const [syncAddress, setSyncAddress] = useState<string | null>(null);
  const [hasDelegated, setHasDelegated] = useState(false);
  const [delegatedAmount, setDelegatedAmount] = useState<number>(0);

  useEffect(() => {
    // Detect if running in Chrome Extension protocol or restricted width
    const checkEnvironment = () => {
      const isExtProtocol = window.location.protocol === 'chrome-extension:';
      const isSidePanelWidth = window.innerWidth <= 450;
      setIsExtension(isExtProtocol || isSidePanelWidth);
    };

    // Initial Data Fetch from Extension Storage
    const refreshData = () => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['realtime_stats', 'starknet_address', 'delegated_amount'], (res) => {
          if (res.realtime_stats) {
            setGlobalStats(res.realtime_stats as RealtimeStats);
          }
          if (res.starknet_address) {
            setSyncAddress(res.starknet_address as string);
          }
          // Add this to track authorization
          if (res.delegated_amount !== undefined) {
            setDelegatedAmount(Number(res.delegated_amount));
            setHasDelegated(Number(res.delegated_amount) >= 1);
          } else {
            setDelegatedAmount(0);
            setHasDelegated(false);
          }
        });
      }
    };

    // Setup Environment listeners
    checkEnvironment();
    window.addEventListener('resize', checkEnvironment);
    
    // Setup Storage & Message listeners
    refreshData();

    let messageListener: ((msg: any) => void) | undefined;
    let addedRuntimeListener = false;
    let addedStorageListener = false;

    if (typeof chrome !== 'undefined') {
      if (chrome.runtime && typeof chrome.runtime.onMessage !== 'undefined' && typeof chrome.runtime.onMessage.addListener === 'function') {
        messageListener = (msg: any) => {
          if (msg.type === "UI_REFRESH") refreshData();
        };
        chrome.runtime.onMessage.addListener(messageListener);
        addedRuntimeListener = true;
      }
      if (chrome.storage && typeof chrome.storage.onChanged !== 'undefined' && typeof chrome.storage.onChanged.addListener === 'function') {
        chrome.storage.onChanged.addListener(refreshData);
        addedStorageListener = true;
      }
    }

    return () => {
      window.removeEventListener('resize', checkEnvironment);
      if (addedRuntimeListener && messageListener && chrome.runtime && typeof chrome.runtime.onMessage.removeListener === 'function') {
        chrome.runtime.onMessage.removeListener(messageListener);
      }
      if (addedStorageListener && chrome.storage && typeof chrome.storage.onChanged.removeListener === 'function') {
        chrome.storage.onChanged.removeListener(refreshData);
      }
    };
  }, []);

  return (
    <Router>
      <div className={`min-h-screen bg-slate-950 text-emerald-50 flex flex-col transition-all duration-300 ${
        isExtension ? 'w-[400px] h-[820px] overflow-hidden' : 'w-full'
      }`}>
        
        {/* Main Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 custom-scrollbar">
          <Routes>
            {/* FIX: Passing dynamic state instead of hardcoded 0 */}
            <Route path="/" element={
              <Dashboard 
                brainrotScore={globalStats.brainrotScore}
                syncAddress={syncAddress}
                delegatedAmount={delegatedAmount}
                hasDelegated={hasDelegated}
              />
            } />
            <Route path="/data" element={<DataPage />} />
            <Route path="/insights" element={
              <InsightsPage 
                screenTime={globalStats.screenTimeMinutes} 
                dailyGoal={180} 
              />
            } />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/wallet" element={<WalletPage />} />
          </Routes>
        </main>

        {/* Dynamic Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md border-t border-emerald-500/20 px-4 py-3 z-50">
          <div className="flex justify-between items-center max-w-lg mx-auto gap-1">
            <NavButton to="/" icon={<LayoutDashboard size={20} />} label="Home" />
            <NavButton to="/data" icon={<Database size={20} />} label="Data" />
            <NavButton to="/insights" icon={<BarChart3 size={20} />} label="Stats" />
            <NavButton to="/leaderboard" icon={<Trophy size={20} />} label="Ranks" />
            <NavButton to="/wallet" icon={<Wallet size={20} />} label="Wallet" />
          </div>
        </nav>
      </div>
    </Router>
  );
}

/**
 * Reusable Navigation Button Component
 */
function NavButton({ to, icon, label }: { to: string; icon: JSX.Element; label: string }) {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => `flex flex-col items-center gap-1 flex-1 transition-all ${
        isActive 
          ? 'text-emerald-400 scale-110' 
          : 'text-emerald-500/40 hover:text-emerald-300'
      }`}
    >
      <div className="p-1 rounded-lg">
        {icon}
      </div>
      <span className="text-[9px] font-bold uppercase tracking-tight">{label}</span>
    </NavLink>
  );
}