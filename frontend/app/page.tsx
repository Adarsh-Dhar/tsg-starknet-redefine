'use client'

import { useState } from 'react'
import { Home as HomeIcon, FileText, Trophy, Settings, Zap, Upload, BarChart3 } from 'lucide-react'

type View = 'home' | 'logs' | 'leaderboard'

const mockRecentCaptures = [
  { id: 1, name: 'Screenshot #1', time: '2 mins ago', size: '2.4 MB' },
  { id: 2, name: 'Screenshot #2', time: '15 mins ago', size: '1.8 MB' },
  { id: 3, name: 'Screenshot #3', time: '1 hour ago', size: '3.1 MB' },
]

const mockLogs = [
  { id: 1, timestamp: '14:32:15', message: 'System initialized', status: 'success' },
  { id: 2, timestamp: '14:32:18', message: 'Cache loaded from memory', status: 'success' },
  { id: 3, timestamp: '14:32:22', message: 'Network connection established', status: 'success' },
  { id: 4, timestamp: '14:32:45', message: 'Processing large file...', status: 'pending' },
  { id: 5, timestamp: '14:33:01', message: 'Analysis complete', status: 'success' },
  { id: 6, timestamp: '14:33:15', message: 'Waiting for user input', status: 'pending' },
]

const mockLeaderboard = [
  { rank: 1, username: 'AlexNova', score: 12450, avatar: '👨‍💻' },
  { rank: 2, username: 'ZenFlow', score: 11230, avatar: '🧘' },
  { rank: 3, username: 'VortexKing', score: 10890, avatar: '👑' },
  { rank: 4, username: 'Pixel', score: 9870, avatar: '🎨' },
  { rank: 5, username: 'EchoMind', score: 8760, avatar: '🧠' },
  { rank: 6, username: 'FireStorm', score: 7654, avatar: '🔥' },
  { rank: 7, username: 'SilentCode', score: 6543, avatar: '🖥️' },
  { rank: 8, username: 'QuantumLeap', score: 5432, avatar: '⚛️' },
  { rank: 9, username: 'NovaNight', score: 4321, avatar: '🌙' },
  { rank: 10, username: 'PulseWave', score: 3210, avatar: '🌊' },
]

const getMedalColor = (rank: number): string => {
  if (rank === 1) return 'from-yellow-400/30 to-yellow-600/30'
  if (rank === 2) return 'from-gray-300/30 to-gray-500/30'
  if (rank === 3) return 'from-orange-400/30 to-orange-600/30'
  return ''
}

export default function Page() {
  const [currentView, setCurrentView] = useState<View>('home')

  return (
    <div className="min-h-screen w-screen max-w-[400px] mx-auto bg-gradient-to-br from-green-950 via-green-900 to-black overflow-hidden flex flex-col dark">
      {/* Header */}
      <header className="glass-effect glass-glow px-4 py-3 border-b border-green-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white text-sm font-bold">
            EX
          </div>
          <h1 className="text-white font-semibold text-sm">Extension</h1>
        </div>
        <button className="p-1.5 hover:bg-green-500/20 rounded-lg transition-colors">
          <Settings className="w-4 h-4 text-emerald-400" />
        </button>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto px-3 py-4 space-y-3 pb-20">
        {currentView === 'home' && (
          <>
            {/* Main Action Grid */}
            <div className="grid grid-cols-3 gap-3">
              <button className="glass-effect glass-glow aspect-square rounded-xl flex flex-col items-center justify-center group hover:from-emerald-400/20 transition-all hover:neon-glow">
                <Zap className="w-6 h-6 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs text-white font-medium">Scan</span>
              </button>
              <button className="glass-effect glass-glow aspect-square rounded-xl flex flex-col items-center justify-center group hover:from-emerald-400/20 transition-all hover:neon-glow">
                <Upload className="w-6 h-6 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs text-white font-medium">Upload</span>
              </button>
              <button className="glass-effect glass-glow aspect-square rounded-xl flex flex-col items-center justify-center group hover:from-emerald-400/20 transition-all hover:neon-glow">
                <BarChart3 className="w-6 h-6 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs text-white font-medium">Analyze</span>
              </button>
            </div>

            {/* Recent Captures */}
            <div>
              <h2 className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-2 px-1">
                Recent Captures
              </h2>
              <div className="space-y-2">
                {mockRecentCaptures.map((capture) => (
                  <div
                    key={capture.id}
                    className="glass-effect glass-glow p-3 rounded-lg flex items-center justify-between hover:border-emerald-400/40 transition-colors group cursor-pointer"
                  >
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium group-hover:text-emerald-400 transition-colors">
                        {capture.name}
                      </p>
                      <p className="text-emerald-400/60 text-xs">{capture.time}</p>
                    </div>
                    <span className="text-emerald-400/80 text-xs font-mono">{capture.size}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {currentView === 'logs' && (
          <div>
            <h2 className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-3 px-1">
              System Logs
            </h2>
            <div className="space-y-2">
              {mockLogs.map((log) => (
                <div
                  key={log.id}
                  className="glass-effect glass-glow p-3 rounded-lg flex items-center justify-between hover:border-emerald-400/40 transition-colors"
                >
                  <span className="text-emerald-400/80 text-xs font-mono font-semibold">
                    {log.timestamp}
                  </span>
                  <p
                    className={`text-sm flex-1 mx-3 ${
                      log.status === 'success'
                        ? 'text-emerald-300'
                        : 'text-emerald-400/70'
                    }`}
                  >
                    {log.message}
                  </p>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      log.status === 'success'
                        ? 'bg-emerald-400'
                        : 'bg-emerald-300/50 animate-pulse'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'leaderboard' && (
          <div>
            <h2 className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-3 px-1">
              Top Players
            </h2>
            <div className="space-y-2">
              {mockLeaderboard.map((player) => (
                <div
                  key={player.rank}
                  className={`glass-effect glass-glow p-3 rounded-lg flex items-center gap-3 hover:border-emerald-400/40 transition-colors ${
                    getMedalColor(player.rank)
                      ? `bg-gradient-to-r ${getMedalColor(player.rank)}`
                      : ''
                  }`}
                >
                  <div className="flex-shrink-0 w-6 text-center">
                    {player.rank <= 3 ? (
                      <span className="text-lg font-bold">
                        {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : '🥉'}
                      </span>
                    ) : (
                      <span className="text-white font-bold text-sm">{player.rank}</span>
                    )}
                  </div>
                  <span className="text-xl">{player.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">
                      {player.username}
                    </p>
                  </div>
                  <span className="text-emerald-400 font-bold text-sm">
                    {player.score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="glass-effect glass-glow border-t border-green-500/20 px-2 py-2 fixed bottom-0 left-0 right-0 max-w-[400px] mx-auto flex justify-around items-center">
        <button
          onClick={() => setCurrentView('home')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
            currentView === 'home'
              ? 'bg-gradient-to-b from-emerald-400/40 to-emerald-500/20 neon-glow text-emerald-400'
              : 'text-emerald-300/60 hover:text-emerald-300'
          }`}
        >
          <HomeIcon className="w-5 h-5" />
          <span className="text-xs font-medium">Home</span>
        </button>
        <button
          onClick={() => setCurrentView('logs')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
            currentView === 'logs'
              ? 'bg-gradient-to-b from-emerald-400/40 to-emerald-500/20 neon-glow text-emerald-400'
              : 'text-emerald-300/60 hover:text-emerald-300'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-xs font-medium">Logs</span>
        </button>
        <button
          onClick={() => setCurrentView('leaderboard')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
            currentView === 'leaderboard'
              ? 'bg-gradient-to-b from-emerald-400/40 to-emerald-500/20 neon-glow text-emerald-400'
              : 'text-emerald-300/60 hover:text-emerald-300'
          }`}
        >
          <Trophy className="w-5 h-5" />
          <span className="text-xs font-medium">Leaderboard</span>
        </button>
      </nav>
    </div>
  )
}
