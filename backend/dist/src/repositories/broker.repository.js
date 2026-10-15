import db from '../config/database';
export class BrokerRepository {
    async findAll(companyId, pagination = { limit: 10, offset: 0 }) {
        return db('brokers')
            .where({ company_id: companyId })
            .limit(pagination.limit)
            .offset(pagination.offset)
            .orderBy('name', 'asc');
    }
    async count(companyId) {
        const [{ count }] = await db('brokers')
            .where({ company_id: companyId })
            .count('id');
        return parseInt(count);
    }
    async findById(companyId, id) {
        return db('brokers')
            .where({ id, company_id: companyId })
            .first();
    }
    async create(companyId, data) {
        const [broker] = await db('brokers')
            .insert({ ...data, company_id: companyId })
            .returning('*');
        return broker;
    }
    async update(companyId, id, data) {
        const [broker] = await db('brokers')
            .where({ id, company_id: companyId })
            .update({ ...data, updated_at: db.fn.now() })
            .returning('*');
        return broker;
    }
    async delete(companyId, id) {
        return db('brokers')
            .where({ id, company_id: companyId })
            .delete();
    }
}
export const brokerRepository = new BrokerRepository();
