import { notificationService } from '../services/notification.service';
import { success } from '../utils/response';
export const getAll = async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const result = await notificationService.getAll(req.tenantContext.userId, {
            unreadOnly: req.query.unread_only === 'true',
            limit,
            offset: (page - 1) * limit,
        });
        res.json(success(result));
    }
    catch (err) {
        next(err);
    }
};
export const getUnreadCount = async (req, res, next) => {
    try {
        const count = await notificationService.getUnreadCount(req.tenantContext.userId);
        res.json(success({ count }));
    }
    catch (err) {
        next(err);
    }
};
export const markRead = async (req, res, next) => {
    try {
        const result = await notificationService.markAsRead(req.tenantContext.userId, req.params.id);
        res.json(success(result));
    }
    catch (err) {
        next(err);
    }
};
export const markAllRead = async (req, res, next) => {
    try {
        await notificationService.markAllAsRead(req.tenantContext.userId);
        res.json(success(null));
    }
    catch (err) {
        next(err);
    }
};
