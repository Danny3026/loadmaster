import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { AlertCircle } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const loggedInUser = await login({ email, password });
      navigate(loggedInUser.mustChangePassword ? '/change-password' : loggedInUser.role === 'DRIVER' ? '/driver' : '/dashboard');
    } catch (err: any) {
      console.error('Login failed', err);
      const message =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Login failed. Please check your credentials and try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#031b2b] relative overflow-hidden px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(85,138,185,0.2),transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(30,144,255,0.25),transparent_35%)]" />

      <div className="relative z-10 w-full max-w-[540px] rounded-[26px] border border-slate-600/70 bg-[#0b1b2d]/90 px-7 py-7 shadow-[0_0_0_1px_rgba(255,255,255,0.05)] backdrop-blur-sm">
        <div className="text-center mb-6">
          <h1 className="text-5xl font-black tracking-[-0.05em] text-white">Welcome Back</h1>
          <p className="mt-4 text-[1.05rem] font-medium text-slate-300">
            Sign in to <span className="font-semibold text-white">LoadMaster Dispatch</span>
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-red-500/70 bg-[#4a1a2a]/90 px-4 py-4 text-[1.15rem] text-red-400 shadow-inner shadow-red-900/30">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-red-400 text-red-300">
                <AlertCircle className="h-4 w-4" />
              </div>
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <div>
            <label className="mb-2 block text-[1.05rem] font-medium text-slate-200">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-[60px] w-full rounded-xl border border-slate-300 bg-[#e7edf1] px-4 text-[1.1rem] text-slate-900 shadow-inner outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-sky-500/40"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-[1.05rem] font-medium text-slate-200">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-[60px] w-full rounded-xl border border-blue-500 bg-[#0d1b2a] px-4 text-[1.15rem] text-white shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)] outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40"
              required
            />
          </div>

          <div className="flex justify-end pt-1">
            <Link to="/forgot-password" className="text-[1.05rem] font-medium text-slate-300 transition hover:text-white">
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            isLoading={isLoading}
            className="mt-2 h-[58px] w-full rounded-xl bg-[#2f7ae5] text-[1.15rem] font-semibold text-white shadow-[0_12px_30px_rgba(47,122,229,0.35)] hover:bg-[#2872d9]"
          >
            Sign In
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-300">
          New company? <Link to="/register" className="font-semibold text-sky-300 transition hover:text-white">Create an owner account</Link>
        </p>
      </div>
    </div>
  );
};