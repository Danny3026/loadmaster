import os

base_dir = r"C:\Users\Chanda Mfilinge\.gemini\antigravity\scratch\loadmaster\frontend"

files = {}

files["src/routes/index.tsx"] = """
import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import App from '../App';

// Layouts
import { AdminLayout } from '../components/layout/AdminLayout';

// Pages
import { DashboardPage } from '../pages/admin/DashboardPage';
import { LoginPage } from '../pages/auth/LoginPage';

// Protect route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      // Other routes go here in full implementation
    ],
  },
]);

export const AppRouter = () => {
  return <RouterProvider router={router} />;
};
"""

files["src/components/layout/AdminLayout.tsx"] = """
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

export const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
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
"""

files["src/components/layout/Sidebar.tsx"] = """
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Truck, Users, FileText, Settings, X, Package } from 'lucide-react';
import { cn } from '@/utils/classNames';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const navItems = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Loads', to: '/loads', icon: Package },
    { name: 'Drivers', to: '/drivers', icon: Users },
    { name: 'Trucks', to: '/trucks', icon: Truck },
    { name: 'Documents', to: '/documents', icon: FileText },
    { name: 'Settings', to: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile sidebar backdrop */}
      <div 
        className={cn('fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-sm transition-opacity lg:hidden', isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none')} 
        onClick={() => setIsOpen(false)}
      />
      
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 glass-dark text-slate-300 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center justify-between h-16 px-6 bg-slate-900/50 border-b border-slate-700/50">
          <div className="flex items-center gap-2 text-white font-bold text-xl">
            <Truck className="h-6 w-6 text-primary-500" />
            <span>LoadMaster</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="h-full px-3 py-6 overflow-y-auto">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.to}
                className={({ isActive }) => cn(
                  'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors group',
                  isActive 
                    ? 'bg-primary-600/10 text-primary-400' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                )}
              >
                <item.icon className={cn('mr-3 flex-shrink-0 h-5 w-5')} />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
};
"""

files["src/components/layout/TopNav.tsx"] = """
import React from 'react';
import { Menu, Bell, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';

interface TopNavProps {
  toggleSidebar: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  
  return (
    <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white border-b border-slate-200 shadow-sm">
      <button
        type="button"
        className="px-4 border-r border-slate-200 text-slate-500 focus:outline-none lg:hidden hover:bg-slate-50"
        onClick={toggleSidebar}
      >
        <Menu className="h-6 w-6" />
      </button>
      <div className="flex-1 px-4 flex justify-between">
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-lg lg:max-w-xs">
            <label htmlFor="search" className="sr-only">Search</label>
            <div className="relative">
              <input
                id="search"
                className="block w-full bg-slate-50 border border-slate-200 rounded-md py-2 pl-3 pr-3 text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="Search loads, drivers..."
                type="search"
              />
            </div>
          </div>
        </div>
        <div className="ml-4 flex items-center gap-4">
          <button className="bg-white p-1 rounded-full text-slate-400 hover:text-slate-500 focus:outline-none relative">
            <Bell className="h-6 w-6" />
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-danger-500 ring-2 ring-white" />
          </button>
          
          <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
            <div className="hidden md:flex flex-col items-end text-sm">
              <span className="font-medium text-slate-900">{user?.firstName || 'Admin'} {user?.lastName || 'User'}</span>
              <span className="text-xs text-slate-500">{user?.role || 'Dispatcher'}</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center cursor-pointer">
              <UserIcon className="h-5 w-5" />
            </div>
            <Button variant="ghost" size="sm" onClick={logout}>Logout</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
"""

files["src/pages/auth/LoginPage.tsx"] = """
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Truck } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      login('fake-jwt-token', { id: '1', email, firstName: 'Admin', lastName: 'User', role: 'ADMIN' } as any);
      navigate('/dashboard');
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary-600/20 blur-[120px]" />
        <div className="absolute bottom-[0%] right-[0%] w-[50%] h-[50%] rounded-full bg-sky-500/20 blur-[100px]" />
      </div>

      <div className="z-10 w-full max-w-md p-4">
        <div className="flex justify-center mb-8 animate-slide-up">
          <div className="bg-primary-600 p-3 rounded-xl shadow-lg">
            <Truck className="h-8 w-8 text-white" />
          </div>
        </div>
        
        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl text-white shadow-2xl animate-fade-in">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <p className="text-slate-400 text-sm mt-2">Sign in to LoadMaster Dispatch</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                  placeholder="admin@loadmaster.com"
                  required
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-slate-300">Password</label>
                  <a href="#" className="text-xs text-primary-400 hover:text-primary-300">Forgot password?</a>
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button type="submit" className="w-full mt-6" isLoading={isLoading}>
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
"""

files["src/pages/admin/DashboardPage.tsx"] = """
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Package, DollarSign, Users, Truck } from 'lucide-react';

export const DashboardPage = () => {
  const stats = [
    { name: 'Active Loads', value: '24', icon: Package, change: '+12%', trend: 'up' },
    { name: 'Revenue (MTD)', value: '$124,500', icon: DollarSign, change: '+8.2%', trend: 'up' },
    { name: 'Active Drivers', value: '45', icon: Users, change: '0%', trend: 'neutral' },
    { name: 'Available Trucks', value: '12', icon: Truck, change: '-2', trend: 'down' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <div className="text-sm text-slate-500">Last updated: Just now</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">{stat.name}</p>
                  <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary-50 flex items-center justify-center text-primary-600">
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className={stat.trend === 'up' ? 'text-success-600 font-medium' : stat.trend === 'down' ? 'text-danger-600 font-medium' : 'text-slate-500 font-medium'}>
                  {stat.change}
                </span>
                <span className="text-slate-500 ml-2">from last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full flex items-center justify-center bg-slate-50 rounded-lg border border-slate-100 border-dashed">
              <span className="text-slate-400">Chart rendering area (Recharts)</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                  <div>
                    <p className="text-slate-900 font-medium">Load #1040{i} delivered</p>
                    <p className="text-slate-500 text-xs mt-0.5">2 hours ago</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
"""

files["src/App.tsx"] = """
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { AppRouter } from './routes';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
"""

for path, content in files.items():
    full_path = os.path.join(base_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + '\\n')

print("Part 4 written")
