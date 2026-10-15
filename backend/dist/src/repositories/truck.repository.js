import db from '../config/database';
export class TruckRepository {
    async findAll(companyId, pagination = { limit: 10, offset: 0 }) {
        return db('trucks')
            .where({ company_id: companyId })
            .limit(pagination.limit)
            .offset(pagination.offset)
            .orderBy('unit_number', 'asc');
    }
    async count(companyId) {
        const [{ count }] = await db('trucks')
            .where({ company_id: companyId })
            .count('id');
        return parseInt(count);
    }
    async findById(companyId, id) {
        return db('trucks')
            .where({ id, company_id: companyId })
            .first();
    }
    async findByUnitNumber(companyId, unitNumber) {
        return db('trucks')
            .where({ unit_number: unitNumber, company_id: companyId })
            .first();
    }
    async create(companyId, data) {
        const [truck] = await db('trucks')
            .insert({ ...data, company_id: companyId })
            .returning('*');
        return truck;
    }
    async update(companyId, id, data) {
        const [truck] = await db('trucks')
            .where({ id, company_id: companyId })
            .update({ ...data, updated_at: db.fn.now() })
            .returning('*');
        return truck;
    }
    async delete(companyId, id) {
        return db('trucks')
            .where({ id, company_id: companyId })
            .delete();
    }
}
export const truckRepository = new TruckRepository();
