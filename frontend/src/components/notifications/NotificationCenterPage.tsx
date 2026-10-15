import React, { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotificationRecord } from '../../api/notifications';
import { useAuth } from '../../contexts/AuthContext';
import { useMarkAllRead, useMarkRead, useNotifications, useUnreadNotificationCount } from '../../hooks/useNotifications';
import { NotificationFeed } from './NotificationFeed';

const getDestination = (notification: NotificationRecord, role?: string) => {
  if (notification.relatedEntityType?.toUpperCase() === 'SETTLEMENT' && notification.relatedEntityId) {
    return role === 'DRIVER' ? `/driver/settlements/${notification.relatedEntityId}` : '/settlements';
  }
  const loadId = notification.loadId
    || (notification.relatedEntityType?.toUpperCase() === 'LOAD' ? notification.relatedEntityId : null);
  if (loadId) return role === 'DRIVER' ? `/driver/loads/${loadId}` : `/loads/${loadId}`;
  return role === 'DRIVER' ? '/driver/notifications' : '/notifications';
};

export const NotificationCenterPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const notificationsQuery = useNotifications(100, unreadOnly);
  const unreadQuery = useUnreadNotificationCount();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  const openNotification = async (notification: NotificationRecord) => {
    if (!notification.isRead) {
      try {
        await markRead.mutateAsync(notification.id);
      } catch {
        return;
      }
    }
    navigate(getDestination(notification, user?.role));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Bell className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Notification Center</h1>
            <p className="mt-0.5 text-sm text-slate-500">Important updates for your role and work.</p>
          </div>
        </div>
        <button
          onClick={() => markAll.mutate()}
          disabled={!unreadQuery.data || markAll.isPending}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCheck className="h-4 w-4" aria-hidden="true" />
          Mark all as read
        </button>
      </header>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex gap-5 border-b border-slate-200 px-5 pt-4">
          <button
            onClick={() => setUnreadOnly(false)}
            className={`border-b-2 pb-3 text-sm font-semibold ${!unreadOnly ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            All
          </button>
          <button
            onClick={() => setUnreadOnly(true)}
            className={`border-b-2 pb-3 text-sm font-semibold ${unreadOnly ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Unread <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">{unreadQuery.data || 0}</span>
          </button>
        </div>
        <NotificationFeed
          notifications={notificationsQuery.data?.data}
          isLoading={notificationsQuery.isLoading}
          error={notificationsQuery.error}
          onRetry={() => void notificationsQuery.refetch()}
          onOpen={openNotification}
          onMarkRead={(id) => markRead.mutate(id)}
          markingId={markRead.isPending ? markRead.variables : undefined}
          onMarkAll={() => markAll.mutate()}
          isMarkAllPending={markAll.isPending}
        />
      </section>
    </div>
  );
};
