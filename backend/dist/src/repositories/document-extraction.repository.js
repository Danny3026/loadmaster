import db from '../config/database';
export class DocumentExtractionRepository {
    async createMany(documentId, fields) {
        const dataToInsert = fields.map(f => ({
            ...f,
            document_id: documentId
        }));
        return db('document_extractions').insert(dataToInsert).returning('*');
    }
    async findByDocument(documentId) {
        return db('document_extractions')
            .where({ document_id: documentId })
            .orderBy('created_at', 'asc');
    }
    async verify(id, documentId, verifiedValue, verifiedBy) {
        const [extraction] = await db('document_extractions')
            .where({ id, document_id: documentId })
            .update({
            verified_value: verifiedValue,
            verified_by: verifiedBy,
            verified_at: db.fn.now()
        })
            .returning('*');
        return extraction;
    }
}
export const documentExtractionRepository = new DocumentExtractionRepository();
