import db from '../config/database';
export class AssignmentRepository {
    async create(data) {
        const [assignment] = await db('load_assignments').insert(data).returning('*');
        return assignment;
    }
    async findActiveByLoadId(loadId) {
        return db('load_assignments')
            .where({ load_id: loadId })
            .andWhereNot('status', 'UNASSIGNED')
            .first();
    }
    async deactivate(loadId) {
        await db('load_assignments')
            .where({ load_id: loadId })
            .andWhereNot('status', 'UNASSIGNED')
            .update({
            status: 'UNASSIGNED',
            unassigned_at: db.fn.now()
        });
    }
    async findByDriverId(driverId) {
        return db('load_assignments')
            .where({ driver_id: driverId })
            .andWhereNot('status', 'UNASSIGNED');
    }
    async dispatch(id) {
        await db('load_assignments')
            .where({ id })
            .update({
            status: 'DISPATCHED',
            dispatched_at: db.fn.now()
        });
    }
}
export const assignmentRepository = new AssignmentRepository();
