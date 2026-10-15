import { Request, Response, NextFunction } from 'express';
import { driverService } from '../services/driver.service';
import { success, paginated } from '../utils/response';
import { extractionService } from '../services/extraction.service';
import documentExtractionUpload from '../middleware/documentExtractionUpload';
import { driverAvailabilityService } from '../services/driver-availability.service';

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = {
      limit: parseInt(req.query.limit as string) || 10,
      offset: parseInt(req.query.offset as string) || 0,
    };
    const result = await driverService.getAll(req.tenantContext!.companyId, pagination);
    res.json(paginated({ data: result.data, meta: { total: result.total, page: Math.floor(pagination.offset / pagination.limit) + 1, limit: pagination.limit, totalPages: Math.ceil(result.total / pagination.limit) } }));
  } catch (err) {
    next(err);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await driverService.getById(req.tenantContext!.companyId, req.params.id);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driver = await driverService.getByUserId(req.tenantContext!.companyId, req.tenantContext!.userId);
    res.json(success(driver));
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await driverService.create(req.tenantContext!.companyId, req.body);
    res.status(201).json(success(result));
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await driverService.update(req.tenantContext!.companyId, req.params.id, req.body);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const extractCdl = async (req: Request, res: Response, next: NextFunction) => {
  documentExtractionUpload(req, res, async (uploadError) => {
    if (uploadError) {
      res.status(400).json({ success: false, error: { message: uploadError.message || 'CDL upload failed' } });
      return;
    }
    if (!req.file) {
      res.status(400).json({ success: false, error: { message: 'No CDL document uploaded' } });
      return;
    }

    try {
      await driverService.getById(req.tenantContext!.companyId, req.params.id);
      const fields = await extractionService.extractCdl(Buffer.from(req.file.buffer), req.file.mimetype);
      res.json(success({ fields }));
    } catch (err) {
      next(err);
    }
  });
};

export const getAvailabilityTimeline = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await driverAvailabilityService.getTimeline(
      req.tenantContext!.companyId,
      req.query.start_date as string,
      req.query.end_date as string
    );
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const getAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(success(await driverAvailabilityService.list(req.tenantContext!.companyId, req.params.id)));
  } catch (err) {
    next(err);
  }
};

export const createAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(success(await driverAvailabilityService.create(req.tenantContext!.companyId, req.params.id, req.body)));
  } catch (err) {
    next(err);
  }
};

export const updateAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(success(await driverAvailabilityService.update(req.tenantContext!.companyId, req.params.id, req.params.availabilityId, req.body)));
  } catch (err) {
    next(err);
  }
};

export const deleteAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(success(await driverAvailabilityService.delete(req.tenantContext!.companyId, req.params.id, req.params.availabilityId)));
  } catch (err) {
    next(err);
  }
};

export const deleteDriver = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await driverService.delete(req.tenantContext!.companyId, req.params.id);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const resetPortalPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await driverService.resetPortalPassword(req.tenantContext!.companyId, req.params.id);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};
