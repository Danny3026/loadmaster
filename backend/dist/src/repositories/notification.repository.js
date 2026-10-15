import db from '../config/database';
export class NotificationRepository {
    async create(data, executor = db) {
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
    async findByUserId(userId, filters = {}) {
        const query = db('notifications').where({ user_id: userId });
        if (filters.unreadOnly) {
            query.andWhere({ is_read: false });
        }
        if (filters.limit !== undefined) {
            query.limit(filters.limit).offset(filters.offset ?? 0);
        }
        return query.orderBy('created_at', 'desc').select('*');
    }
    async countByUserId(userId, unreadOnly = false) {
        const query = db('notifications').where({ user_id: userId });
        if (unreadOnly)
            query.andWhere({ is_read: false });
        const res = await query.count('id as count').first();
        return parseInt(res?.count, 10) || 0;
    }
    async markAsRead(userId, id) {
        return db('notifications')
            .where({ id, user_id: userId })
            .where({ is_read: false })
            .update({ is_read: true, read_at: db.fn.now() });
    }
    async existsForUser(userId, id) {
        const notification = await db('notifications')
            .where({ id, user_id: userId })
            .first('id');
        return Boolean(notification);
    }
    async markAllAsRead(userId) {
        await db('notifications')
            .where({ user_id: userId, is_read: false })
            .update({ is_read: true, read_at: db.fn.now() });
    }
    async getUnreadCount(userId) {
        const res = await db('notifications')
            .where({ user_id: userId, is_read: false })
            .count('id as count')
            .first();
        return parseInt(res?.count, 10) || 0;
    }
}
export const notificationRepository = new NotificationRepository();
