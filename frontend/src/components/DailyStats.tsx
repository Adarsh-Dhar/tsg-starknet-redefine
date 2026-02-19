import { TrendingDown, TrendingUp } from 'lucide-react'

interface DailyStatsProps {
  screenTime: number
  dailyGoal: number
}

const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = Math.floor(minutes % 60)
  if (hours === 0) return `${mins}m`
  return `${hours}h ${mins}m`
}

export default function DailyStats({ screenTime, dailyGoal }: DailyStatsProps) {
  const dailyStats = [
    { day: 'Mon', time: 145, status: 'good' },
    { day: 'Tue', time: 187, status: 'warning' },
    { day: 'Wed', time: 201, status: 'exceeded' },
    { day: 'Thu', time: 163, status: 'good' },
    { day: 'Fri', time: 225, status: 'exceeded' },
    { day: 'Sat', time: 89, status: 'good' },
    { day: 'Sun', time: screenTime, status: screenTime > dailyGoal ? 'exceeded' : 'good' },
  ]

  const avgTime = Math.round(dailyStats.reduce((sum, stat) => sum + stat.time, 0) / dailyStats.length)
  const trend = screenTime < dailyGoal ? 'down' : 'up'

  return (
    <div className="space-y-6">
      {/* Weekly Overview */}
      <div className="glass-effect glass-glow rounded-xl p-6 border border-emerald-500/20">
        <h2 className="text-xl font-bold text-white mb-6">Weekly Overview</h2>

        {/* Daily Bars */}
        <div className="space-y-4">
          {dailyStats.map((stat) => {
            const percentage = (stat.time / dailyGoal) * 100
            const statusColor =
              stat.status === 'good'
                ? 'from-emerald-400 to-emerald-500'
                : stat.status === 'warning'
                  ? 'from-yellow-400 to-yellow-500'
                  : 'from-red-400 to-red-500'

            return (
              <div key={stat.day}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white text-sm">{stat.day}</span>
                  <span
                    className={`text-sm font-semibold ${
                      stat.status === 'good'
                        ? 'text-emerald-400'
                        : stat.status === 'warning'
                          ? 'text-yellow-400'
                          : 'text-red-400'
                    }`}
                  >
                    {formatTime(stat.time)}
                  </span>
                </div>
                <div className="h-2 bg-emerald-500/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${statusColor} transition-all duration-300`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-effect glass-glow rounded-xl p-6 border border-emerald-500/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Average</h3>
            <TrendingDown className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-400 mb-1">
            {formatTime(avgTime)}
          </div>
          <p className="text-sm text-emerald-300/60">per day this week</p>
        </div>

        <div className="glass-effect glass-glow rounded-xl p-6 border border-emerald-500/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Peak Day</h3>
            <TrendingUp className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-3xl font-bold text-yellow-400 mb-1">
            {formatTime(Math.max(...dailyStats.map((s) => s.time)))}
          </div>
          <p className="text-sm text-emerald-300/60">highest usage</p>
        </div>

        <div className="glass-effect glass-glow rounded-xl p-6 border border-emerald-500/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Trend</h3>
            {trend === 'down' ? (
              <TrendingDown className="w-5 h-5 text-emerald-400" />
            ) : (
              <TrendingUp className="w-5 h-5 text-red-400" />
            )}
          </div>
          <div
            className={`text-3xl font-bold mb-1 ${
              trend === 'down' ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {trend === 'down' ? '↓' : '↑'} {Math.abs(Math.round(screenTime - avgTime))}m
          </div>
          <p className="text-sm text-emerald-300/60">vs weekly average</p>
        </div>
      </div>
    </div>
  )
}
