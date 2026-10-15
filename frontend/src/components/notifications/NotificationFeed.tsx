import React from 'react';
import { Bell, Check, Clock3, FileText, Truck } from 'lucide-react';
import { NotificationRecord } from '../../api/notifications';

interface NotificationFeedProps {
  notifications?: NotificationRecord[];
  isLoading: boolean;
  error: unknown;
  onRetry?: () => void;
  onOpen: (notification: NotificationRecord) => void;
  onMarkRead: (id: string) => void;
  markingId?: string;
  onMarkAll?: () => void;
  isMarkAllPending?: boolean;
  compact?: boolean;
}

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const categoryLabel = (type: string) =>
  type.toLowerCase().replace(/_/g, ' ');

const isLoadNotification = (notification: NotificationRecord) =>
  ['LOAD', 'LOAD_ASSIGNMENT'].includes(notification.relatedEntityType?.toUpperCase() || '');

export const NotificationFeed: React.FC<NotificationFeedProps> = ({
  notifications = [],
  isLoading,
  error,
  onRetry,
  onOpen,
  onMarkRead,
  markingId,
  onMarkAll,
  isMarkAllPending = false,
  compact = false,
}) => {
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-3 py-10 text-sm text-slate-500" role="status">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
        Loading notifications…
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-5 py-8 text-center">
        <p className="text-sm font-medium text-rose-700">Notifications could not be loaded.</p>
        {onRetry && (
          <button onClick={onRetry} className="mt-3 text-sm font-semibold text-blue-700 hover:text-blue-800">
            Try again
          </button>
        )}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="px-6 py-10 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Bell className="h-6 w-6" aria-hidden="true" />
        </span>
        <h3 className="mt-3 text-sm font-semibold text-slate-900">You're all caught up</h3>
        <p className="mt-1 text-sm text-slate-500">Important updates for your work will appear here.</p>
      </div>
    );
  }

  return (
    <div>
      {onMarkAll && unreadCount > 0 && (
        <div className="flex justify-end border-b border-slate-100 px-4 py-2">
          <button
            onClick={onMarkAll}
            disabled={isMarkAllPending}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            Mark all as read
          </button>
        </div>
      )}
      <ul className="divide-y divide-slate-100">
        {notifications.map((notification) => (
          <li
            key={notification.id}
            className={`relative ${!notification.isRead ? 'bg-blue-50/60' : 'bg-white'}`}
          >
            <div className={`flex gap-3 ${compact ? 'px-4 py-3' : 'px-5 py-4 sm:px-6'}`}>
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                notification.relatedEntityType === 'SETTLEMENT'
                  ? 'bg-emerald-100 text-emerald-700'
                  : isLoadNotification(notification)
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-600'
              }`}>
                {notification.relatedEntityType === 'SETTLEMENT'
                  ? <FileText className="h-4 w-4" aria-hidden="true" />
                  : isLoadNotification(notification)
                    ? <Truck className="h-4 w-4" aria-hidden="true" />
                    : <Bell className="h-4 w-4" aria-hidden="true" />}
              </span>
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => onOpen(notification)}
                  className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className={`text-sm ${notification.isRead ? 'font-medium text-slate-800' : 'font-semibold text-slate-950'}`}>
                      {notification.title}
                    </span>
                    {!notification.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="Unread" />}
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-slate-600">{notification.message}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span className="capitalize">{categoryLabel(notification.type)}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3 w-3" aria-hidden="true" />
                      {formatTimestamp(notification.createdAt)}
                    </span>
                    {notification.loadId && <span>Related load</span>}
                  </span>
                </button>
                {!notification.isRead && (
                  <button
                    onClick={() => onMarkRead(notification.id)}
                    disabled={markingId === notification.id}
                    className="mt-2 rounded px-1 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                  >
                    {markingId === notification.id ? 'Saving…' : 'Mark as read'}
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
