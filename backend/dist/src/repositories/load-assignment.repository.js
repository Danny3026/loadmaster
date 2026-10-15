import db from '../config/database';
export class LoadAssignmentRepository {
    async findActiveByLoad(loadId, companyId) {
        return db('load_assignments')
            .select('load_assignments.*', 'drivers.first_name', 'drivers.last_name', 'trucks.unit_number')
            .leftJoin('loads', 'load_assignments.load_id', 'loads.id')
            .leftJoin('drivers', function () {
            this.on('load_assignments.driver_id', 'drivers.id').andOn('drivers.company_id', 'loads.company_id');
        })
            .leftJoin('trucks', function () {
            this.on('load_assignments.truck_id', 'trucks.id').andOn('trucks.company_id', 'loads.company_id');
        })
            .where({ 'load_assignments.load_id': loadId, 'load_assignments.is_active': true })
            .andWhere('loads.company_id', companyId)
            .first();
    }
    async create(data) {
        const [assignment] = await db('load_assignments').insert(data).returning('*');
        return assignment;
    }
    async deactivate(assignmentId) {
        return db('load_assignments')
            .where({ id: assignmentId })
            .update({ is_active: false, unassigned_at: db.fn.now() });
    }
    async findHistoryByLoad(loadId, companyId) {
        return db('load_assignments as la')
            .join('loads as l', 'l.id', 'la.load_id')
            .join('drivers as d', function () {
            this.on('d.id', 'la.driver_id').andOn('d.company_id', 'l.company_id');
        })
            .where({ 'la.load_id': loadId, 'l.company_id': companyId })
            .orderBy('la.created_at', 'desc');
    }
}
export const loadAssignmentRepository = new LoadAssignmentRepository();
