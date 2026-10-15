import { loadRepository } from '../repositories/load.repository';
import { activityLogRepository } from '../repositories/activity-log.repository';
import { assignmentRepository } from '../repositories/assignment.repository';
import { VALID_STATUS_TRANSITIONS } from '../types';
import { ValidationError } from '../utils/errors';
import db from '../config/database';
import { notificationService } from './notification.service';
export class StatusService {
    async updateStatus(companyId, loadId, newStatus, actorId, actorRole, notes) {
        const load = await loadRepository.findById(companyId, loadId);
        if (!load)
            throw new ValidationError('Load not found');
        const currentStatus = (load.status || load.loadStatus);
        const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
        if (!allowedTransitions.includes(newStatus)) {
            throw new ValidationError(`Cannot transition load from ${currentStatus} to ${newStatus}`);
        }
        if (actorRole === 'DRIVER') {
            const assignment = await assignmentRepository.findActiveByLoadId(loadId);
            if (!assignment) {
                throw new ValidationError('You are not assigned to this load');
            }
            const driver = await db('drivers').where('id', assignment.driver_id).first();
            if (!driver || driver.user_id !== actorId) {
                throw new ValidationError('You are not assigned to this load');
            }
        }
        await loadRepository.updateStatus(loadId, newStatus, actorId, notes);
        await activityLogRepository.create({
            userId: actorId,
            action: 'UPDATE_STATUS',
            entityType: 'LOAD',
            entityId: loadId
        });
        if (newStatus === 'delivered') {
            await notificationService.notifyCompanyRoles(companyId, ['ADMIN', 'DISPATCHER'], {
                type: 'DELIVERY_COMPLETED',
                title: 'Delivery completed',
                message: `Load ${load.loadNumber || load.load_number} is now delivered.`,
                loadId,
                relatedEntityType: 'LOAD',
                relatedEntityId: loadId,
                priority: 'HIGH',
            }, db, actorId);
        }
    }
    async getStatusHistory(companyId, loadId) {
        const load = await loadRepository.findById(companyId, loadId);
        if (!load)
            throw new ValidationError('Load not found');
        return load.status_history || [];
    }
}
export const statusService = new StatusService();
