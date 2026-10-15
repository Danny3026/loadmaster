import React, { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotificationRecord } from '../../api/notifications';
import { useAuth } from '../../contexts/AuthContext';
import { useMarkAllRead, useMarkRead, useNotifications, useUnreadNotificationCount } from '../../hooks/useNotifications';
import { NotificationFeed } from './NotificationFeed';

const getDestination = (notification: NotificationRecord, role?: string) => {
  const entityType = notification.relatedEntityType?.toUpperCase();
  if (entityType === 'SETTLEMENT' && notification.relatedEntityId) {
    return role === 'DRIVER'
      ? `/driver/settlements/${notification.relatedEntityId}`
      : '/settlements';
  }
  const loadId = notification.loadId
    || (entityType === 'LOAD' ? notification.relatedEntityId : null);
  if (loadId) return role === 'DRIVER' ? `/driver/loads/${loadId}` : `/loads/${loadId}`;
  return role === 'DRIVER' ? '/driver/notifications' : '/notifications';
};

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef<number | undefined>(undefined);
  const pulseTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [isOpen, setIsOpen] = useState(false);
  const [shouldPulse, setShouldPulse] = useState(false);
  const notificationsQuery = useNotifications(8, false, isOpen);
  const unreadQuery = useUnreadNotificationCount();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const unreadCount = unreadQuery.data || 0;

  useEffect(() => {
    if (lastCount.current !== undefined && unreadCount > lastCount.current) {
      setShouldPulse(true);
      if (pulseTimeout.current) clearTimeout(pulseTimeout.current);
      pulseTimeout.current = setTimeout(() => setShouldPulse(false), 900);
    }
    lastCount.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  useEffect(() => () => {
    if (pulseTimeout.current) clearTimeout(pulseTimeout.current);
  }, []);

  const openNotification = async (notification: NotificationRecord) => {
    if (!notification.isRead) {
      try {
        await markRead.mutateAsync(notification.id);
      } catch {
        return;
      }
    }
    setIsOpen(false);
    navigate(getDestination(notification, user?.role));
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={unreadQuery.isError
          ? 'Notifications, unread count unavailable'
          : unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        title={unreadQuery.isError ? 'Unable to load unread count' : 'Notifications'}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Bell className={`h-5 w-5 ${shouldPulse ? 'notification-bell-pulse' : ''}`} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <section
          role="dialog"
          aria-label="Notification center"
          className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
              <p className="text-xs text-slate-500">{unreadCount} unread</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate(user?.role === 'DRIVER' ? '/driver/notifications' : '/notifications');
              }}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800"
            >
              View all
            </button>
          </header>
          <div className="max-h-[min(70vh,28rem)] overflow-y-auto">
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
              compact
            />
          </div>
        </section>
      )}
    </div>
  );
};
