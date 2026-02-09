export default function WeeklyChart() {
  const weeklyData = [
    { week: 'Week 1', minutes: 1156, trend: 'up' },
    { week: 'Week 2', minutes: 1034, trend: 'down' },
    { week: 'Week 3', minutes: 1187, trend: 'up' },
    { week: 'Week 4', minutes: 945, trend: 'down' },
  ]

  const maxMinutes = Math.max(...weeklyData.map((d) => d.minutes))

  return (
    <div className="glass-effect glass-glow rounded-xl p-6 border border-emerald-500/20">
      <h2 className="text-xl font-bold text-white mb-6">Monthly Trend</h2>

      <div className="space-y-4">
        {weeklyData.map((data) => {
          const percentage = (data.minutes / (maxMinutes * 1.1)) * 100
          const statusColor = data.trend === 'down' ? 'from-emerald-400 to-emerald-500' : 'from-yellow-400 to-yellow-500'

          return (
            <div key={data.week}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white text-sm">{data.week}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-emerald-300">
                    {Math.round(data.minutes / 60)}h {data.minutes % 60}m
                  </span>
                  <span className={`text-xs font-bold ${data.trend === 'down' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                    {data.trend === 'down' ? '↓' : '↑'}
                  </span>
                </div>
              </div>
              <div className="h-3 bg-emerald-500/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${statusColor} transition-all duration-300`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Statistics */}
      <div className="mt-6 pt-6 border-t border-emerald-500/20 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-emerald-400 mb-1">
            {Math.round(weeklyData.reduce((sum, d) => sum + d.minutes, 0) / 4 / 60)}h
          </div>
          <p className="text-xs text-emerald-300/60">avg per week</p>
        </div>
        <div>
          <div className="text-2xl font-bold text-yellow-400 mb-1">
            {Math.round((weeklyData.reduce((sum, d) => sum + d.minutes, 0) / weeklyData.length) * 7 / 60)}h
          </div>
          <p className="text-xs text-emerald-300/60">projected month</p>
        </div>
        <div>
          <div className="text-2xl font-bold text-emerald-400 mb-1">
            {Math.round((weeklyData.filter((d) => d.trend === 'down').length / weeklyData.length) * 100)}%
          </div>
          <p className="text-xs text-emerald-300/60">improving weeks</p>
        </div>
      </div>
    </div>
  )
}
