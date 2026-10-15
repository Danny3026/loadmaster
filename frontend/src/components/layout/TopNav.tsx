import React from 'react';
import { Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompany';
import { NotificationBell } from '../notifications/NotificationBell';
import { CompanyLogo } from '@/components/company/CompanyLogo';

interface TopNavProps {
  toggleSidebar: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ toggleSidebar }) => {
  const { user } = useAuth();
  const { data: company } = useCompany();

  return (
    <div className="sticky top-0 z-10 flex-shrink-0 flex items-center h-16 bg-white border-b border-slate-200 px-4 gap-3">
      <button
        type="button"
        className="p-2 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none transition-colors"
        onClick={toggleSidebar}
      >
        <Menu className="h-6 w-6" />
      </button>

      <div className="flex items-center gap-3 min-w-0 flex-1">
        {company?.logoUrl ? (
          <CompanyLogo
            logoUrl={company.logoUrl}
            companyName={company.name}
            className="h-9 w-9 rounded-lg object-cover border border-slate-200"
            fallbackClassName="flex h-9 w-9 items-center justify-center rounded-lg brand-primary-bg text-sm font-bold text-white"
          />
        ) : (
          <div className="h-9 w-9 rounded-lg brand-primary-bg text-white flex items-center justify-center text-sm font-bold">
            {company?.name?.charAt(0)?.toUpperCase() || 'D'}
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate text-base font-semibold text-slate-800">{company?.name || 'Danny Transport'}</div>
        </div>
      </div>

      <NotificationBell />
      {user && (
        <div className="hidden sm:flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-600">
          <span className="font-medium">{user.firstName}</span>
          <span>{user.lastName}</span>
        </div>
      )}
    </div>
  );
};