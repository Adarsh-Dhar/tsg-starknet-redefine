
import DailyStats from './components/DailyStats'
import WeeklyChart from './components/WeeklyChart'

export default function InsightsPage({ screenTime, dailyGoal }: { screenTime: number; dailyGoal: number }) {
	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-bold text-emerald-300 mb-4">Insights</h2>
			<DailyStats screenTime={screenTime} dailyGoal={dailyGoal} />
			<WeeklyChart />
			<div className="mt-6 p-4 rounded-xl bg-emerald-900/30 border border-emerald-500/10">
				<h3 className="font-semibold text-emerald-200 mb-2">Tips to Reduce Screen Time</h3>
				<ul className="list-disc pl-5 text-emerald-100/80 text-sm space-y-1">
					<li>Take regular breaks and stretch.</li>
					<li>Set app limits on your devices.</li>
					<li>Spend time outdoors or with friends.</li>
					<li>Turn off non-essential notifications.</li>
				</ul>
			</div>
		</div>
	)
}
