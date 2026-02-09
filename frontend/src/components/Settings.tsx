'use client';

import { useState } from 'react'
import { Save, RotateCcw, Bell, Clock } from 'lucide-react'

interface SettingsProps {
  dailyGoal: number
  onGoalChange: (goal: number) => void
}

export default function Settings({ dailyGoal, onGoalChange }: SettingsProps) {
  const [goal, setGoal] = useState(dailyGoal)
  const [notifications, setNotifications] = useState(true)
  const [breakInterval, setBreakInterval] = useState(30)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    onGoalChange(goal)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    setGoal(180)
    setNotifications(true)
    setBreakInterval(30)
  }

  const goalHours = Math.floor(goal / 60)
  const goalMinutes = goal % 60

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Daily Goal Setting */}
      <div className="glass-effect glass-glow rounded-xl p-6 border border-emerald-500/20">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-white">Daily Screen Time Goal</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-emerald-300 mb-3">
              Set your daily goal (current: {goalHours}h {goalMinutes}m)
            </label>
            <input
              type="range"
              min="30"
              max="480"
              step="15"
              value={goal}
              onChange={(e) => setGoal(Number(e.target.value))}
              className="w-full h-2 bg-emerald-500/20 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <div className="flex justify-between text-xs text-emerald-300/60 mt-2">
              <span>30m</span>
              <span>8h</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { label: '1 hour', value: 60 },
              { label: '2 hours', value: 120 },
              { label: '3 hours', value: 180 },
              { label: '4 hours', value: 240 },
              { label: '5 hours', value: 300 },
              { label: '6 hours', value: 360 },
            ].map((preset) => (
              <button
                key={preset.value}
                onClick={() => setGoal(preset.value)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all border ${
                  goal === preset.value
                    ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300/70 hover:bg-emerald-500/20'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications Setting */}
      <div className="glass-effect glass-glow rounded-xl p-6 border border-emerald-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-semibold text-white">Break Reminders</h3>
              <p className="text-xs text-emerald-300/60">Get notified every {breakInterval} minutes</p>
            </div>
          </div>
          <button
            onClick={() => setNotifications(!notifications)}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              notifications ? 'bg-emerald-500' : 'bg-emerald-500/30'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                notifications ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Break Interval Setting */}
      <div className="glass-effect glass-glow rounded-xl p-6 border border-emerald-500/20">
        <h3 className="font-semibold text-white mb-4">Break Reminder Interval</h3>
        <div className="grid grid-cols-4 gap-3">
          {[15, 30, 45, 60].map((interval) => (
            <button
              key={interval}
              onClick={() => setBreakInterval(interval)}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-all border ${
                breakInterval === interval
                  ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300/70 hover:bg-emerald-500/20'
              }`}
            >
              {interval}m
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 neon-glow"
        >
          <Save className="w-5 h-5" />
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
        <button
          onClick={handleReset}
          className="flex-1 glass-effect glass-glow text-emerald-300 hover:text-emerald-200 font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 border border-emerald-500/30"
        >
          <RotateCcw className="w-5 h-5" />
          Reset
        </button>
      </div>

      {/* Info Section */}
      <div className="glass-effect glass-glow rounded-xl p-6 border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5">
        <h3 className="font-semibold text-emerald-300 mb-3">💡 Tips for Success</h3>
        <ul className="space-y-2 text-sm text-emerald-200/80">
          <li>✓ Start with a realistic goal based on your habits</li>
          <li>✓ Use break reminders to step away regularly</li>
          <li>✓ Try to spend your break time outdoors</li>
          <li>✓ Track your progress to stay motivated</li>
        </ul>
      </div>
    </div>
  )
}
