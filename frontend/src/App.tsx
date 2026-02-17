
import { useState } from 'react';
import { BarChart3, Settings as SettingsIcon, Home, Zap } from 'lucide-react';
import Dashboard from './components/Dashboard';
import { Settings } from './components/Settings';
import WalletPage from './components/WalletPage';
import WeeklyChart from './components/WeeklyChart';
// 1. IMPORT YOUR NEW COMPONENTS HERE
function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'insights' | 'leaderboard'>('home');
  // Add state for Dashboard props
  const [screenTime, setScreenTime] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(180); // 3 hours in minutes
  const percentage = Math.min((screenTime / dailyGoal) * 100, 100);

  return (
    <div className="w-[400px] h-[600px] bg-slate-50 dark:bg-slate-900 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center border border-green-200 dark:border-green-800">
            <Zap className="w-6 h-6 text-green-600 dark:text-green-500" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-800 dark:text-slate-100 leading-tight">Touch Grass</h1>
            <p className="text-xs text-slate-500 font-medium tracking-wide">Focus Enforcer</p>
          </div>
        </div>
        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <SettingsIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 relative">
        {activeTab === 'home' && (
          <div className="pb-6">
            {/* 2. RENDER THE WALLET AND DELEGATION SETUP HERE */}
            <div className="px-4 pt-4">
              <Settings />
            </div>
            <WalletPage />
            <Dashboard screenTime={screenTime} dailyGoal={dailyGoal} percentage={percentage} />
          </div>
        )}

        {activeTab === 'insights' && <WeeklyChart />}

        {activeTab === 'leaderboard' && (
          <div className="p-6 flex flex-col items-center justify-center h-full text-slate-500">
            <Zap className="w-12 h-12 text-slate-300 mb-4" />
            <h2 className="font-bold text-lg mb-2">Leaderboard</h2>
            <p className="text-sm text-center">Compare your focus score with friends. Coming soon.</p>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-3 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${
            activeTab === 'home' 
              ? 'text-green-600 bg-green-50 dark:bg-green-900/20' 
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Home className={`w-6 h-6 ${activeTab === 'home' ? 'drop-shadow-sm' : ''}`} />
          <span className="text-[10px] font-semibold">Home</span>
        </button>

        <button 
          onClick={() => setActiveTab('insights')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${
            activeTab === 'insights' 
              ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' 
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className={`w-6 h-6 ${activeTab === 'insights' ? 'drop-shadow-sm' : ''}`} />
          <span className="text-[10px] font-semibold">Insights</span>
        </button>

        <button 
          onClick={() => setActiveTab('leaderboard')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${
            activeTab === 'leaderboard' 
              ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' 
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Zap className={`w-6 h-6 ${activeTab === 'leaderboard' ? 'drop-shadow-sm' : ''}`} />
          <span className="text-[10px] font-semibold">Rank</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
