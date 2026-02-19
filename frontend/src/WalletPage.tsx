
import { useState } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function WalletPage() {
	const [connected, setConnected] = useState(false);
	const [amount, setAmount] = useState('');

	const handleConnect = () => {
		// Placeholder for wallet connect logic
		setConnected(true);
	};

	const handleDelegate = () => {
		// Placeholder for delegate logic
		alert(`Delegated ${amount}`);
	};

	const handleUndelegate = () => {
		// Placeholder for undelegate logic
		alert(`Undelegated ${amount}`);
	};

	return (
		<div className="max-w-md mx-auto mt-12 p-6 rounded-2xl glass-effect glass-glow border border-emerald-500/20 bg-emerald-900/10 shadow-lg flex flex-col items-center space-y-8">
			<h2 className="text-2xl font-bold text-emerald-300 mb-2">Wallet</h2>
			<button
				className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500/80 to-green-600/80 text-white font-semibold shadow-md hover:from-emerald-400/90 hover:to-green-500/90 transition disabled:opacity-60"
				onClick={handleConnect}
				disabled={connected}
			>
				<Wallet className="w-5 h-5" />
				{connected ? 'Wallet Connected' : 'Connect Wallet'}
			</button>

			<div className="w-full flex flex-col items-center space-y-4">
				<input
					type="number"
					min="0"
					placeholder="Enter amount"
					className="w-full px-4 py-2 rounded-lg bg-slate-900/60 border border-emerald-500/20 text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 text-lg placeholder:text-emerald-300/40"
					value={amount}
					onChange={e => setAmount(e.target.value)}
					disabled={!connected}
				/>
				<div className="flex w-full gap-4">
					<button
						className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600/80 text-white font-semibold shadow hover:bg-emerald-500/90 transition disabled:opacity-60"
						onClick={handleDelegate}
						disabled={!connected || !amount}
					>
						<ArrowUpRight className="w-4 h-4" /> Delegate
					</button>
					<button
						className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-800/80 text-emerald-200 font-semibold shadow hover:bg-emerald-700/90 transition disabled:opacity-60"
						onClick={handleUndelegate}
						disabled={!connected || !amount}
					>
						<ArrowDownLeft className="w-4 h-4" /> Undelegate
					</button>
				</div>
			</div>
		</div>
	);
}
