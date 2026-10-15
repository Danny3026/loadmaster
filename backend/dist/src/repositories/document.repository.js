import db from '../config/database';
export class DocumentRepository {
    async findAll(companyId, pagination = { limit: 10, offset: 0 }) {
        return db('documents')
            .where({ company_id: companyId })
            .orderBy('created_at', 'desc')
            .limit(pagination.limit)
            .offset(pagination.offset);
    }
    async findByLoad(companyId, loadId) {
        return db('documents')
            .where({ load_id: loadId, company_id: companyId })
            .orderBy('created_at', 'desc');
    }
    async findById(companyId, id) {
        return db('documents')
            .where({ id, company_id: companyId })
            .first();
    }
    async create(data, executor = db) {
        const [doc] = await executor('documents').insert(data).returning('*');
        return doc;
    }
    async delete(companyId, id) {
        return db('documents').where({ id, company_id: companyId }).delete();
    }
    async countByLoadAndType(companyId, loadId, type) {
        const [{ count }] = await db('documents')
            .where({ load_id: loadId, company_id: companyId, document_type: type })
            .count('id');
        return parseInt(count);
    }
    async findMissingDocuments(companyId, filters = {}) {
        let query = db('loads as l')
            .where('l.company_id', companyId)
            .leftJoin('documents as d', 'l.id', 'd.load_id')
            .whereNull('d.id')
            .select('l.*');
        if (filters.status) {
            query = query.where('l.status', filters.status);
        }
        return query;
    }
}
export const documentRepository = new DocumentRepository();
