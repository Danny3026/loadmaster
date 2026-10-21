import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Truck as TruckIcon,
  Users,
  Receipt,
  Landmark,
  FileSpreadsheet,
  Archive,
  Settings,
  Bell,
  X,
  LogOut,
} from 'lucide-react';
import { cn } from '@/utils/classNames';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompany';
import { CompanyLogo } from '@/components/company/CompanyLogo';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const navItems = [
  { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { name: 'Loads', to: '/loads', icon: Package },
  { name: 'Drivers', to: '/drivers', icon: Users },
  { name: 'Trucks', to: '/trucks', icon: TruckIcon },
  { name: 'Team', to: '/team', icon: Users },
  { name: 'Billing', to: '/billing', icon: Receipt },
  { name: 'Settlements', to: '/settlements', icon: Landmark },
  { name: 'Notifications', to: '/notifications', icon: Bell },
  { name: 'Taxes', to: '/taxes', icon: FileSpreadsheet },
  { name: 'Archive', to: '/archive', icon: Archive },
  { name: 'Settings', to: '/settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const { data: company } = useCompany();

  const companyName = company?.name || 'Danny Transport';

  const userInitial = user?.firstName
    ? user.firstName.charAt(0).toUpperCase()
    : 'U';

  const userName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
    : 'User';

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* ── Header: Company branding + close ── */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--company-brand-color, #2563eb)' }}>
              {company?.logoUrl ? (
                <CompanyLogo
                  logoUrl={company.logoUrl}
                  companyName={companyName}
                  className="h-full w-full object-cover"
                  fallbackClassName="flex h-full w-full items-center justify-center text-sm font-bold text-white"
                />
              ) : <TruckIcon className="h-5 w-5 text-white" />}
            </div>
            <span className="text-slate-900 font-semibold text-base tracking-tight truncate">
              {companyName}
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Navigation links ── */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--company-brand-color, #2563eb)' : undefined,
              })}
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      'h-[18px] w-[18px] flex-shrink-0',
                      isActive ? 'text-white' : 'text-slate-400'
                    )}
                  />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── Footer: User profile + logout ── */}
        <div className="flex-shrink-0 border-t border-slate-200 px-3 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                {userInitial}
              </div>
              <span className="text-sm font-medium text-slate-700 truncate">
                {userName}
              </span>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};