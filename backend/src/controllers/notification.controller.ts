import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { success } from '../utils/response';

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 30, 1), 100);
    const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
    const result = await notificationService.getAll(req.tenantContext!.userId, {
      unreadOnly: req.query.unread_only === 'true',
      limit,
      offset: (page - 1) * limit,
    });
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await notificationService.getUnreadCount(req.tenantContext!.userId);
    res.json(success({ count }));
  } catch (err) {
    next(err);
  }
};

export const markRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await notificationService.markAsRead(req.tenantContext!.userId, req.params.id);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const markAllRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notificationService.markAllAsRead(req.tenantContext!.userId);
    res.json(success(null));
  } catch (err) {
    next(err);
  }
};
