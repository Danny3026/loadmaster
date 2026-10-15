import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/auth';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await authApi.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || err?.message || 'Failed to send reset email. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="bg-slate-800 rounded-xl p-8 max-w-md w-full mx-4 text-center">
          <div className="text-green-400 text-5xl mb-4">✓</div>
          <h2 className="text-white text-xl font-bold mb-2">Check your email</h2>
          <p className="text-slate-400 text-sm mb-6">
            If an account exists for <strong className="text-white">{email}</strong>, you'll receive password reset instructions shortly.
          </p>
          <Link to="/login" className="text-blue-400 hover:text-blue-300 text-sm">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-slate-800 rounded-xl p-8 max-w-md w-full mx-4">
        <h2 className="text-white text-2xl font-bold mb-2">Reset Password</h2>
        <p className="text-slate-400 text-sm mb-6">
          Enter your email and we'll send you instructions to reset your password.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 text-red-400 rounded-md border border-red-800 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white rounded-md py-2 px-4 font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-slate-400 hover:text-slate-300 text-sm">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
