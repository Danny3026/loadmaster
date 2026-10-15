import { Request, Response, NextFunction } from 'express';
import { reportService } from '../services/report.service';
import { success } from '../utils/response';

export const getLoadsReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await reportService.getLoadReport(req.tenantContext!.companyId, req.query as any);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const getRevenueReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await reportService.getRevenueReport(req.tenantContext!.companyId, req.query as any);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const getDriversReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await reportService.getDriverReport(req.tenantContext!.companyId, req.query as any);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const getMissingDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await reportService.getMissingDocumentsReport(req.tenantContext!.companyId);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};
