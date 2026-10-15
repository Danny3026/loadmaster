import { notificationRepository } from '../repositories/notification.repository';
import { NotFoundError } from '../utils/errors';
export class NotificationService {
    async getAll(userId, filters = {}) {
        const data = await notificationRepository.findByUserId(userId, filters);
        const total = await notificationRepository.countByUserId(userId, Boolean(filters.unreadOnly));
        return { data, total };
    }
    async markAsRead(userId, id) {
        const updated = await notificationRepository.markAsRead(userId, id);
        if (!updated && !await notificationRepository.existsForUser(userId, id)) {
            throw new NotFoundError('Notification not found');
        }
    }
    async markAllAsRead(userId) {
        await notificationRepository.markAllAsRead(userId);
    }
    async getUnreadCount(userId) {
        return notificationRepository.getUnreadCount(userId);
    }
    async notifyUser(input, executor) {
        await notificationRepository.create({
            userId: input.userId,
            loadId: input.loadId,
            type: input.type,
            title: input.title,
            message: input.message,
            relatedEntityType: input.relatedEntityType,
            relatedEntityId: input.relatedEntityId,
            priority: input.priority,
        }, executor);
    }
    async notifyCompanyRoles(companyId, roles, input, executor, excludeUserId) {
        const recipientQuery = executor('users')
            .join('roles', 'roles.id', 'users.role_id')
            .where({ 'users.company_id': companyId, 'users.status': 'ACTIVE' })
            .whereIn('roles.name', roles);
        if (excludeUserId)
            recipientQuery.whereNot('users.id', excludeUserId);
        const recipients = await recipientQuery.select('users.id');
        await Promise.all(recipients.map((recipient) => this.notifyUser({
            ...input,
            companyId,
            userId: recipient.id,
        }, executor)));
    }
    async notifyAssignedDriver(companyId, driverId, input, executor) {
        const driver = await executor('drivers')
            .join('users', function () {
            this.on('users.id', 'drivers.user_id').andOn('users.company_id', 'drivers.company_id');
        })
            .join('roles', 'roles.id', 'users.role_id')
            .where({
            'drivers.id': driverId,
            'drivers.company_id': companyId,
            'users.status': 'ACTIVE',
            'roles.name': 'DRIVER',
        })
            .first('users.id as user_id');
        if (!driver?.user_id)
            return;
        await this.notifyUser({
            ...input,
            companyId,
            userId: driver.user_id,
        }, executor);
    }
    async notifyLoadDriver(companyId, loadId, input, executor) {
        const assignment = await executor('load_assignments as assignments')
            .join('drivers', 'drivers.id', 'assignments.driver_id')
            .join('loads', 'loads.id', 'assignments.load_id')
            .where({
            'assignments.load_id': loadId,
            'assignments.is_active': true,
            'loads.company_id': companyId,
            'drivers.company_id': companyId,
        })
            .orderBy('assignments.assigned_at', 'desc')
            .first('assignments.driver_id');
        if (!assignment)
            return;
        await this.notifyAssignedDriver(companyId, assignment.driver_id, {
            ...input,
            loadId,
            relatedEntityType: input.relatedEntityType || 'LOAD',
            relatedEntityId: input.relatedEntityId || loadId,
        }, executor);
    }
}
export const notificationService = new NotificationService();
