import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useCompany } from '@/hooks/useCompany';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

export const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: company } = useCompany();
  const brandStyle: React.CSSProperties & { '--company-brand-color': string } = {
    '--company-brand-color': company?.brandColor || '#1a5fb4',
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" style={brandStyle}>
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col w-0 overflow-hidden">
        <TopNav toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};