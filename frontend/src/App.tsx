import { useState, useEffect, JSX } from 'react';
import { HashRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Database, 
  Wallet, 
  BarChart3, 
  Trophy 
} from 'lucide-react';
import { Contract, RpcProvider, type Abi } from 'starknet';

// Page Imports
import LoginPage from './LoginPage';
import DataPage from './DataPage';
import WalletPage from './WalletPage';
import InsightsPage from './InsightsPage';
import LeaderboardPage from './LeaderboardPage';
import Dashboard from './components/Dashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import GravityVaultAbiJson from './abi/GravityVault.json';

const GRAVITY_VAULT_ABI = (GravityVaultAbiJson as any).abi as Abi;
const DEFAULT_VAULT_ADDRESS = '0x07b39de5a2105f65e9103098a89b0e4c47cae47b2ed4f4012c63d0af61ec416e';
const VAULT_ADDRESS = (import.meta.env.VITE_VAULT_ADDRESS || DEFAULT_VAULT_ADDRESS).trim();
const RPC_URL = (import.meta.env.VITE_STARKNET_RPC || 'https://starknet-sepolia.public.blastapi.io').trim();

// Interface for server data structure
interface RealtimeStats {
  screenTimeMinutes: number;
  brainrotScore: number;
}

function AppContent() {
  const { user, token, loading, isAuthenticated, logout } = useAuth();
  
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
  
  // Debug logs
  useEffect(() => {
    // This space is intentionally left blank after removing console.logs
  }, [loading, isAuthenticated, user]);

  // Seed local delegation state from authenticated user profile
  // (important for web app where extension storage may not exist)
  useEffect(() => {
    if (!user) return;

    const userDelegatedAmount = user.amountDelegated ?? 0;
    setDelegatedAmount(userDelegatedAmount);
    setHasDelegated(userDelegatedAmount >= 1);

    if (user.starknetAddr) {
      setSyncAddress(user.starknetAddr);
    }
  }, [user]);

  // Log address and delegation when data is synced
  useEffect(() => {
    if (user && syncAddress && delegatedAmount !== undefined) {
      // This space is intentionally left blank after removing console.logs
    }
  }, [user, syncAddress, delegatedAmount, hasDelegated]);

  // On-chain vault balance is the source of truth for gating access.
  // This prevents false "Delegation Required" when DB/cache is stale.
  useEffect(() => {
    const addressToCheck = syncAddress || user?.starknetAddr;
    if (!addressToCheck) return;

    let cancelled = false;

    const refreshOnChainDelegation = async () => {
      try {
        const provider = new RpcProvider({ nodeUrl: RPC_URL });
        const vault = new Contract({ abi: GRAVITY_VAULT_ABI, address: VAULT_ADDRESS, providerOrAccount: provider });
        const result = await (vault as any).get_balance(addressToCheck);

        let wei = 0n;
        if (typeof result === 'bigint') {
          wei = result;
        } else if (result?.low !== undefined && result?.high !== undefined) {
          wei = BigInt(result.low ?? '0') + (BigInt(result.high ?? '0') << 128n);
        } else if (Array.isArray(result)) {
          wei = BigInt(result[0] ?? '0') + (BigInt(result[1] ?? '0') << 128n);
        }

        const onChainAmount = Number(wei) / 10 ** 18;
        if (cancelled) return;

        // Use highest confidence value so stale DB cannot lock the user out.
        setDelegatedAmount((prev) => Math.max(prev, onChainAmount));
        setHasDelegated(onChainAmount >= 1);
      } catch {
        // Keep existing values on RPC failure.
      }
    };

    refreshOnChainDelegation();
    const interval = setInterval(refreshOnChainDelegation, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [syncAddress, user?.starknetAddr]);

  // Listen for chrome.storage changes from background script (activity tracking updates)
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      return; // Not in extension context
    }

    // Load initial stats from storage
    chrome.storage.local.get(['realtime_stats'], (res) => {
      if (res.realtime_stats) {
        setGlobalStats(res.realtime_stats as RealtimeStats);
      }
    });

    // Listen for storage changes
    const handleStorageChange = (changes: Record<string, any>) => {
      if (changes.realtime_stats) {
        setGlobalStats(changes.realtime_stats.newValue as RealtimeStats);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  useEffect(() => {
    // Detect if running in Chrome Extension protocol or restricted width
    const checkEnvironment = () => {
      const isExtProtocol = window.location.protocol === 'chrome-extension:';
      const isSidePanelWidth = window.innerWidth <= 450;
      setIsExtension(isExtProtocol || isSidePanelWidth);
    };

    checkEnvironment();

    // Verify delegation status from backend API (Source of Truth)
    const verifyDelegation = async (address: string) => {
      try {
        const response = await fetch(`http://localhost:3333/api/verify-delegation?address=${address}`);
        if (!response.ok) {
          // This space is intentionally left blank after removing console.logs
          return;
        }
        
        const data = await response.json();
        
        if (data.success) {
          // This space is intentionally left blank after removing console.logs
          // Log with email if user is available
          if (user) {
            // This space is intentionally left blank after removing console.logs
          }
          setDelegatedAmount(data.amountDelegated);
          setHasDelegated(data.amountDelegated >= 1);
        } else {
          // This space is intentionally left blank after removing console.logs
        }
      } catch (error) {
        // Fallback to local storage if backend fails
        if (chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(['starknet_address', 'delegated_amount', 'user_email'], (res) => {
            if (res.starknet_address) {
              setSyncAddress(res.starknet_address as string);
            }
            if (res.delegated_amount) {
              setDelegatedAmount(res.delegated_amount as number);
              setHasDelegated(res.delegated_amount as number >= 1);
            }
          });
        }
      }
    };
    
  }, [user]);

  return (
    <Router>
      <div className={`min-h-screen bg-slate-950 text-emerald-50 flex flex-col transition-all duration-300 ${
        isExtension ? 'w-[400px] h-[820px] overflow-hidden' : 'w-full'
      }`}>
        
        {/* Show loading state while checking authentication */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-emerald-400 text-sm">Loading...</p>
            </div>
          </div>
        )}

        {/* Show loading if authenticated but user info not yet loaded */}
        {!loading && isAuthenticated && !user && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-emerald-400 text-sm">Loading user info...</p>
            </div>
          </div>
        )}

        {/* Show login page if not authenticated */}
        {!loading && !isAuthenticated && (() => {
          return (
            <main className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
              <LoginPage />
            </main>
          );
        })()}

        {/* Show main app if authenticated */}
        {!loading && isAuthenticated && user && (() => {
          // This space is intentionally left blank after removing console.logs
          return (
          <>
            {/* Main Scrollable Content Area */}
            <main className="flex-1 overflow-y-auto p-4 pb-24 custom-scrollbar">
              <Routes>
                {/* Check if user has delegated, if not redirect to wallet delegation portal */}
                <Route path="/" element={
                  delegatedAmount >= 1 ? (
                    <Dashboard 
                      brainrotScore={globalStats.brainrotScore}
                      syncAddress={syncAddress ?? user.starknetAddr}
                      delegatedAmount={delegatedAmount}
                      hasDelegated={delegatedAmount >= 1}
                      userEmail={user.email}
                    />
                  ) : (
                    <DelegationGate userEmail={user.email} />
                  )
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
                <button
                  onClick={async () => {
                    await logout();
                  }}
                  className="flex flex-col items-center gap-1 flex-1 text-emerald-500/40 hover:text-rose-400 transition-all text-[9px] font-bold uppercase tracking-tight"
                  title="Logout"
                >
                  <div className="p-1 rounded-lg">🚪</div>
                  <span>Logout</span>
                </button>
              </div>
            </nav>
          </>
          );
        })()}
      </div>
    </Router>
  );
}

/**
 * Component shown when user hasn't delegated yet
 */
function DelegationGate({ userEmail }: { userEmail?: string }) {
  return (
    <div className="max-w-md mx-auto p-6 rounded-2xl glass-effect glass-glow border border-amber-500/20 bg-amber-900/5 animate-in fade-in duration-500">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black tracking-tight text-amber-400 glow-text">Delegation Required</h2>
        <p className="text-[11px] uppercase tracking-wider text-amber-300/60 mt-1 font-bold">
          Please delegate at least 1 STRK to use this extension
        </p>
      </div>

      <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <p className="text-sm text-amber-200 leading-relaxed">
          To unlock this extension and start tracking your screen time, you need to delegate a minimum of 1 STRK token.
        </p>
      </div>

      <a
        href={`http://localhost:5174?email=${encodeURIComponent(userEmail || '')}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-black uppercase tracking-wide hover:bg-amber-400 transition-all active:scale-[0.99] text-center"
      >
        Go to Delegation Portal
      </a>

      <p className="text-[10px] text-amber-300/50 text-center mt-4">
        The portal will open in a new tab. Complete the delegation and your account will be updated automatically.
      </p>
    </div>
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

/**
 * Main App with AuthProvider wrapper
 */
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}