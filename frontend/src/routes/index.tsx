import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// ── Layouts ───────────────────────────────────────────────────────────────────
import { AdminLayout } from '../components/layout/AdminLayout';
import { DriverLayout } from '../components/layout/DriverLayout';

// ── Auth Pages (small — not lazy-loaded) ─────────────────────────────────────
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import ChangePasswordPage from '../pages/auth/ChangePasswordPage';

// ── Admin / Dispatcher Pages (lazy-loaded) ────────────────────────────────────
const DashboardPage       = lazy(() => import('../pages/admin/DashboardPage'));
const LoadsPage           = lazy(() => import('../pages/admin/LoadsPage'));
const LoadDetailPage      = lazy(() => import('../pages/admin/LoadDetailPage'));
const CreateLoadPage      = lazy(() => import('../pages/admin/CreateLoadPage'));
const DriversPage         = lazy(() => import('../pages/admin/DriversPage'));
const TrucksPage          = lazy(() => import('../pages/admin/TrucksPage'));
const BrokersPage         = lazy(() => import('../pages/admin/BrokersPage'));
const UsersPage           = lazy(() => import('../pages/admin/UsersPage'));
const DocumentsPage       = lazy(() => import('../pages/admin/DocumentsPage'));
const ReportsPage         = lazy(() => import('../pages/admin/ReportsPage'));
const NotificationsPage   = lazy(() => import('../pages/admin/NotificationsPage'));
const ActivityLogsPage    = lazy(() => import('../pages/admin/ActivityLogsPage'));
const SettingsPage        = lazy(() => import('../pages/admin/SettingsPage'));
const TeamPage            = lazy(() => import('../pages/admin/TeamPage'));
const BillingPage         = lazy(() => import('../pages/admin/BillingPage'));
const SettlementsPage     = lazy(() => import('../pages/admin/SettlementsPage'));
const TaxesPage           = lazy(() => import('../pages/admin/TaxesPage'));
const ArchivePage         = lazy(() => import('../pages/admin/ArchivePage'));

// ── Driver Pages (lazy-loaded) ────────────────────────────────────────────────
const DriverDashboard         = lazy(() => import('../pages/driver/DriverDashboard'));
const DriverLoadsPage         = lazy(() => import('../pages/driver/DriverLoadsPage'));
const DriverLoadDetailPage    = lazy(() => import('../pages/driver/DriverLoadDetailPage'));
const DriverUploadPage        = lazy(() => import('../pages/driver/DriverUploadPage'));
const DriverProfilePage       = lazy(() => import('../pages/driver/DriverProfilePage'));
const DriverNotificationsPage = lazy(() => import('../pages/driver/DriverNotificationsPage'));
const DriverSettlementsPage = lazy(() => import('../pages/driver/DriverSettlementsPage'));
const DriverSettlementDetailPage = lazy(() => import('../pages/driver/DriverSettlementDetailPage'));

// ── Loading Fallback ──────────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="flex h-full min-h-[60vh] items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      <p className="text-sm text-slate-500">Loading…</p>
    </div>
  </div>
);

const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

// ── Route Guards ──────────────────────────────────────────────────────────────
/** Guard that requires the user to be authenticated */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return user?.role === 'DRIVER' ? <Navigate to="/driver" replace /> : <>{children}</>;
};

/** Guard for ADMIN / DISPATCHER — drivers are redirected to /driver */
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'DRIVER') return <Navigate to="/driver" replace />;
  return <>{children}</>;
};

/** Guard for DRIVER role only */
const DriverRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (user?.role !== 'DRIVER') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const ChangePasswordRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.mustChangePassword) return <Navigate to={user?.role === 'DRIVER' ? '/driver' : '/dashboard'} replace />;
  return <>{children}</>;
};

// ── Router Definition ─────────────────────────────────────────────────────────
const router = createBrowserRouter([
  // ── Public ──────────────────────────────────────────────────────────────────
  { path: '/login',           element: <LoginPage /> },
  { path: '/register',        element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password',  element: <ResetPasswordPage /> },
  { path: '/change-password', element: <ChangePasswordRoute><ChangePasswordPage /></ChangePasswordRoute> },

  // ── Root redirect ────────────────────────────────────────────────────────────
  {
    index: true,
    path: '/',
    element: (
      <ProtectedRoute>
        <Navigate to="/dashboard" replace />
      </ProtectedRoute>
    ),
  },

  // ── Admin / Dispatcher panel ──────────────────────────────────────────────
  {
    path: '/',
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      { path: 'dashboard',     element: <S><DashboardPage /></S> },
      // Loads
      { path: 'loads',         element: <S><LoadsPage /></S> },
      { path: 'loads/new',     element: <S><CreateLoadPage /></S> },
      { path: 'loads/:id',     element: <S><LoadDetailPage /></S> },
      // Master data
      { path: 'drivers',       element: <S><DriversPage /></S> },
      { path: 'trucks',        element: <S><TrucksPage /></S> },
      { path: 'brokers',       element: <S><BrokersPage /></S> },
      { path: 'users',         element: <S><UsersPage /></S> },
      // Documents & analytics
      { path: 'documents',     element: <S><DocumentsPage /></S> },
      { path: 'reports',       element: <S><ReportsPage /></S> },
      // Utilities
      { path: 'notifications', element: <S><NotificationsPage /></S> },
      { path: 'activity-logs', element: <S><ActivityLogsPage /></S> },
      { path: 'settings',      element: <S><SettingsPage /></S> },
      // New pages
      { path: 'team',          element: <S><TeamPage /></S> },
      { path: 'billing',       element: <S><BillingPage /></S> },
      { path: 'settlements',   element: <S><SettlementsPage /></S> },
      { path: 'taxes',         element: <S><TaxesPage /></S> },
      { path: 'archive',       element: <S><ArchivePage /></S> },
    ],
  },

  // ── Driver mobile portal ──────────────────────────────────────────────────
  {
    path: '/driver',
    element: (
      <DriverRoute>
        <DriverLayout />
      </DriverRoute>
    ),
    children: [
      { index: true,               element: <S><DriverDashboard /></S> },
      { path: 'loads',             element: <S><DriverLoadsPage /></S> },
      { path: 'loads/:id',         element: <S><DriverLoadDetailPage /></S> },
      { path: 'loads/:id/upload',  element: <S><DriverUploadPage /></S> },
      { path: 'profile',           element: <S><DriverProfilePage /></S> },
      { path: 'notifications',     element: <S><DriverNotificationsPage /></S> },
      { path: 'settlements',       element: <S><DriverSettlementsPage /></S> },
      { path: 'settlements/:id',   element: <S><DriverSettlementDetailPage /></S> },
    ],
  },

  // ── 404 catch-all ────────────────────────────────────────────────────────
  { path: '*', element: <Navigate to="/" replace /> },
]);

export const AppRouter = () => <RouterProvider router={router} />;