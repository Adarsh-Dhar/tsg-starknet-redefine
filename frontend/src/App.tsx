import { useState, useEffect, JSX } from 'react';
import { HashRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Database, 
  Wallet, 
  BarChart3, 
  Trophy 
} from 'lucide-react';

// Page Imports
import LoginPage from './LoginPage';
import DataPage from './DataPage';
import WalletPage from './WalletPage';
import InsightsPage from './InsightsPage';
import LeaderboardPage from './LeaderboardPage';
import Dashboard from './components/Dashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Interface for server data structure
interface RealtimeStats {
  screenTimeMinutes: number;
  brainrotScore: number;
}

function AppContent() {
  const { user, token, loading, isAuthenticated, logout } = useAuth();
  
  // Debug logs
  useEffect(() => {
    console.log('[App] Auth state changed:', {
      loading,
      isAuthenticated,
      hasUser: !!user,
      user: user ? { email: user.email, amountDelegated: user.amountDelegated } : null
    });
  }, [loading, isAuthenticated, user]);
  
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

    // Verify delegation status from backend API (Source of Truth)
    const verifyAuth = async (address: string) => {
      try {
        console.log('[Auth] Verifying delegation status for:', address);
        const response = await fetch(`http://localhost:3333/api/delegate/status/${address}`);
        const data = await response.json();
        
        if (data.success) {
          console.log('[Auth] ✅ Backend response received:', {
            address: address,
            amountDelegated: data.amountDelegated,
            hasAccess: data.amountDelegated >= 1
          });
          // Use the database as the "Source of Truth"
          setDelegatedAmount(data.amountDelegated);
          setHasDelegated(data.amountDelegated >= 1);
          
          // Update local storage so the UI doesn't flicker on next open
          if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ 
              delegated_amount: data.amountDelegated 
            }, () => {
              console.log('[Auth] ✅ Synced delegation data from backend:', data.amountDelegated, 'STRK');
            });
          }
        } else {
          console.log('[Auth] ⚠️ Backend returned success=false:', data);
          setHasDelegated(false);
          setDelegatedAmount(0);
        }
      } catch (err) {
        console.error('[Auth] ❌ DB verification failed:', err);
        // Fallback to local storage if backend is unavailable
        console.log('[Auth] Falling back to cached local storage');
      }
    };

    // Initial Data Fetch from Extension Storage
    const refreshData = () => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['realtime_stats', 'starknet_address', 'delegated_amount'], (res) => {
          console.log('[Storage] Current data:', res);
          
          if (res.realtime_stats) {
            setGlobalStats(res.realtime_stats as RealtimeStats);
          }
          
          if (res.starknet_address) {
            console.log('[Extension] Connected address detected:', res.starknet_address);
            setSyncAddress(res.starknet_address as string);
            // CRITICAL: Always verify with backend when we detect an address
            // This ensures the extension gets the latest delegation state
            verifyAuth(res.starknet_address as string);
          } else {
            console.log('[Extension] No address detected in storage. User must sync in Wallet tab.');
            setHasDelegated(false);
            setDelegatedAmount(0);
          }
          
          // Set initial values from cache (will be updated by verifyAuth)
          if (res.delegated_amount !== undefined) {
            console.log('[Storage] Cached delegation amount:', res.delegated_amount);
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

    // Poll backend for delegation status every 30 seconds
    const pollInterval = setInterval(() => {
      if (syncAddress) {
        verifyAuth(syncAddress);
      }
    }, 30000);

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
      clearInterval(pollInterval);
      if (addedRuntimeListener && messageListener && chrome.runtime && typeof chrome.runtime.onMessage.removeListener === 'function') {
        chrome.runtime.onMessage.removeListener(messageListener);
      }
      if (addedStorageListener && chrome.storage && typeof chrome.storage.onChanged.removeListener === 'function') {
        chrome.storage.onChanged.removeListener(refreshData);
      }
    };
  }, [syncAddress]);

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
          console.log('[App] Rendering: LoginPage');
          return (
            <main className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
              <LoginPage />
            </main>
          );
        })()}

        {/* Show main app if authenticated */}
        {!loading && isAuthenticated && user && (() => {
          console.log('[App] Rendering: Authenticated view', {
            userEmail: user.email,
            delegated: user.amountDelegated,
            willShow: user.amountDelegated >= 1 ? 'Dashboard' : 'DelegationGate'
          });
          return (
          <>
            {/* Main Scrollable Content Area */}
            <main className="flex-1 overflow-y-auto p-4 pb-24 custom-scrollbar">
              <Routes>
                {/* Check if user has delegated, if not redirect to wallet delegation portal */}
                <Route path="/" element={
                  user.amountDelegated >= 1 ? (
                    <Dashboard 
                      brainrotScore={globalStats.brainrotScore}
                      syncAddress={user.starknetAddr}
                      delegatedAmount={user.amountDelegated}
                      hasDelegated={user.amountDelegated >= 1}
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