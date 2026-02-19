'use client';

import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle,Home, FileText, Trophy, Settings as SettingsIcon, Wallet } from 'lucide-react'
import Dashboard from './components/Dashboard'
import GrassReminder from './components/GrassReminder'
import Settings from './components/Settings'
import InsightsPage from './InsightsPage'
import LeaderboardPage from './LeaderboardPage'
import WalletPage from './WalletPage'

type View = 'dashboard' | 'insights' | 'settings' | 'leaderboard'

function AppRoutes() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [screenTime, setScreenTime] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(180); // 3 hours in minutes
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const interval = setInterval(() => {
      setScreenTime((prev) => {
        const newTime = prev + Math.random() * 2;
        return newTime > dailyGoal ? dailyGoal : newTime;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [dailyGoal]);

  const screenTimePercentage = Math.min((screenTime / dailyGoal) * 100, 100);
  const isExceeded = screenTime > dailyGoal;
  const breakRequired = screenTime > 0 && screenTime % 30 === 0;

  // Navigation for bottom nav and header
  const handleNav = (view: View | 'wallet') => {
    if (view === 'wallet') {
      navigate('/wallet');
    } else {
      setCurrentView(view);
      if (location.pathname !== '/') navigate('/');
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-green-950 to-slate-950 flex flex-col">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="glass-effect glass-glow px-6 py-4 border-b border-emerald-500/20">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white font-bold text-lg">
                🌱
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Touch Some Grass</h1>
                <p className="text-xs text-emerald-300/70">Screen Time Monitor</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <button
                aria-label="Settings"
                className={`p-2 rounded-full hover:bg-emerald-500/10 transition-colors ${currentView === 'settings' ? 'bg-emerald-500/10' : ''}`}
                onClick={() => handleNav('settings')}
              >
                <SettingsIcon className={`w-6 h-6 ${currentView === 'settings' ? 'text-emerald-400' : 'text-emerald-300/70'}`} />
              </button>
              <button
                aria-label="Wallet"
                className={`p-2 rounded-full hover:bg-emerald-500/10 transition-colors ${location.pathname === '/wallet' ? 'bg-emerald-500/10' : ''}`}
                onClick={() => handleNav('wallet')}
              >
                <Wallet className={`w-6 h-6 ${location.pathname === '/wallet' ? 'text-emerald-400' : 'text-emerald-300/70'}`} />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-24">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-6">
            <Routes>
              <Route
                path="/"
                element={
                  <>
                    {/* Alert Section */}
                    {isExceeded && (
                      <div className="glass-effect glass-glow p-4 rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/10 to-red-500/5 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-red-300 mb-1">Daily Goal Exceeded</h3>
                          <p className="text-sm text-red-200/80">
                            You've exceeded your daily screen time goal. Time to take a break and touch some grass!
                          </p>
                        </div>
                      </div>
                    )}
                    {breakRequired && screenTime > 0 && <GrassReminder screenTime={screenTime} />}
                    {/* Content Views */}
                    {currentView === 'dashboard' && (
                      <Dashboard screenTime={screenTime} dailyGoal={dailyGoal} percentage={screenTimePercentage} />
                    )}
                    {currentView === 'insights' && (
                      <InsightsPage screenTime={screenTime} dailyGoal={dailyGoal} />
                    )}
                    {currentView === 'leaderboard' && <LeaderboardPage />}
                    {currentView === 'settings' && <Settings dailyGoal={dailyGoal} onGoalChange={setDailyGoal} />}
                  </>
                }
              />
              <Route path="/wallet" element={<WalletPage />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {location.pathname === '/' && (
        <nav className="glass-effect glass-glow border-t border-emerald-500/20 fixed bottom-0 left-0 right-0 max-w-6xl mx-auto w-full z-20">
          <div className="flex items-center justify-around md:justify-center md:gap-8">
            {[
              { id: 'dashboard' as const, icon: Home, label: 'Home' },
              { id: 'insights' as const, icon: FileText, label: 'Insights' },
              { id: 'leaderboard' as const, icon: Trophy, label: 'Leaderboard' },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => handleNav(id)}
                className={`flex flex-col items-center justify-center gap-1 px-4 py-3 flex-1 transition-all duration-200 text-center ${
                  currentView === id
                    ? 'bg-gradient-to-t from-emerald-400/20 to-emerald-500/10'
                    : 'hover:bg-emerald-500/5'
                }`}
                style={{ minWidth: 0 }}
              >
                <Icon className={`w-7 h-7 transition-colors ${currentView === id ? 'text-emerald-400' : 'text-emerald-300/60'}`} />
                <span
                  className={`text-xs font-medium transition-colors ${
                    currentView === id ? 'text-emerald-400' : 'text-emerald-300/60'
                  }`}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
