'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-semibold tracking-tight text-[#1d1d1f] mb-3">
            FitRank
          </h1>
          <p className="text-[17px] text-[#86868b]">Coaches Portal</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-[#f5f5f7] rounded-2xl border border-[#d2d2d7]">
            <p className="text-[15px] text-[#1d1d1f]">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-5 py-4 bg-[#f5f5f7] border border-transparent rounded-xl text-[17px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:bg-white focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10"
              placeholder="Email"
            />
          </div>

          <div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-5 py-4 bg-[#f5f5f7] border border-transparent rounded-xl text-[17px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:bg-white focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10"
              placeholder="Password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0071e3] text-white py-4 rounded-xl text-[17px] font-medium hover:bg-[#0077ed] active:bg-[#006edb] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Footer Text */}
        <div className="mt-8 text-center">
          <p className="text-[14px] text-[#86868b]">
            Only coaches can access this portal
          </p>
        </div>
      </div>
    </div>
  );
}
