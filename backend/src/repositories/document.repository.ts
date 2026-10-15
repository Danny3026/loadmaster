import db from '../config/database';
import { Knex } from 'knex';

type DocumentExecutor = Knex | Knex.Transaction;

export class DocumentRepository {
  async findAll(companyId: string, pagination: any = { limit: 10, offset: 0 }) {
    return db('documents')
      .where({ company_id: companyId })
      .orderBy('created_at', 'desc')
      .limit(pagination.limit)
      .offset(pagination.offset);
  }

  async findByLoad(companyId: string, loadId: string) {
    return db('documents')
      .where({ load_id: loadId, company_id: companyId })
      .orderBy('created_at', 'desc');
  }

  async findById(companyId: string, id: string) {
    return db('documents')
      .where({ id, company_id: companyId })
      .first();
  }

  async create(data: any, executor: DocumentExecutor = db) {
    const [doc] = await executor('documents').insert(data).returning('*');
    return doc;
  }

  async delete(companyId: string, id: string) {
    return db('documents').where({ id, company_id: companyId }).delete();
  }

  async countByLoadAndType(companyId: string, loadId: string, type: string) {
    const [{ count }] = await db('documents')
      .where({ load_id: loadId, company_id: companyId, document_type: type })
      .count('id');
    return parseInt(count as string);
  }

  async findMissingDocuments(companyId: string, filters: any = {}) {
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
