import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { MapPin, Truck, User, Bell, LogOut, Landmark } from 'lucide-react';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '../../hooks/useAuth';
import { useMyDriver } from '../../hooks/useDrivers';
import { NotificationBell } from '../notifications/NotificationBell';
import { DriverAvatar } from '../driver/DriverAvatar';

export function DriverLayout() {
  const { user, logout } = useAuth();
  const { data: driver } = useMyDriver();
  const { data: company } = useCompany();
  const navigate = useNavigate();

  const navItems = [
    { to: '/driver', label: 'Dashboard', icon: MapPin, end: true },
    { to: '/driver/loads', label: 'Loads', icon: Truck },
    { to: '/driver/settlements', label: 'Settlements', icon: Landmark },
    { to: '/driver/notifications', label: 'Alerts', icon: Bell },
    { to: '/driver/profile', label: 'Profile', icon: User },
  ];

  const brandStyle: React.CSSProperties & { '--company-brand-color': string } = {
    '--company-brand-color': company?.brandColor || '#1a5fb4',
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900" style={brandStyle}>
      {/* ── Sticky Top Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="flex h-14 items-center px-4 justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-6 w-6" style={{ color: 'var(--company-brand-color, #2563eb)' }} />
            <span className="font-bold text-slate-800">Driver Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <NavLink to="/driver/profile" aria-label="Open driver profile">
              <DriverAvatar driver={driver} className="h-9 w-9 text-xs" />
            </NavLink>
            <span className="text-sm font-medium text-slate-600">
              {user ? `${(user as any).firstName || (user as any).first_name || ''} ${(user as any).lastName || (user as any).last_name || ''}`.trim() || 'Driver' : 'Driver'}
            </span>
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 rounded-md text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Page Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 p-4 pb-24 sm:p-6 sm:pb-6">
        <div className="mx-auto max-w-lg">
          <Outlet />
        </div>
      </main>

      {/* ── Mobile Bottom Navigation ──────────────────────────────────────── */}
      <nav className="fixed bottom-0 z-50 w-full border-t border-slate-200 bg-white sm:hidden">
        <div className="flex h-16 justify-around items-center">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-3 transition-colors ${
                  isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? 'var(--company-brand-color, #2563eb)' : undefined,
              })}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default DriverLayout;
