import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import { documentRepository } from '../repositories/document.repository';
import { documentExtractionRepository } from '../repositories/document-extraction.repository';
import { extractionService } from './extraction.service';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { notificationService } from './notification.service';
import db from '../config/database';

export class DocumentService {
  async upload(companyId: string, loadId: string, userId: string, file: Express.Multer.File, documentType: string, notes?: string, actorRole?: string) {
    const load = await db('loads').where({ id: loadId, company_id: companyId }).first('id');
    if (!load) throw new NotFoundError('Load not found');

    const fileId = uuidv4();
    const ext = path.extname(file.originalname);
    const storageDir = path.resolve(process.cwd(), env.STORAGE_LOCAL_PATH, companyId, loadId);
    const storageKey = path.join(storageDir, `${fileId}${ext}`);
    
    await fs.promises.mkdir(storageDir, { recursive: true });
    await fs.promises.writeFile(storageKey, file.buffer);

    const normalizedDocumentType = documentType.toUpperCase();
    const isOperationalDocument = ['POD', 'BOL', 'DELIVERY_RECEIPT', 'LUMPER_RECEIPT'].includes(normalizedDocumentType);
    const fileLabel = normalizedDocumentType === 'POD' || normalizedDocumentType === 'BOL'
      ? normalizedDocumentType
      : normalizedDocumentType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
    let document;
    try {
      document = await db.transaction(async (trx) => {
        const created = await documentRepository.create({
          company_id: companyId,
          load_id: loadId,
          uploaded_by: userId,
          document_type: documentType,
          original_filename: file.originalname,
          storage_key: storageKey,
          mime_type: file.mimetype,
          file_size: file.size,
          notes: notes || null
        }, trx);

        if (actorRole === 'DRIVER') {
          await notificationService.notifyCompanyRoles(companyId, ['ADMIN', 'DISPATCHER'], {
            type: 'DOCUMENT_UPLOADED',
            title: `${fileLabel} received`,
            message: `A driver uploaded ${fileLabel} for load ${loadId}.`,
            loadId,
            relatedEntityType: 'LOAD',
            relatedEntityId: loadId,
            priority: isOperationalDocument ? 'HIGH' : 'NORMAL',
          }, trx);
        } else if (isOperationalDocument) {
          await notificationService.notifyLoadDriver(companyId, loadId, {
            type: 'LOAD_DOCUMENT_RECEIVED',
            title: `${fileLabel} available`,
            message: `${fileLabel} was added to your assigned load.`,
            relatedEntityType: 'LOAD',
            relatedEntityId: loadId,
            priority: 'NORMAL',
          }, trx);
        }

        return created;
      });
    } catch (error) {
      try {
        await fs.promises.unlink(storageKey);
      } catch (cleanupError) {
        logger.error('Failed to clean up document file after database transaction failed', cleanupError);
      }
      throw error;
    }

    if (documentType === 'RATE_CONFIRMATION' && (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/'))) {
      try {
        const extractions = await extractionService.extract(file.buffer, file.mimetype);
        if (extractions.length > 0) {
          await documentExtractionRepository.createMany(document.id, extractions);
        }
      } catch (err) {
        logger.error('Document extraction failed', err);
      }
    }

    return document;
  }

  async getByLoad(companyId: string, loadId: string) {
    return documentRepository.findByLoad(companyId, loadId);
  }

  async getAll(companyId: string) {
    return documentRepository.findAll(companyId);
  }

  async download(companyId: string, id: string) {
    const document = await documentRepository.findById(companyId, id);
    if (!document) throw new NotFoundError('Document not found');

    if (!fs.existsSync(document.storage_key)) {
      throw new NotFoundError('File not found on storage');
    }

    const stream = fs.createReadStream(document.storage_key);
    return { stream, filename: document.original_filename, mimeType: document.mime_type };
  }

  async delete(companyId: string, id: string) {
    const document = await documentRepository.findById(companyId, id);
    if (!document) throw new NotFoundError('Document not found');

    try {
      if (fs.existsSync(document.storage_key)) {
        await fs.promises.unlink(document.storage_key);
      }
    } catch (e) {
      // Ignore FS errors
    }
    
    await documentRepository.delete(companyId, id);
    return true;
  }
}

export const documentService = new DocumentService();
