import db from '../config/database';
import { DocumentExtraction } from '../types';

export class ExtractionRepository {
  async createBatch(documentId: string, extractions: any[]): Promise<void> {
    const data = extractions.map(e => ({
      ...e,
      document_id: documentId
    }));
    if (data.length > 0) {
      await db('document_extractions').insert(data);
    }
  }

  async findByDocumentId(documentId: string): Promise<DocumentExtraction[]> {
    return db('document_extractions').where({ document_id: documentId });
  }

  async verifyFields(documentId: string, verifications: { field_name: string; verified_value: string }[], userId: string): Promise<void> {
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
        } else {
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
