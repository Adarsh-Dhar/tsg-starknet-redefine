
export default function LeaderboardPage() {
	// Placeholder leaderboard data
	const leaderboard = [
		{ name: 'Alice', streak: 12 },
		{ name: 'Bob', streak: 9 },
		{ name: 'Charlie', streak: 7 },
		{ name: 'You', streak: 5 },
	]
	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-bold text-emerald-300 mb-4">Leaderboard</h2>
			<div className="bg-emerald-900/30 border border-emerald-500/10 rounded-xl p-4">
				<table className="w-full text-left">
					<thead>
						<tr>
							<th className="py-2 px-3 text-emerald-200">Rank</th>
							<th className="py-2 px-3 text-emerald-200">Name</th>
							<th className="py-2 px-3 text-emerald-200">Streak (days)</th>
						</tr>
					</thead>
					<tbody>
						{leaderboard.map((entry, idx) => (
							<tr key={entry.name} className={entry.name === 'You' ? 'bg-emerald-800/40' : ''}>
								<td className="py-2 px-3 font-semibold">{idx + 1}</td>
								<td className="py-2 px-3">{entry.name}</td>
								<td className="py-2 px-3">{entry.streak}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="text-xs text-emerald-300/70">Keep up your streak to climb the leaderboard!</div>
		</div>
	)
}
