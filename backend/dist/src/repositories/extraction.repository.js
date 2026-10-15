import db from '../config/database';
export class ExtractionRepository {
    async createBatch(documentId, extractions) {
        const data = extractions.map(e => ({
            ...e,
            document_id: documentId
        }));
        if (data.length > 0) {
            await db('document_extractions').insert(data);
        }
    }
    async findByDocumentId(documentId) {
        return db('document_extractions').where({ document_id: documentId });
    }
    async verifyFields(documentId, verifications, userId) {
        return db.transaction(async (trx) => {
            for (const v of verifications) {
                const existing = await trx('document_extractions')
                    .where({ document_id: documentId, field_name: v.field_name })
                    .first();
                if (existing) {
                    await trx('document_extractions')
                        .where({ id: existing.id })
                        .update({
                        verified_value: v.verified_value,
                        verified_by: userId,
                        verified_at: db.fn.now()
                    });
                }
                else {
                    await trx('document_extractions').insert({
                        document_id: documentId,
                        field_name: v.field_name,
                        verified_value: v.verified_value,
                        verified_by: userId,
                        verified_at: db.fn.now()
                    });
                }
            }
            await trx('documents').where({ id: documentId }).update({ status: 'VERIFIED' });
        });
    }
}
export const extractionRepository = new ExtractionRepository();
