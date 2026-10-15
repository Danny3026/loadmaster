import db from '../config/database';
import { LoadAssignment } from '../types';

export class AssignmentRepository {
  async create(data: Partial<LoadAssignment>): Promise<LoadAssignment> {
    const [assignment] = await db('load_assignments').insert(data).returning('*');
    return assignment;
  }

  async findActiveByLoadId(loadId: string): Promise<LoadAssignment | undefined> {
    return db('load_assignments')
      .where({ load_id: loadId })
      .andWhereNot('status', 'UNASSIGNED')
      .first();
  }

  async deactivate(loadId: string): Promise<void> {
    await db('load_assignments')
      .where({ load_id: loadId })
      .andWhereNot('status', 'UNASSIGNED')
      .update({
        status: 'UNASSIGNED',
        unassigned_at: db.fn.now()
      });
  }

  async findByDriverId(driverId: string): Promise<LoadAssignment[]> {
    return db('load_assignments')
      .where({ driver_id: driverId })
      .andWhereNot('status', 'UNASSIGNED');
  }

  async dispatch(id: string): Promise<void> {
    await db('load_assignments')
      .where({ id })
      .update({
        status: 'DISPATCHED',
        dispatched_at: db.fn.now()
      });
  }
}

export const assignmentRepository = new AssignmentRepository();
