import db from '../config/database';

export class DriverRepository {
  private availabilityStatusSelection() {
    return db.raw(`CASE
      WHEN EXISTS (
        SELECT 1
        FROM load_assignments AS active_assignment
        INNER JOIN loads AS active_load ON active_load.id = active_assignment.load_id
        WHERE active_assignment.driver_id = drivers.id
          AND active_assignment.is_active = true
          AND active_load.status IN ('pending', 'dispatched', 'in_transit')
      ) THEN 'ASSIGNED'
      ELSE drivers.status
    END AS status`);
  }

  async findAll(companyId?: string, pagination: any = { limit: 10, offset: 0 }) {
    const query = db('drivers')
      .leftJoin('trucks', function () {
        this.on('trucks.id', 'drivers.truck_id').andOn('trucks.company_id', 'drivers.company_id');
      })
      .select('drivers.*', 'trucks.unit_number as truck_unit_number')
      .select(this.availabilityStatusSelection());

    if (companyId) query.where('drivers.company_id', companyId);

    return query
      .limit(pagination.limit)
      .offset(pagination.offset)
      .orderBy('created_at', 'desc');
  }

  async count(companyId?: string) {
    const query = db('drivers');

    if (companyId) query.where('drivers.company_id', companyId);

    const [{ count }] = await query.count('id');
    return parseInt(count as string);
  }

  async findById(companyId: string | undefined, id: string) {
    const query = db('drivers')
      .leftJoin('trucks', function () {
        this.on('trucks.id', 'drivers.truck_id').andOn('trucks.company_id', 'drivers.company_id');
      })
      .select('drivers.*', 'trucks.unit_number as truck_unit_number')
      .select(this.availabilityStatusSelection())
      .where({ 'drivers.id': id });

    if (companyId) query.where('drivers.company_id', companyId);

    return query.first();
  }

  async create(companyId: string | null, data: any) {
    const [driver] = await db('drivers')
      .insert({ ...data, company_id: companyId })
      .returning('*');
    return driver;
  }

  async update(companyId: string | undefined, id: string, data: any) {
    const query = db('drivers').where({ id });

    if (companyId) query.where('drivers.company_id', companyId);

    const [driver] = await query.update({ ...data, updated_at: db.fn.now() }).returning('*');
    return driver;
  }

  async delete(companyId: string | undefined, id: string) {
    const query = db('drivers').where({ id });

    if (companyId) query.where('drivers.company_id', companyId);

    return query.delete();
  }

  async findByUserId(companyId: string | undefined, userId: string) {
    const query = db('drivers').where({ user_id: userId });

    if (companyId) query.where('drivers.company_id', companyId);

    return query.first();
  }
}

export const driverRepository = new DriverRepository();
