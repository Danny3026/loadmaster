import db from '../config/database';
import { AppError, ConflictError, NotFoundError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { dateRangesOverlap } from '../utils/date-range';
import { notificationService } from './notification.service';
import {
  DEFAULT_DISPATCH_NOTIFICATION_TEMPLATE,
  renderDispatchNotificationTemplate,
} from './dispatch-notification-template';

const formatDateOnly = (value: Date | string): string => {
  if (!(value instanceof Date)) return value.slice(0, 10);
  if (Number.isNaN(value.getTime())) throw new Error('Invalid date returned from database');

  const year = String(value.getFullYear()).padStart(4, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export class DispatchService {
  private readonly VALID_TRANSITIONS: Record<string, string[]> = {
    pending: ['dispatched'],
    dispatched: ['in_transit'],
    in_transit: ['delivered'],
    delivered: [],
  };

  private formatStopDate(stop: any): string {
    if (!stop?.appointment_date) return '';
    const date = new Date(`${formatDateOnly(stop.appointment_date)}T00:00:00`);
    const dateText = Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US');
    const time = stop.appointment_start ? String(stop.appointment_start).slice(0, 5) : '';
    return [dateText, time].filter(Boolean).join(' ');
  }

  private stopLocation(stop: any): string {
    return [stop?.facility_name, stop?.city, stop?.state].filter(Boolean).join(', ');
  }

  private async notifyDispatch(
    trx: any,
    companyId: string,
    load: any,
    driver: any,
    assignmentId: string
  ): Promise<void> {
    const alreadyNotified = await trx('notifications')
      .where({
        type: 'LOAD_DISPATCHED',
        related_entity_type: 'LOAD_ASSIGNMENT',
        related_entity_id: assignmentId,
      })
      .first('id');
    if (alreadyNotified) return;

    const [company, broker, stops] = await Promise.all([
      trx('companies').where({ id: companyId }).first('name', 'dispatch_notification_template'),
      load.broker_id
        ? trx('brokers').where({ id: load.broker_id, company_id: companyId }).first('name')
        : Promise.resolve(null),
      trx('load_stops').where({ load_id: load.id }).orderBy('stop_sequence', 'asc'),
    ]);
    const pickup = stops.find((stop: any) => stop.stop_type === 'PICKUP');
    const delivery = stops.find((stop: any) => stop.stop_type === 'DELIVERY');
    const template = company?.dispatch_notification_template || DEFAULT_DISPATCH_NOTIFICATION_TEMPLATE;
    const message = renderDispatchNotificationTemplate(template, {
      company_name: company?.name || '',
      load_number: load.load_number || '',
      driver_name: `${driver.first_name || ''} ${driver.last_name || ''}`.trim(),
      pickup_location: this.stopLocation(pickup),
      pickup_date: this.formatStopDate(pickup),
      delivery_location: this.stopLocation(delivery),
      delivery_date: this.formatStopDate(delivery),
      miles: load.loaded_miles === null || load.loaded_miles === undefined ? '' : String(load.loaded_miles),
      broker_name: broker?.name || '',
      commodity: load.commodity || '',
      rate: '',
    });

    await notificationService.notifyAssignedDriver(companyId, driver.id, {
      type: 'LOAD_DISPATCHED',
      title: `Load ${load.load_number} dispatched`,
      message,
      loadId: load.id,
      relatedEntityType: 'LOAD_ASSIGNMENT',
      relatedEntityId: assignmentId,
      priority: 'NORMAL',
    }, trx);
  }

  /**
   * Assign a driver + truck to a load.
   * Automatically sets driver status to ASSIGNED.
   */
  async assignLoad(
    companyId: string,
    loadId: string,
    driverId: string,
    truckId: string | undefined,
    userId: string,
    dispatchNow = false,
    overrideAvailabilityConflict = false,
    preserveLoadStatus = false
  ) {
    return db.transaction(async (trx) => {
      // 1. Verify load exists and belongs to company
      const load = await trx('loads')
        .where({ id: loadId, company_id: companyId })
        .forUpdate()
        .first();
      if (!load) throw new AppError('Load not found', 404);
      const previousAssignment = await trx('load_assignments as la')
        .join('drivers as d', 'd.id', 'la.driver_id')
        .where({ 'la.load_id': loadId, 'la.is_active': true, 'd.company_id': companyId })
        .first('la.driver_id');

      if (await this.isDriverUser(userId)) {
        const assignment = await trx('load_assignments as la')
          .join('drivers as d', 'd.id', 'la.driver_id')
          .where({ 'la.load_id': loadId, 'la.is_active': true, 'd.user_id': userId })
          .first();
        if (!assignment) throw new AppError('You are not assigned to this load', 403);
      }

      if (dispatchNow && load.status !== 'pending') {
        throw new AppError(`Load is already ${load.status.toLowerCase().replace('_', ' ')}`, 400);
      }

      // 2. Verify driver exists and belongs to company
      const driver = await trx('drivers')
        .where({ id: driverId, company_id: companyId })
        .forUpdate()
        .first();
      if (!driver) throw new AppError('Driver not found', 404);

      const stopDates = await trx('load_stops')
        .where({ load_id: loadId })
        .whereNotNull('appointment_date')
        .min({ start_date: 'appointment_date' })
        .max({ end_date: 'appointment_date' })
        .first();
      const loadStart = stopDates?.start_date ? formatDateOnly(stopDates.start_date) : null;
      const loadEnd = stopDates?.end_date ? formatDateOnly(stopDates.end_date) : null;
      if (loadStart && loadEnd) {
        const unavailable = await trx('driver_availability')
          .where({ company_id: companyId, driver_id: driverId, status: 'UNAVAILABLE' })
          .where('start_date', '<=', loadEnd)
          .where('end_date', '>=', loadStart)
          .orderBy('start_date', 'asc');
        const conflictingPeriods = unavailable.filter((period: any) => dateRangesOverlap(
          formatDateOnly(period.start_date),
          formatDateOnly(period.end_date),
          loadStart,
          loadEnd
        ));
        if (conflictingPeriods.length && !overrideAvailabilityConflict) {
          const periods = conflictingPeriods.map((period: any) => ({
            start_date: formatDateOnly(period.start_date),
            end_date: formatDateOnly(period.end_date),
            reason: period.reason || null,
          }));
          throw new ConflictError(
            `${driver.first_name} ${driver.last_name} is unavailable during part of this load. Confirm to assign anyway.`,
            { type: 'DRIVER_UNAVAILABLE', driver_id: driverId, driver_name: `${driver.first_name} ${driver.last_name}`, periods }
          );
        }
      }

      if (driver.status !== 'ACTIVE') {
        throw new AppError('Selected driver is not available', 409);
      }

      // 3. Use the requested truck or reserve the first active, unassigned truck.
      let truckQuery = trx('trucks')
        .where({ company_id: companyId, status: 'ACTIVE' })
        .forUpdate();
      if (truckId) {
        truckQuery = truckQuery.where('id', truckId);
      } else {
        truckQuery = truckQuery.whereNotExists(function () {
          this.select('*')
            .from('load_assignments as active_assignment')
            .whereRaw('active_assignment.truck_id = trucks.id')
            .andWhere('active_assignment.is_active', true);
        });
      }
      const truck = await truckQuery.first();
      if (!truck) throw new NotFoundError('No available truck is currently eligible for this company');

      if (truckId) {
        const truckInUse = await trx('load_assignments')
          .where({ truck_id: truck.id, is_active: true })
          .whereNot({ load_id: loadId })
          .first();
        if (truckInUse) throw new AppError('Selected truck is already assigned', 409);
      }

      // 4. Deactivate any existing active assignment for this load
      await trx('load_assignments')
        .where({ load_id: loadId, is_active: true })
        .update({ is_active: false, unassigned_at: trx.fn.now() });

      // 5. Create new assignment
      const [assignment] = await trx('load_assignments')
        .insert({
          id: uuidv4(),
          load_id: loadId,
          driver_id: driverId,
          truck_id: truck.id,
          assigned_by: userId,
          assigned_at: trx.fn.now(),
          is_active: true,
        })
        .returning('*');

      // 6. Dispatch is a single persisted lifecycle transition.
      const previousStatus = load.status;
      const newStatus = preserveLoadStatus ? load.status : dispatchNow ? 'dispatched' : 'pending';
      await trx('loads').where({ id: loadId }).update({ status: newStatus, updated_at: trx.fn.now() });

      // 7. AUTO: Set driver status to ASSIGNED
      await trx('drivers')
        .where({ id: driverId })
        .update({ status: 'ASSIGNED', updated_at: trx.fn.now() });

      // 8. Record the lifecycle transition.
      if (previousStatus !== newStatus) {
        await trx('load_status_history').insert({
          id: uuidv4(), load_id: loadId, from_status: previousStatus,
          to_status: newStatus, changed_by: userId,
          notes: `Dispatched to driver ${driver.first_name} ${driver.last_name}`,
        });
      }

      // 9. Activity log
      await trx('activity_logs').insert({
        id: uuidv4(),
        company_id: companyId,
        user_id: userId,
        entity_type: 'LOAD',
        entity_id: loadId,
        action: dispatchNow ? 'DISPATCHED' : 'ASSIGNED',
        details: JSON.stringify({ driverId, truckId }),
      });

      const templateDispatch = dispatchNow
        || (preserveLoadStatus && load.status === 'dispatched' && previousAssignment?.driver_id !== driverId);
      if (templateDispatch) {
        await this.notifyDispatch(trx, companyId, load, driver, assignment.id);
      } else if (previousAssignment?.driver_id !== driverId) {
        await notificationService.notifyAssignedDriver(companyId, driverId, {
          type: previousAssignment?.driver_id ? 'LOAD_ASSIGNMENT_CHANGED' : 'LOAD_ASSIGNED',
          title: previousAssignment?.driver_id ? 'Load assignment changed' : 'New load assigned',
          message: `Load ${load.load_number} has been assigned to you.`,
          loadId,
          relatedEntityType: 'LOAD',
          relatedEntityId: loadId,
        }, trx);
      }
      if (previousAssignment?.driver_id && previousAssignment.driver_id !== driverId) {
        await notificationService.notifyAssignedDriver(companyId, previousAssignment.driver_id, {
          type: 'LOAD_ASSIGNMENT_CHANGED',
          title: 'Load assignment changed',
          message: `You are no longer assigned to load ${load.load_number}.`,
          loadId,
          relatedEntityType: 'LOAD',
          relatedEntityId: loadId,
        }, trx);
      }

      return { loadId, assignment, newStatus };
    });
  }

  private async isDriverUser(userId: string) {
    const user = await db('users').select('roles.name as role').join('roles', 'roles.id', 'users.role_id').where('users.id', userId).first();
    return user?.role === 'DRIVER';
  }

  /**
   * Unassign the current driver/truck from a load.
   * Automatically restores driver status to ACTIVE.
   */
  async unassignLoad(companyId: string, loadId: string, userId: string) {
    return db.transaction(async (trx) => {
      const load = await trx('loads')
        .where({ id: loadId, company_id: companyId })
        .forUpdate()
        .first();
      if (!load) throw new AppError('Load not found', 404);

      // Find active assignment
      const activeAssignment = await trx('load_assignments')
        .where({ load_id: loadId, is_active: true })
        .first();

      if (!activeAssignment) {
        throw new AppError('No active assignment found for this load', 400);
      }
      throw new AppError('Loads cannot be returned to pending after dispatch', 400);
    });
  }

  /**
   * Dispatch a load (move from ASSIGNED → DISPATCHED).
   */
  async dispatchLoad(companyId: string, loadId: string, userId: string) {
    return this.updateLoadStatus(companyId, loadId, 'dispatched', userId, 'Load dispatched');
  }

  /**
   * General status update with transition validation.
   */
  async updateLoadStatus(
    companyId: string,
    loadId: string,
    newStatus: string,
    userId: string,
    notes?: string,
    location?: string
  ) {
    return db.transaction(async (trx) => {
      // 1. Get current load
      const load = await trx('loads')
        .where({ id: loadId, company_id: companyId })
        .forUpdate()
        .first();

      if (!load) throw new AppError('Load not found', 404);

      const actorIsDriver = await this.isDriverUser(userId);
      const activeAssignment = await trx('load_assignments as assignments')
        .join('loads', 'loads.id', 'assignments.load_id')
        .join('drivers', function () {
          this.on('drivers.id', 'assignments.driver_id').andOn('drivers.company_id', 'loads.company_id');
        })
        .where({ 'assignments.load_id': loadId, 'assignments.is_active': true, 'loads.company_id': companyId })
        .first('assignments.id as assignment_id', 'assignments.driver_id', 'drivers.user_id', 'drivers.first_name', 'drivers.last_name');

      if (actorIsDriver) {
        const assignment = await trx('load_assignments as la')
          .join('drivers as d', 'd.id', 'la.driver_id')
          .where({ 'la.load_id': loadId, 'la.is_active': true, 'd.user_id': userId })
          .first();
        if (!assignment) throw new AppError('You are not assigned to this load', 403);
      }

      const currentStatus = load.status;

      // 2. Validate transition
      const allowedTransitions = this.VALID_TRANSITIONS[currentStatus] || [];
      if (!allowedTransitions.includes(newStatus)) {
        throw new AppError(
          `Invalid status transition from ${currentStatus} to ${newStatus}`,
          400
        );
      }

      // 3. Update load
      await trx('loads')
        .where({ id: loadId })
        .update({ status: newStatus, updated_at: trx.fn.now() });

      // 4. If load is completed/cancelled → free up the driver
      if (newStatus === 'delivered') {
        const activeAssignment = await trx('load_assignments as la')
          .join('drivers as d', 'd.id', 'la.driver_id')
          .where({ 'la.load_id': loadId, 'la.is_active': true, 'd.company_id': companyId })
          .first('la.driver_id');

        if (activeAssignment?.driver_id) {
          const hasAnotherActiveLoad = await trx('load_assignments')
            .where({ driver_id: activeAssignment.driver_id, is_active: true })
            .whereNot({ load_id: loadId })
            .whereExists(function () {
              this.select('*')
                .from('loads as active_load')
                .whereRaw('active_load.id = load_assignments.load_id')
                .whereIn('active_load.status', ['pending', 'dispatched', 'in_transit']);
            })
            .first();

          if (!hasAnotherActiveLoad) {
            await trx('drivers')
              .where({ id: activeAssignment.driver_id })
              .update({ status: 'ACTIVE', updated_at: trx.fn.now() });
          }
        }

        await trx('load_assignments').where({ load_id: loadId, is_active: true })
          .update({ is_active: false, unassigned_at: trx.fn.now() });
      }

      // 5. Record history
      await trx('load_status_history').insert({
        id: uuidv4(),
        load_id: loadId,
        from_status: currentStatus,
        to_status: newStatus,
        changed_by: userId,
        notes: notes || null,
      });

      // 6. Activity log
      await trx('activity_logs').insert({
        id: uuidv4(),
        company_id: companyId,
        user_id: userId,
        entity_type: 'LOAD',
        entity_id: loadId,
        action: 'STATUS_UPDATE',
        details: JSON.stringify({ from: currentStatus, to: newStatus, location }),
      });

      if (activeAssignment && newStatus === 'dispatched') {
        const driver = await trx('drivers')
          .where({ id: activeAssignment.driver_id, company_id: companyId })
          .first('id', 'first_name', 'last_name');
        if (driver) await this.notifyDispatch(trx, companyId, load, driver, activeAssignment.assignment_id);
      } else if (activeAssignment) {
        const statusLabel = newStatus.replace(/_/g, ' ');
        await notificationService.notifyAssignedDriver(companyId, activeAssignment.driver_id, {
          type: newStatus === 'delivered' ? 'LOAD_DELIVERED' : 'LOAD_STATUS_CHANGED',
          title: newStatus === 'delivered' ? 'Delivery completed' : 'Load status updated',
          message: `Load ${load.load_number} is now ${statusLabel}.`,
          loadId,
          relatedEntityType: 'LOAD',
          relatedEntityId: loadId,
          priority: newStatus === 'delivered' ? 'HIGH' : 'NORMAL',
        }, trx);
      }

      if (actorIsDriver) {
        await notificationService.notifyCompanyRoles(companyId, ['ADMIN', 'DISPATCHER'], {
          type: newStatus === 'delivered' ? 'DELIVERY_COMPLETED' : 'DRIVER_LOAD_STATUS_CHANGED',
          title: newStatus === 'delivered' ? 'Delivery completed' : 'Driver updated load status',
          message: `Load ${load.load_number} is now ${newStatus.replace(/_/g, ' ')}.`,
          loadId,
          relatedEntityType: 'LOAD',
          relatedEntityId: loadId,
          priority: newStatus === 'delivered' ? 'HIGH' : 'NORMAL',
        }, trx, userId);
      }

      return { loadId, currentStatus, newStatus };
    });
  }

  // Kept for backward compatibility
  async updateStatus(
    companyId: string,
    loadId: string,
    newStatus: string,
    userId: string,
    notes?: string
  ) {
    return this.updateLoadStatus(companyId, loadId, newStatus, userId, notes);
  }
}

export const dispatchService = new DispatchService();
