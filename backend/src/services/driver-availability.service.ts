import db from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';

export class DriverAvailabilityService {
  private async assertDriver(companyId: string, driverId: string) {
    const driver = await db('drivers')
      .where({ id: driverId, company_id: companyId })
      .first('id');
    if (!driver) throw new NotFoundError('Driver not found');
  }

  async list(companyId: string, driverId: string) {
    await this.assertDriver(companyId, driverId);
    return db('driver_availability')
      .where({ company_id: companyId, driver_id: driverId })
      .orderBy('start_date', 'asc');
  }

  async create(companyId: string, driverId: string, input: any) {
    await this.assertDriver(companyId, driverId);
    if (input.end_date < input.start_date) throw new ValidationError('End date must be on or after start date');
    const [record] = await db('driver_availability').insert({
      company_id: companyId,
      driver_id: driverId,
      status: 'UNAVAILABLE',
      start_date: input.start_date,
      end_date: input.end_date,
      reason: input.reason?.trim() || null,
    }).returning('*');
    return record;
  }

  async update(companyId: string, driverId: string, availabilityId: string, input: any) {
    await this.assertDriver(companyId, driverId);
    const existing = await db('driver_availability').where({ id: availabilityId, company_id: companyId, driver_id: driverId }).first();
    if (!existing) throw new NotFoundError('Availability record not found');
    const nextStart = input.start_date ?? String(existing.start_date).slice(0, 10);
    const nextEnd = input.end_date ?? String(existing.end_date).slice(0, 10);
    if (nextEnd < nextStart) throw new ValidationError('End date must be on or after start date');
    const [record] = await db('driver_availability')
      .where({ id: availabilityId, company_id: companyId, driver_id: driverId })
      .update({
        start_date: nextStart,
        end_date: nextEnd,
        reason: input.reason === undefined ? existing.reason : input.reason?.trim() || null,
        updated_at: db.fn.now(),
      })
      .returning('*');
    return record;
  }

  async delete(companyId: string, driverId: string, availabilityId: string) {
    await this.assertDriver(companyId, driverId);
    const deleted = await db('driver_availability')
      .where({ id: availabilityId, company_id: companyId, driver_id: driverId })
      .delete();
    if (!deleted) throw new NotFoundError('Availability record not found');
    return { id: availabilityId, deleted: true };
  }

  async getTimeline(companyId: string, startDate: string, endDate: string) {
    const drivers = await db('drivers')
      .select('id', 'first_name', 'last_name', 'status')
      .where({ company_id: companyId })
      .orderBy('first_name', 'asc');
    const driverIds = drivers.map((driver: any) => driver.id);
    if (!driverIds.length) return { startDate, endDate, drivers: [], unavailable: [], assignments: [] };

    const unavailable = await db('driver_availability')
      .select('id', 'driver_id', 'start_date', 'end_date', 'reason')
      .where({ company_id: companyId, status: 'UNAVAILABLE' })
      .whereIn('driver_id', driverIds)
      .where('start_date', '<=', endDate)
      .where('end_date', '>=', startDate);

    const assignmentRows = await db('load_assignments as la')
      .join('loads as l', 'l.id', 'la.load_id')
      .join('drivers as d', 'd.id', 'la.driver_id')
      .leftJoin('load_stops as ls', 'ls.load_id', 'l.id')
      .select('la.driver_id', 'la.load_id', 'l.load_number', 'ls.appointment_date')
      .where('l.company_id', companyId)
      .whereIn('la.driver_id', driverIds)
      .where('la.is_active', true)
      .whereIn('l.status', ['pending', 'dispatched', 'in_transit']);
    const assignedDriverIds = new Set((assignmentRows as any[]).map((row) => row.driver_id));
    const driversWithAssignmentStatus = drivers.map((driver: any) => ({
      ...driver,
      status: assignedDriverIds.has(driver.id) ? 'ASSIGNED' : driver.status,
    }));

    const byAssignment = new Map<string, { driver_id: string; load_id: string; load_number: string; dates: string[] }>();
    for (const row of assignmentRows as any[]) {
      const key = `${row.driver_id}:${row.load_id}`;
      const event: { driver_id: string; load_id: string; load_number: string; dates: string[] } = byAssignment.get(key) || {
        driver_id: row.driver_id,
        load_id: row.load_id,
        load_number: row.load_number,
        dates: [],
      };
      if (row.appointment_date) event.dates.push(String(row.appointment_date).slice(0, 10));
      byAssignment.set(key, event);
    }
    const assignments = [...byAssignment.values()]
      .map((event) => ({
        driver_id: event.driver_id,
        load_id: event.load_id,
        load_number: event.load_number,
        start_date: event.dates.sort()[0] || null,
        end_date: event.dates.sort().at(-1) || null,
      }))
      .filter((event) => !event.start_date || (event.start_date <= endDate && event.end_date! >= startDate));

    return { startDate, endDate, drivers: driversWithAssignmentStatus, unavailable, assignments };
  }
}

export const driverAvailabilityService = new DriverAvailabilityService();