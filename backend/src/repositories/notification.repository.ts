import db from '../config/database';
import { Notification } from '../types';
import { Knex } from 'knex';

export type NotificationExecutor = Knex | Knex.Transaction;

export class NotificationRepository {
  async create(data: Partial<Notification>, executor: NotificationExecutor = db): Promise<Notification> {
    const [notification] = await executor('notifications').insert({
      user_id: data.userId,
      load_id: data.loadId || null,
      type: data.type,
      title: data.title,
      message: data.message,
      is_read: false,
      related_entity_type: data.relatedEntityType || null,
      related_entity_id: data.relatedEntityId || null,
      priority: data.priority || 'NORMAL',
    }).returning('*');
    return notification;
  }

  async findByUserId(userId: string, filters: { unreadOnly?: boolean; limit?: number; offset?: number } = {}): Promise<Notification[]> {
    const query = db('notifications').where({ user_id: userId });

    if (filters.unreadOnly) {
      query.andWhere({ is_read: false });
    }

    if (filters.limit !== undefined) {
      query.limit(filters.limit).offset(filters.offset ?? 0);
    }

    return query.orderBy('created_at', 'desc').select('*');
  }

  async countByUserId(userId: string, unreadOnly = false): Promise<number> {
    const query = db('notifications').where({ user_id: userId });
    if (unreadOnly) query.andWhere({ is_read: false });
    const res = await query.count('id as count').first();
    return parseInt(res?.count as string, 10) || 0;
  }

  async markAsRead(userId: string, id: string): Promise<number> {
    return db('notifications')
      .where({ id, user_id: userId })
      .where({ is_read: false })
      .update({ is_read: true, read_at: db.fn.now() });
  }

  async existsForUser(userId: string, id: string): Promise<boolean> {
    const notification = await db('notifications')
      .where({ id, user_id: userId })
      .first('id');
    return Boolean(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await db('notifications')
      .where({ user_id: userId, is_read: false })
      .update({ is_read: true, read_at: db.fn.now() });
  }

  async getUnreadCount(userId: string): Promise<number> {
    const res = await db('notifications')
      .where({ user_id: userId, is_read: false })
      .count('id as count')
      .first();
    return parseInt(res?.count as string, 10) || 0;
  }
}

export const notificationRepository = new NotificationRepository();
