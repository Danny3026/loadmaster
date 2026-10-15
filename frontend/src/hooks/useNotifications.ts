import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/notifications';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export const useNotifications = (limit = 30, unreadOnly = false, enabled = true) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notifications', user?.id, limit, unreadOnly],
    queryFn: () => notificationsApi.getNotifications(limit, unreadOnly),
    enabled: enabled && Boolean(user?.id),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
};

export const useUnreadNotificationCount = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notificationUnreadCount', user?.id],
    queryFn: notificationsApi.getUnreadCount,
    enabled: Boolean(user?.id),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
};

const useRefreshNotifications = () => {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    void queryClient.invalidateQueries({ queryKey: ['notificationUnreadCount'] });
  };
};

export const useMarkRead = () => {
  const refreshNotifications = useRefreshNotifications();
  const { showError } = useToast();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markNotificationRead(id),
    onSuccess: refreshNotifications,
    onError: (error: any) => showError(error.response?.data?.error?.message || 'Unable to mark notification as read.'),
  });
};

export const useMarkAllRead = () => {
  const refreshNotifications = useRefreshNotifications();
  const { showError } = useToast();

  return useMutation({
    mutationFn: () => notificationsApi.markAllNotificationsRead(),
    onSuccess: refreshNotifications,
    onError: (error: any) => showError(error.response?.data?.error?.message || 'Unable to mark notifications as read.'),
  });
};
