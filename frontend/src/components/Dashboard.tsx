import { CheckCircle2, AlertCircle, Clock, Zap } from 'lucide-react'

interface DashboardProps {
  screenTime: number
  dailyGoal: number
  percentage: number
}

const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = Math.floor(minutes % 60)
  if (hours === 0) return `${mins}m`
  return `${hours}h ${mins}m`
}

export default function Dashboard({ screenTime, dailyGoal, percentage }: DashboardProps) {
  const remaining = Math.max(0, dailyGoal - screenTime)
  const isGood = percentage < 50
  const isWarning = percentage >= 50 && percentage < 100
  const isExceeded = percentage >= 100

  return (
    <div className="space-y-6">
      {/* Main Circle Progress */}
      <div className="glass-effect glass-glow rounded-2xl p-8 flex flex-col items-center justify-center">
        <div className="relative w-48 h-48 mb-6">
          {/* Background circle */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="rgba(16, 185, 129, 0.2)"
              strokeWidth="12"
            />
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke={
                isGood
                  ? 'url(#gradientGood)'
                  : isWarning
                    ? 'url(#gradientWarning)'
                    : 'url(#gradientExceeded)'
              }
              strokeWidth="12"
              strokeDasharray={`${(percentage / 100) * 565.48} 565.48`}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
            <defs>
              <linearGradient id="gradientGood" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
              <linearGradient id="gradientWarning" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
              <linearGradient id="gradientExceeded" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#f87171" />
              </linearGradient>
            </defs>
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-white mb-1">{Math.round(percentage)}%</div>
            <div className="text-sm text-emerald-300/70">of daily goal</div>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">{formatTime(screenTime)}</h2>
          <p className="text-sm text-emerald-300/70">Screen time today</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Usage */}
        <div className="glass-effect glass-glow rounded-xl p-6 border border-emerald-500/20">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-white">Current Usage</h3>
          </div>
          <div className="text-3xl font-bold text-emerald-400 mb-1">
            {formatTime(screenTime)}
          </div>
          <p className="text-sm text-emerald-300/60">minutes used</p>
        </div>

        {/* Daily Goal */}
        <div className="glass-effect glass-glow rounded-xl p-6 border border-emerald-500/20">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h3 className="font-semibold text-white">Daily Goal</h3>
          </div>
          <div className="text-3xl font-bold text-yellow-400 mb-1">
            {formatTime(dailyGoal)}
          </div>
          <p className="text-sm text-emerald-300/60">target time</p>
        </div>

        {/* Remaining */}
        <div className="glass-effect glass-glow rounded-xl p-6 border border-emerald-500/20">
          <div className="flex items-center gap-3 mb-4">
            {isExceeded ? (
              <AlertCircle className="w-5 h-5 text-red-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            )}
            <h3 className="font-semibold text-white">
              {isExceeded ? 'Over Goal' : 'Remaining'}
            </h3>
          </div>
          <div
            className={`text-3xl font-bold mb-1 ${
              isExceeded ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {isExceeded ? '+' : ''}
            {formatTime(isExceeded ? screenTime - dailyGoal : remaining)}
          </div>
          <p className="text-sm text-emerald-300/60">
            {isExceeded ? 'over limit' : 'until goal'}
          </p>
        </div>
      </div>

      {/* Status Message */}
      <div className="glass-effect glass-glow rounded-xl p-6 border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5">
        <div className="flex items-center gap-3">
          {isGood ? (
            <>
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-emerald-300 mb-1">Great Job!</h3>
                <p className="text-sm text-emerald-200/80">
                  You're doing well staying under your screen time goal. Keep it up!
                </p>
              </div>
            </>
          ) : isWarning ? (
            <>
              <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-yellow-300 mb-1">Getting Close</h3>
                <p className="text-sm text-yellow-200/80">
                  You're approaching your daily screen time goal. Consider taking a break soon!
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-300 mb-1">Goal Exceeded</h3>
                <p className="text-sm text-red-200/80">
                  You've reached your daily screen time limit. Step outside and touch some grass! 🌿
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
