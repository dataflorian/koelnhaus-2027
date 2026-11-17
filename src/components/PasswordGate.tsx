import React, { useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';

interface PasswordGateProps {
  onUnlocked: () => void;
}

export const PasswordGate: React.FC<PasswordGateProps> = ({ onUnlocked }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('./api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (!res.ok) {
        setError('Incorrect group password. Please try again.');
        return;
      }
      onUnlocked();
    } catch {
      setError('Could not reach server. Please check connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">
            <Lock className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">KölnHaus 2027 — Private Hub</h1>
            <p className="text-xs text-slate-400">
              6-Roommate Workspace • Shared Cross-Device Sync
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/25 text-xs text-emerald-200 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Enter the shared group password to unlock Cologne listings, roommate votes, shared
            todos, and financial calculators across your laptop, desktop, or phone.
          </span>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Shared Group Password
          </label>
          <input
            type="password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter agreed group password..."
            className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
          />
        </div>

        {error && (
          <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold text-sm rounded-xl py-2.5 transition"
        >
          {submitting ? 'Verifying...' : 'Unlock Dashboard'}
        </button>
      </form>
    </div>
  );
};
