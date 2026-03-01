import { FormEvent, useState } from 'react';
import { Mail, Lock, ShieldCheck, Loader } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';

const API_BASE_URL = 'http://localhost:3333/api';

type AuthMode = 'login' | 'signup';

export default function LoginPage() {
	const { login: authLogin, signup: authSignup } = useAuth();
	const [mode, setMode] = useState<AuthMode>('login');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const validateForm = (): boolean => {
		if (!email || !password) {
			setError('Email and password are required.');
			return false;
		}

		if (mode === 'signup' && !confirmPassword) {
			setError('Please confirm your password.');
			return false;
		}

		if (mode === 'signup' && password !== confirmPassword) {
			setError('Passwords do not match.');
			return false;
		}

		if (password.length < 6) {
			setError('Password must be at least 6 characters.');
			return false;
		}

		return true;
	};

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError('');

		if (!validateForm()) {
			return;
		}

		setLoading(true);

		try {
			console.log(`[LoginPage] Starting ${mode}...`);
			
			// Use the useAuth hook's login/signup functions
			if (mode === 'login') {
				await authLogin(email, password);
				console.log('[LoginPage] ✅ Login successful!');
			} else {
				await authSignup(email, password);
				console.log('[LoginPage] ✅ Signup successful!');
			}
			
			// Clear form
			setEmail('');
			setPassword('');
			setConfirmPassword('');
			
			// Auth state is now updated, App.tsx will automatically show authenticated view
			setLoading(false);
			console.log('[LoginPage] ✅ Auth complete, App will handle view transition');
		} catch (err: any) {
			setError(err.message || `Failed to ${mode}`);
			setLoading(false);
		}
	};

	return (
		<div className="max-w-md mx-auto p-6 rounded-2xl glass-effect glass-glow border border-emerald-500/20 bg-emerald-900/5 animate-in fade-in duration-500">
			<div className="text-center mb-6">
				<h1 className="text-2xl font-black tracking-tight text-emerald-400 glow-text">
					{mode === 'login' ? 'Sign In' : 'Create Account'}
				</h1>
				<p className="text-[11px] uppercase tracking-wider text-emerald-300/60 mt-1 font-bold">
					{mode === 'login' ? 'Enter your credentials to continue' : 'Enter your details to sign up'}
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4">
				<div className="space-y-2">
					<label htmlFor="email" className="text-[10px] text-emerald-300/50 uppercase font-black tracking-widest ml-1">
						Email
					</label>
					<div className="relative">
						<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/60" />
						<input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="you@example.com"
							disabled={loading}
							className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-900/70 border border-emerald-500/20 text-emerald-50 placeholder:text-emerald-400/30 outline-none focus:border-emerald-400 transition-colors disabled:opacity-50"
						/>
					</div>
				</div>

				<div className="space-y-2">
					<label htmlFor="password" className="text-[10px] text-emerald-300/50 uppercase font-black tracking-widest ml-1">
						Password
					</label>
					<div className="relative">
						<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/60" />
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="••••••••"
							disabled={loading}
							className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-900/70 border border-emerald-500/20 text-emerald-50 placeholder:text-emerald-400/30 outline-none focus:border-emerald-400 transition-colors disabled:opacity-50"
						/>
					</div>
				</div>

				{mode === 'signup' && (
					<div className="space-y-2">
						<label htmlFor="confirmPassword" className="text-[10px] text-emerald-300/50 uppercase font-black tracking-widest ml-1">
							Confirm Password
						</label>
						<div className="relative">
							<ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/60" />
							<input
								id="confirmPassword"
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								placeholder="••••••••"
								disabled={loading}
								className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-900/70 border border-emerald-500/20 text-emerald-50 placeholder:text-emerald-400/30 outline-none focus:border-emerald-400 transition-colors disabled:opacity-50"
							/>
						</div>
					</div>
				)}

				{error && (
					<p className="text-[11px] text-rose-400 font-semibold px-1">{error}</p>
				)}

				<button
					type="submit"
					disabled={loading}
					className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-black uppercase tracking-wide hover:bg-emerald-400 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
				>
					{loading && <Loader className="w-4 h-4 animate-spin" />}
					{mode === 'login' ? 'Sign In' : 'Create Account'}
				</button>
			</form>

			<div className="mt-6 pt-6 border-t border-emerald-500/10">
				<p className="text-[11px] text-emerald-300/60 text-center mb-3">
					{mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
				</p>
				<button
					type="button"
					onClick={() => {
						setMode(mode === 'login' ? 'signup' : 'login');
						setError('');
						setEmail('');
						setPassword('');
						setConfirmPassword('');
					}}
					className="w-full py-2 rounded-lg border border-emerald-500/30 text-emerald-400 font-semibold uppercase tracking-wide text-[10px] hover:bg-emerald-500/10 transition-all"
				>
					{mode === 'login' ? 'Sign Up' : 'Sign In'}
				</button>
			</div>
		</div>
	);
}
