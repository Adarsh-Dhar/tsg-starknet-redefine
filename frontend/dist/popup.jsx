'use client';

import React, { useState, useEffect } from 'https://esm.sh/react@19';
import ReactDOM from 'https://esm.sh/react-dom@19/client';
import { Clock, Target, BarChart3, Settings, AlertCircle, CheckCircle2, Leaf } from 'https://esm.sh/lucide-react@0.544.0';
import chrome from 'https://esm.sh/chrome';

function PopupApp() {
	const [screenTime, setScreenTime] = useState(0);
	const [dailyGoal, setDailyGoal] = useState(180);
	const [breakInterval, setBreakInterval] = useState(30);
	const [currentView, setCurrentView] = useState('home');

	useEffect(() => {
		loadStoredData();
		const interval = setInterval(loadStoredData, 10000);
		return () => clearInterval(interval);
	}, []);

	const loadStoredData = async () => {
		const data = await chrome.storage.local.get([
			'screenTime',
			'dailyGoal',
			'breakInterval',
		]);
		if (data.screenTime !== undefined) setScreenTime(data.screenTime);
		if (data.dailyGoal !== undefined) setDailyGoal(data.dailyGoal);
		if (data.breakInterval !== undefined) setBreakInterval(data.breakInterval);
	};

	const updateGoal = async (newGoal) => {
		setDailyGoal(newGoal);
		await chrome.storage.local.set({ dailyGoal: newGoal });
	};

	const resetScreenTime = async () => {
		setScreenTime(0);
		await chrome.storage.local.set({ screenTime: 0, lastBreakTime: 0 });
	};

	const formatTime = (minutes) => {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
	};

	const percentage = Math.min((screenTime / dailyGoal) * 100, 100);
	const isExceeded = screenTime > dailyGoal;
	const remaining = Math.max(dailyGoal - screenTime, 0);

	const getStatusColor = () => {
		if (percentage >= 100) return 'text-red-400';
		if (percentage >= 80) return 'text-amber-400';
		if (percentage >= 60) return 'text-emerald-300';
		return 'text-emerald-400';
	};

	const getCircleColor = () => {
		if (percentage >= 100) return 'stroke-red-400';
		if (percentage >= 80) return 'stroke-amber-400';
		return 'stroke-emerald-400';
	};

	return (
		<div className="min-h-screen flex flex-col">
			{/* Header */}
			<header className="glass-effect glass-glow px-4 py-3 border-b border-emerald-500/20">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<span className="text-lg">🌱</span>
						<h1 className="font-bold text-sm text-white">Touch Some Grass</h1>
					</div>
					<button
						onClick={() => setCurrentView(currentView === 'home' ? 'settings' : 'home')}
						className="p-1.5 hover:bg-emerald-500/20 rounded transition-colors"
					>
						<Settings className="w-4 h-4 text-emerald-400" />
					</button>
				</div>
			</header>

			{/* Content */}
			<main className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
				{currentView === 'home' && (
					<>
						{/* Alert */}
						{isExceeded && (
							<div className="glass-effect glass-glow p-3 rounded-lg border border-red-500/30 bg-gradient-to-r from-red-500/10 to-red-500/5 flex gap-2">
								<AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
								<div className="text-xs">
									<p className="font-semibold text-red-300 mb-0.5">Goal Exceeded</p>
									<p className="text-red-200/80">Take a break and go outside!</p>
								</div>
							</div>
						)}

						{/* Circular Progress */}
						<div className="glass-effect glass-glow p-6 rounded-xl flex flex-col items-center justify-center">
							<div className="relative w-40 h-40 mb-4">
								<svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
									<circle
										cx="50"
										cy="50"
										r="45"
										fill="none"
										stroke="rgba(16, 185, 129, 0.1)"
										strokeWidth="8"
									/>
									<circle
										cx="50"
										cy="50"
										r="45"
										fill="none"
										className={getCircleColor()}
										strokeWidth="8"
										strokeDasharray={`${(percentage / 100) * 283} 283`}
										strokeLinecap="round"
										style={{ transition: 'stroke-dasharray 0.5s ease' }}
									/>
								</svg>
								<div className="absolute inset-0 flex flex-col items-center justify-center">
									<span className={`text-3xl font-bold ${getStatusColor()}`}>
										{Math.round(percentage)}%
									</span>
									<span className="text-xs text-emerald-300/70">
										{formatTime(screenTime)}
									</span>
								</div>
							</div>

							<div className="w-full space-y-2 text-center">
								<p className="text-sm text-emerald-300">
									Remaining: <span className="font-semibold">{formatTime(remaining)}</span>
								</p>
								<p className="text-xs text-emerald-300/60">Daily Goal: {formatTime(dailyGoal)}</p>
							</div>
						</div>

						{/* Quick Stats */}
						<div className="grid grid-cols-2 gap-2">
							<div className="glass-effect glass-glow p-3 rounded-lg text-center">
								<Clock className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
								<p className="text-xs text-emerald-300/70">Current</p>
								<p className="text-sm font-semibold text-white">{formatTime(screenTime)}</p>
							</div>
							<div className="glass-effect glass-glow p-3 rounded-lg text-center">
								<Target className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
								<p className="text-xs text-emerald-300/70">Goal</p>
								<p className="text-sm font-semibold text-white">{formatTime(dailyGoal)}</p>
							</div>
						</div>

						{/* Actions */}
						<button
							onClick={resetScreenTime}
							className="w-full glass-effect glass-glow p-3 rounded-lg text-sm font-medium text-white hover:neon-glow transition-all hover:border-emerald-400/50 border border-emerald-500/20"
						>
							Reset Screen Time
						</button>
					</>
				)}

				{currentView === 'settings' && (
					<div className="space-y-4">
						<h2 className="text-sm font-semibold text-emerald-400 px-1">Settings</h2>

						{/* Daily Goal Setting */}
						<div className="glass-effect glass-glow p-4 rounded-lg space-y-3">
							<label className="text-xs font-semibold text-emerald-300 flex items-center gap-2">
								<Target className="w-4 h-4" />
								Daily Goal
							</label>
							<div className="grid grid-cols-3 gap-2">
								{[60, 120, 180, 240, 300, 360].map((mins) => (
									<button
										key={mins}
										onClick={() => updateGoal(mins)}
										className={`p-2 rounded text-xs font-medium transition-all ${
											dailyGoal === mins
												? 'bg-emerald-500/40 text-emerald-300 border border-emerald-400'
												: 'bg-emerald-500/10 text-emerald-300/70 border border-emerald-500/20 hover:bg-emerald-500/20'
										}`}
									>
										{Math.floor(mins / 60)}h
									</button>
								))}
							</div>
						</div>

						{/* Break Interval Setting */}
						<div className="glass-effect glass-glow p-4 rounded-lg space-y-3">
							<label className="text-xs font-semibold text-emerald-300 flex items-center gap-2">
								<Leaf className="w-4 h-4" />
								Break Reminder Every
							</label>
							<div className="grid grid-cols-3 gap-2">
								{[15, 30, 45, 60].map((mins) => (
									<button
										key={mins}
										onClick={() => setBreakInterval(mins)}
										className={`p-2 rounded text-xs font-medium transition-all ${
											breakInterval === mins
												? 'bg-emerald-500/40 text-emerald-300 border border-emerald-400'
												: 'bg-emerald-500/10 text-emerald-300/70 border border-emerald-500/20 hover:bg-emerald-500/20'
										}`}
									>
										{mins}m
									</button>
								))}
							</div>
						</div>

						{/* Info */}
						<div className="glass-effect p-3 rounded-lg text-xs text-emerald-300/70 space-y-1">
							<p>
								<strong>Keyboard Shortcut:</strong> Ctrl+Shift+G (Cmd+Shift+G on Mac)
							</p>
							<p>
								<strong>Version:</strong> 1.0.0
							</p>
						</div>
					</div>
				)}
			</main>
		</div>
	);
}

const root = ReactDOM.createRoot(document.getElementById('app'));
root.render(<PopupApp />);
