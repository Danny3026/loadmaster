import db from '../config/database';

export class TruckRepository {
  async findAll(companyId: string, pagination: any = { limit: 10, offset: 0 }) {
    return db('trucks')
      .where({ company_id: companyId })
      .limit(pagination.limit)
      .offset(pagination.offset)
      .orderBy('unit_number', 'asc');
  }

  async count(companyId: string) {
    const [{ count }] = await db('trucks')
      .where({ company_id: companyId })
      .count('id');
    return parseInt(count as string);
  }

  async findById(companyId: string, id: string) {
    return db('trucks')
      .where({ id, company_id: companyId })
      .first();
  }

  async findByUnitNumber(companyId: string, unitNumber: string) {
    return db('trucks')
      .where({ unit_number: unitNumber, company_id: companyId })
      .first();
  }

  async create(companyId: string, data: any) {
    const [truck] = await db('trucks')
      .insert({ ...data, company_id: companyId })
      .returning('*');
    return truck;
  }

  async update(companyId: string, id: string, data: any) {
    const [truck] = await db('trucks')
      .where({ id, company_id: companyId })
      .update({ ...data, updated_at: db.fn.now() })
      .returning('*');
    return truck;
  }

  async delete(companyId: string, id: string) {
    return db('trucks')
      .where({ id, company_id: companyId })
      .delete();
  }
}

export const truckRepository = new TruckRepository();
