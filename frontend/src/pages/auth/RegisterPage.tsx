import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';

export const RegisterPage = () => {
  const [companyName, setCompanyName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await register({ companyName, firstName, lastName, email, password, phone: phone || undefined });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Registration failed. Check your details and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = 'h-12 w-full rounded-lg border border-slate-300 bg-[#e7edf1] px-4 text-base text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#031b2b] relative overflow-hidden px-4 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(85,138,185,0.2),transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(30,144,255,0.25),transparent_35%)]" />
      <main className="relative z-10 w-full max-w-xl rounded-2xl border border-slate-600/70 bg-[#0b1b2d]/95 p-7 shadow-2xl sm:p-9">
        <header className="mb-7">
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-300">LoadMaster Dispatch</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Create your company account</h1>
          <p className="mt-2 text-sm text-slate-300">Your account will be the company owner and administrator.</p>
        </header>

        {error && (
          <div role="alert" className="mb-5 flex items-center gap-3 rounded-lg border border-red-500/70 bg-[#4a1a2a]/90 px-4 py-3 text-sm text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="companyName" className="mb-1.5 block text-sm font-medium text-slate-200">Company name</label>
            <input id="companyName" autoComplete="organization" required maxLength={150} value={companyName} onChange={(event) => setCompanyName(event.target.value)} className={inputClass} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-slate-200">Owner first name</label>
              <input id="firstName" autoComplete="given-name" required maxLength={100} value={firstName} onChange={(event) => setFirstName(event.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium text-slate-200">Owner last name</label>
              <input id="lastName" autoComplete="family-name" required maxLength={100} value={lastName} onChange={(event) => setLastName(event.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-200">Email</label>
            <input id="email" type="email" autoComplete="email" required maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-slate-200">Phone <span className="font-normal text-slate-400">(optional)</span></label>
            <input id="phone" type="tel" autoComplete="tel" maxLength={32} value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-200">Password</label>
              <input id="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-slate-200">Confirm password</label>
              <input id="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} />
            </div>
          </div>
          <Button type="submit" isLoading={isLoading} className="h-12 w-full rounded-lg bg-[#2f7ae5] text-base font-semibold text-white hover:bg-[#2872d9]">
            Create company account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-300">
          Already registered? <Link to="/login" className="font-semibold text-sky-300 hover:text-white">Sign in</Link>
        </p>
      </main>
    </div>
  );
};