'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/common/Button';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
          <p className="text-zinc-500 text-sm">Memuat...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden font-sans text-white px-4">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-950/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-900/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md z-10">
        {/* Brand/Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="text-4xl font-extrabold tracking-tight text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:text-red-500 transition-colors duration-300">
              NobarFilm
            </h1>
          </Link>
          <p className="mt-2 text-sm text-zinc-400">
            Sign in with your MovieBox account
          </p>
        </div>

        {/* Card */}
        <div className="bg-zinc-950/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="mb-6 bg-red-950/50 border border-red-500/30 text-red-200 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 focus:border-red-500/50 rounded-xl py-3 px-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all"
                disabled={loading}
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 focus:border-red-500/50 rounded-xl py-3 px-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all"
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 hover:shadow-[0_0_15px_rgba(220,38,38,0.4)] text-white py-3 rounded-xl font-semibold transition-all duration-300 transform active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Signing In...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-zinc-400">Belum punya akun? </span>
            <Link href="/register" className="text-red-500 hover:text-red-400 font-medium transition-colors">
              Daftar Sekarang
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-xs text-zinc-500">
          <p>This login connects directly and securely to the MovieBox service.</p>
        </div>
      </div>
    </div>
  );
}
