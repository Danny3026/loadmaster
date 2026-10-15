import { Request, Response, NextFunction } from 'express';
import { documentService } from '../services/document.service';
import { success } from '../utils/response';
import { NotFoundError, ValidationError } from '../utils/errors';
import db from '../config/database';
import { documentExtractionRepository } from '../repositories/document-extraction.repository';
import uploadMiddleware from '../middleware/upload';
import { extractionService } from '../services/extraction.service';
import { evaluateRateConfirmation } from '../services/rate-confirmation.rules';

export const upload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new ValidationError('No file uploaded');
    if (req.tenantContext && req.user?.role === 'DRIVER') {
          const assignment = await db('load_assignments as la')
            .join('drivers as d', 'd.id', 'la.driver_id')
            .where({ 'la.load_id': req.params.id, 'la.is_active': true, 'd.user_id': req.tenantContext.userId, 'd.company_id': req.tenantContext.companyId })
        .first();
      if (!assignment) throw new ValidationError('You are not assigned to this load');
    }
    const { notes } = req.body;
    const result = await documentService.upload(
      req.tenantContext!.companyId,
      req.params.id || req.body.loadId,
      req.tenantContext!.userId,
      req.file,
      req.body.document_type,
      notes,
      req.user?.role
    );
    res.status(201).json(success(result));
  } catch (err) {
    next(err);
  }
};

export const getByLoad = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const load = await db('loads').where({ id: req.params.id, company_id: req.tenantContext!.companyId }).first('id');
    if (!load) throw new NotFoundError('Load not found');
    if (req.tenantContext && req.user?.role === 'DRIVER') {
      const assignment = await db('load_assignments as la')
        .join('drivers as d', 'd.id', 'la.driver_id')
        .where({ 'la.load_id': req.params.id, 'la.is_active': true, 'd.user_id': req.tenantContext.userId, 'd.company_id': req.tenantContext.companyId })
        .first();
      if (!assignment) throw new ValidationError('You are not assigned to this load');
    }
    const result = await documentService.getByLoad(req.tenantContext!.companyId, req.params.id);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await documentService.getAll(req.tenantContext!.companyId);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db('documents').where({ id: req.params.id, company_id: req.tenantContext!.companyId }).first();
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const download = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const document = await db('documents')
      .where({ id: req.params.id, company_id: req.tenantContext!.companyId })
      .first('id', 'load_id');
    if (!document) throw new NotFoundError('Document not found');

    if (req.user?.role === 'DRIVER') {
      const assignment = await db('load_assignments as la')
        .join('drivers as d', 'd.id', 'la.driver_id')
        .where({
          'la.load_id': document.load_id,
          'la.is_active': true,
          'd.user_id': req.tenantContext!.userId,
          'd.company_id': req.tenantContext!.companyId,
        })
        .first('la.id');
      if (!assignment) throw new NotFoundError('Document not found');
    }

    const doc = await documentService.download(req.tenantContext!.companyId, req.params.id);
    res.setHeader('Content-Disposition', `attachment; filename="${doc.filename}"`);
    (doc.stream as any).pipe(res);
  } catch (err) {
    next(err);
  }
};

export const deleteDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await documentService.delete(req.tenantContext!.companyId, req.params.id);
    res.json(success(null));
  } catch (err) {
    next(err);
  }
};

export const getExtractions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const document = await db('documents')
      .where({ id: req.params.id, company_id: req.tenantContext!.companyId })
      .first();
    if (!document) throw new ValidationError('Document not found');
    const result = await documentExtractionRepository.findByDocument(req.params.id);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const verifyExtraction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const document = await db('documents')
      .where({ id: req.params.id, company_id: req.tenantContext!.companyId })
      .first();
    if (!document) throw new ValidationError('Document not found');
    const result = await documentExtractionRepository.verify(
      req.body.extractionId,
      document.id,
      req.body.verifiedValue,
      req.tenantContext!.userId
    );
    if (!result) throw new NotFoundError('Extraction not found');
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const extractBatch = (req: Request, res: Response): void => {
  uploadMiddleware.array('files', 20)(req, res, async (error: any) => {
    if (error) {
      res.status(400).json({ success: false, error: { message: error.message || 'Batch upload failed' } });
      return;
    }
    const files = (req.files || []) as Express.Multer.File[];
    if (files.length === 0) {
      res.status(400).json({ success: false, error: { message: 'No files uploaded' } });
      return;
    }
    const results = await Promise.all(files.map(async (file) => {
      try {
        const extraction = await extractionService.extractStructured(file.buffer, file.mimetype);
        return {
          file_name: file.originalname,
          ...extraction,
          business_rules: extraction.document_type === 'RATE_CONFIRMATION' ? evaluateRateConfirmation(extraction.fields) : null,
          needs_review: Object.values(extraction.fields as Record<string, { confidence: number }>).some((field) => Number(field.confidence) < 0.85),
        };
      } catch (cause) {
        return { file_name: file.originalname, error: cause instanceof Error ? cause.message : 'Extraction failed', needs_review: true };
      }
    }));
    res.status(200).json(success(results));
  });
};
