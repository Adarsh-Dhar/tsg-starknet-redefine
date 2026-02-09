import { Leaf, MessageCircle } from 'lucide-react'

interface GrassReminderProps {
  screenTime: number
}

const reminders = [
  '🌿 Time to touch some grass! Go outside for a few minutes.',
  '🌳 Your eyes need a break. Step outside and breathe fresh air!',
  '🌼 The weather is calling! Take a walk outside.',
  '🌲 Nature awaits! Close your screen and go explore.',
  '🌱 Break time! Go feel the sunshine on your skin.',
]

export default function GrassReminder({ screenTime }: GrassReminderProps) {
  const reminder = reminders[Math.floor(screenTime / 30) % reminders.length]

  return (
    <div className="glass-effect glass-glow p-4 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 flex items-start gap-4 animate-pulse">
      <div className="flex-shrink-0">
        <Leaf className="w-6 h-6 text-emerald-400 animate-bounce" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-emerald-300 mb-1 flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          Quick Break Reminder
        </h3>
        <p className="text-sm text-emerald-200/90">{reminder}</p>
      </div>
    </div>
  )
}
