import db from '../config/database';

export class BrokerRepository {
  async findAll(companyId: string, pagination: any = { limit: 10, offset: 0 }) {
    return db('brokers')
      .where({ company_id: companyId })
      .limit(pagination.limit)
      .offset(pagination.offset)
      .orderBy('name', 'asc');
  }

  async count(companyId: string) {
    const [{ count }] = await db('brokers')
      .where({ company_id: companyId })
      .count('id');
    return parseInt(count as string);
  }

  async findById(companyId: string, id: string) {
    return db('brokers')
      .where({ id, company_id: companyId })
      .first();
  }

  async create(companyId: string, data: any) {
    const [broker] = await db('brokers')
      .insert({ ...data, company_id: companyId })
      .returning('*');
    return broker;
  }

  async update(companyId: string, id: string, data: any) {
    const [broker] = await db('brokers')
      .where({ id, company_id: companyId })
      .update({ ...data, updated_at: db.fn.now() })
      .returning('*');
    return broker;
  }

  async delete(companyId: string, id: string) {
    return db('brokers')
      .where({ id, company_id: companyId })
      .delete();
  }
}

export const brokerRepository = new BrokerRepository();
