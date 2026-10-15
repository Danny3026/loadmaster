import { loadRepository } from '../repositories/load.repository';
import { loadAssignmentRepository } from '../repositories/load-assignment.repository';
import { dispatchService } from './dispatch.service';
import db from '../config/database';
import { NotFoundError, AppError, ConflictError, ValidationError } from '../utils/errors';
import { notificationService } from './notification.service';
export class LoadService {
    async getAll(companyId, filters, pagination, driverUserId) {
        const query = db('loads')
            .select('loads.*', 'brokers.name as broker_name', 'companies.name as company_name', 'drivers.id as driver_id', 'drivers.first_name as driver_first_name', 'drivers.last_name as driver_last_name')
            .leftJoin('brokers', function () {
            this.on('loads.broker_id', 'brokers.id').andOn('loads.company_id', 'brokers.company_id');
        })
            .leftJoin('companies', 'loads.company_id', 'companies.id')
            .leftJoin('load_assignments', function () {
            this.on('loads.id', 'load_assignments.load_id').andOnVal('load_assignments.is_active', true);
        })
            .leftJoin('drivers', function () {
            this.on('load_assignments.driver_id', 'drivers.id').andOn('loads.company_id', 'drivers.company_id');
        })
            .where('loads.company_id', companyId);
        query.select(db.raw(`(
          SELECT assignment_driver.id
          FROM load_assignments AS historical_assignment
          JOIN drivers AS assignment_driver ON assignment_driver.id = historical_assignment.driver_id
            AND assignment_driver.company_id = loads.company_id
          WHERE historical_assignment.load_id = loads.id
          ORDER BY historical_assignment.created_at DESC
          LIMIT 1
        ) as latest_driver_id`), db.raw(`(
          SELECT assignment_driver.first_name
          FROM load_assignments AS historical_assignment
          JOIN drivers AS assignment_driver ON assignment_driver.id = historical_assignment.driver_id
            AND assignment_driver.company_id = loads.company_id
          WHERE historical_assignment.load_id = loads.id
          ORDER BY historical_assignment.created_at DESC
          LIMIT 1
        ) as latest_driver_first_name`), db.raw(`(
          SELECT assignment_driver.last_name
          FROM load_assignments AS historical_assignment
          JOIN drivers AS assignment_driver ON assignment_driver.id = historical_assignment.driver_id
            AND assignment_driver.company_id = loads.company_id
          WHERE historical_assignment.load_id = loads.id
          ORDER BY historical_assignment.created_at DESC
          LIMIT 1
        ) as latest_driver_last_name`));
        if (driverUserId) {
            query.whereExists(function () {
                this.select('*').from('load_assignments as driver_assignment')
                    .join('drivers as assigned_driver', 'assigned_driver.id', 'driver_assignment.driver_id')
                    .whereRaw('driver_assignment.load_id = loads.id')
                    .andWhere('assigned_driver.user_id', driverUserId);
            });
        }
        if (filters.status)
            query.where('loads.status', String(filters.status).toLowerCase());
        if (filters.broker_id)
            query.where('loads.broker_id', filters.broker_id);
        if (filters.type)
            query.where('loads.equipment_type', String(filters.type).toUpperCase());
        if (filters.search) {
            const search = `%${String(filters.search).trim()}%`;
            query.where(function () {
                this.whereILike('loads.load_number', search)
                    .orWhereILike('brokers.name', search)
                    .orWhereILike('companies.name', search)
                    .orWhereExists(function () {
                    this.select('*')
                        .from('load_stops as search_stop')
                        .whereRaw('search_stop.load_id = loads.id')
                        .andWhere(function () {
                        this.whereILike('search_stop.city', search)
                            .orWhereILike('search_stop.state', search)
                            .orWhereILike('search_stop.address_line1', search);
                    });
                });
            });
        }
        if (filters.date_from) {
            query.whereExists(function () {
                this.select('*').from('load_stops as from_stop')
                    .whereRaw('from_stop.load_id = loads.id')
                    .andWhere('from_stop.appointment_date', '>=', filters.date_from);
            });
        }
        if (filters.date_to) {
            query.whereExists(function () {
                this.select('*').from('load_stops as to_stop')
                    .whereRaw('to_stop.load_id = loads.id')
                    .andWhere('to_stop.appointment_date', '<=', filters.date_to);
            });
        }
        const [{ count }] = await query.clone().clearSelect().count('loads.id');
        const loads = await query.orderBy('loads.created_at', 'desc').limit(pagination.limit).offset(pagination.offset);
        // Fetch stops for the retrieved loads
        if (loads.length > 0) {
            const loadIds = loads.map((l) => l.id);
            const allStops = await db('load_stops')
                .select('*', db.raw("to_char(appointment_date, 'YYYY-MM-DD') as appointment_date"))
                .whereIn('load_id', loadIds)
                .orderBy(['load_id', 'stop_sequence']);
            // Attach stop information to loads
            for (const load of loads) {
                const loadStops = allStops.filter((s) => s.load_id === load.id);
                const pickups = loadStops.filter((s) => s.stop_type === 'PICKUP');
                const deliveries = loadStops.filter((s) => s.stop_type === 'DELIVERY');
                if (pickups.length > 0) {
                    const firstPickup = pickups[0];
                    load.origin = `${firstPickup.city}, ${firstPickup.state}`;
                    load.pickup_date = firstPickup.appointment_date;
                }
                if (deliveries.length > 0) {
                    const firstDelivery = deliveries[0];
                    load.destination = `${firstDelivery.city}, ${firstDelivery.state}`;
                    load.delivery_date = firstDelivery.appointment_date;
                }
            }
        }
        return { data: loads, total: parseInt(count) };
    }
    async getById(companyId, id, driverUserId) {
        const load = await loadRepository.findById(companyId, id);
        if (!load)
            throw new NotFoundError('Load not found');
        if (driverUserId) {
            const assignment = await db('load_assignments as la')
                .join('drivers as d', 'd.id', 'la.driver_id')
                .where({ 'la.load_id': id, 'd.user_id': driverUserId })
                .first();
            if (!assignment)
                throw new NotFoundError('Load not found');
        }
        const assignment = await loadAssignmentRepository.findActiveByLoad(id, companyId);
        return { ...load, assignment };
    }
    async create(companyId, userId, data) {
        const { stops, broker_name, broker_mc, broker_mc_confirmed_missing: _brokerMcConfirmedMissing, ...rest } = data;
        // Extract only valid load columns
        const loadData = {
            broker_id: rest.broker_id,
            broker_reference: rest.broker_reference,
            commodity: rest.commodity,
            weight: rest.weight,
            weight_unit: rest.weight_unit,
            rate: rest.rate,
            currency: rest.currency,
            equipment_type: rest.equipment_type,
            equipment_type_raw: rest.equipment_type_raw,
            special_instructions: rest.special_instructions,
            loaded_miles: rest.loaded_miles,
            deadhead_miles: rest.deadhead_miles,
        };
        const requestedLoadNumber = typeof rest.load_number === 'string' ? rest.load_number.trim() : '';
        const [{ count }] = await db('loads').where({ company_id: companyId }).count('id');
        const loadCount = parseInt(count) + 1;
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const load_number = requestedLoadNumber || `LD-${dateStr}-${loadCount.toString().padStart(4, '0')}`;
        const existingLoad = await db('loads')
            .where({ company_id: companyId, load_number })
            .first('id');
        if (existingLoad) {
            throw new ConflictError(`Load number ${load_number} already exists in your company. Use a unique load number or open the existing load.`);
        }
        if (!loadData.broker_id) {
            // Auto-create broker
            if (!broker_name || broker_name.trim() === '') {
                throw new ValidationError('Broker name is required when no existing broker is selected');
            }
            const nameToUse = broker_name.trim();
            const [newBroker] = await db('brokers').insert({
                company_id: companyId,
                name: nameToUse,
                mc_number: broker_mc || null,
                status: 'ACTIVE'
            }).returning('id');
            loadData.broker_id = newBroker.id;
        }
        else {
            const broker = await db('brokers')
                .where({ id: loadData.broker_id, company_id: companyId })
                .first('id');
            if (!broker)
                throw new NotFoundError('Broker not found');
        }
        return loadRepository.create(companyId, {
            ...loadData,
            load_number,
            created_by: userId,
            status: 'pending'
        }, stops);
    }
    async update(companyId, id, data, userId) {
        const load = await loadRepository.findById(companyId, id);
        if (!load)
            throw new NotFoundError('Load not found');
        const { driver_id, override_availability_conflict, ...loadData } = data;
        if (driver_id) {
            const currentAssignment = await db('load_assignments as la')
                .join('drivers as d', 'd.id', 'la.driver_id')
                .where({ 'la.load_id': id, 'la.is_active': true, 'd.company_id': companyId })
                .first('la.driver_id');
            if (currentAssignment?.driver_id !== driver_id) {
                if (!userId)
                    throw new AppError('User context is required to assign a driver', 400);
                await dispatchService.assignLoad(companyId, id, driver_id, undefined, userId, false, override_availability_conflict === true, true);
            }
        }
        // Can add validation here if status doesn't allow editing
        return loadRepository.update(companyId, id, loadData);
    }
    async delete(companyId, id) {
        const load = await loadRepository.findById(companyId, id);
        if (!load)
            throw new NotFoundError('Load not found');
        if (load.status !== 'pending') {
            throw new AppError('Only pending loads can be deleted');
        }
        await db('loads').where({ id, company_id: companyId }).delete();
        return true;
    }
    async getStatusHistory(companyId, loadId, driverUserId) {
        const load = await loadRepository.findById(companyId, loadId);
        if (!load)
            throw new NotFoundError('Load not found');
        if (driverUserId) {
            const assignment = await db('load_assignments as la')
                .join('drivers as d', 'd.id', 'la.driver_id')
                .where({ 'la.load_id': loadId, 'la.is_active': true, 'd.user_id': driverUserId, 'd.company_id': companyId })
                .first('la.id');
            if (!assignment)
                throw new NotFoundError('Load not found');
        }
        return db('load_status_history').where({ load_id: loadId }).orderBy('created_at', 'desc');
    }
    async archive(companyId, loadId, userId) {
        const load = await loadRepository.findById(companyId, loadId);
        if (!load)
            throw new NotFoundError('Load not found');
        if (load.status === 'cancelled')
            return load;
        await db.transaction(async (trx) => {
            const activeAssignment = await trx('load_assignments as la')
                .join('drivers as d', 'd.id', 'la.driver_id')
                .where({ 'la.load_id': loadId, 'la.is_active': true, 'd.company_id': companyId })
                .first('driver_id');
            await trx('loads').where({ id: loadId, company_id: companyId }).update({ status: 'cancelled', updated_at: trx.fn.now() });
            await trx('load_status_history').insert({ load_id: loadId, from_status: load.status, to_status: 'cancelled', changed_by: userId, notes: 'Load archived' });
            if (activeAssignment?.driver_id) {
                await notificationService.notifyAssignedDriver(companyId, activeAssignment.driver_id, {
                    type: 'LOAD_CANCELLED',
                    title: 'Load cancelled',
                    message: `Load ${load.load_number} has been cancelled.`,
                    loadId,
                    relatedEntityType: 'LOAD',
                    relatedEntityId: loadId,
                    priority: 'HIGH',
                }, trx);
            }
        });
        return loadRepository.findById(companyId, loadId);
    }
    async restore(companyId, loadId, userId) {
        const load = await loadRepository.findById(companyId, loadId);
        if (!load)
            throw new NotFoundError('Load not found');
        if (load.status !== 'cancelled')
            return load;
        const previous = await db('load_status_history').where({ load_id: loadId, to_status: 'cancelled' }).orderBy('created_at', 'desc').first();
        const restoredStatus = previous?.from_status || 'pending';
        await db.transaction(async (trx) => {
            await trx('loads').where({ id: loadId, company_id: companyId }).update({ status: restoredStatus, updated_at: trx.fn.now() });
            await trx('load_status_history').insert({ load_id: loadId, from_status: 'cancelled', to_status: restoredStatus, changed_by: userId, notes: 'Load restored from archive' });
            const activeAssignment = await trx('load_assignments as la')
                .join('drivers as d', 'd.id', 'la.driver_id')
                .where({ 'la.load_id': loadId, 'la.is_active': true, 'd.company_id': companyId })
                .first('driver_id');
            if (activeAssignment?.driver_id) {
                await notificationService.notifyAssignedDriver(companyId, activeAssignment.driver_id, {
                    type: 'LOAD_STATUS_CHANGED',
                    title: 'Load restored',
                    message: `Load ${load.load_number} has been restored.`,
                    loadId,
                    relatedEntityType: 'LOAD',
                    relatedEntityId: loadId,
                }, trx);
            }
        });
        return loadRepository.findById(companyId, loadId);
    }
}
export const loadService = new LoadService();
