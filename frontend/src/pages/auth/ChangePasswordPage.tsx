import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { useAuth } from '../../contexts/AuthContext';

const ChangePasswordPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError("Passwords don't match");
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword({ newPassword: password, confirmPassword: confirmation });
      await login({ email: user?.email, password });
      navigate('/driver', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Unable to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-xl bg-slate-800 p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-white">Create New Password</h1>
        <p className="mt-2 text-sm text-slate-400">Your temporary password must be replaced before you can use the Driver Portal.</p>
        {error && <div className="mt-5 rounded-md border border-red-800 bg-red-900/30 p-3 text-sm text-red-300">{error}</div>}
        <label className="mt-6 block text-sm font-medium text-slate-300">
          New Password
          <input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white" />
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-300">
          Confirm Password
          <input type="password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1 w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white" />
        </label>
        <button type="submit" disabled={saving} className="mt-6 w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50">{saving ? 'Creating...' : 'Create Password'}</button>
      </form>
    </div>
  );
};

export default ChangePasswordPage;