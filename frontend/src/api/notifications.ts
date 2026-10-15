import apiClient from './client';

export interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
  loadId: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  priority: 'LOW' | 'NORMAL' | 'HIGH';
}

export interface NotificationList {
  data: NotificationRecord[];
  total: number;
}

const normalize = (row: any): NotificationRecord => ({
  id: row.id,
  type: row.type,
  title: row.title,
  message: row.message,
  isRead: Boolean(row.is_read),
  createdAt: row.created_at,
  readAt: row.read_at || null,
  loadId: row.load_id || null,
  relatedEntityType: row.related_entity_type || null,
  relatedEntityId: row.related_entity_id || null,
  priority: row.priority || 'NORMAL',
});

export const notificationsApi = {
  getNotifications: async (limit = 30, unreadOnly = false): Promise<NotificationList> => {
    const response = await apiClient.get('/notifications', {
      params: { limit, unread_only: unreadOnly || undefined },
    });
    const result = response.data.data;
    return {
      data: (result?.data || []).map(normalize),
      total: Number(result?.total || 0),
    };
  },
  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get('/notifications/unread-count');
    return Number(response.data.data.count || 0);
  },
  markNotificationRead: async (id: string): Promise<void> => {
    await apiClient.patch(`/notifications/${id}/read`);
  },
  markAllNotificationsRead: async (): Promise<void> => {
    await apiClient.patch('/notifications/read-all');
  },
};
