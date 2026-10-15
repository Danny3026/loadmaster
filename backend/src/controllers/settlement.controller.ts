import { Request, Response, NextFunction } from 'express';
import { settlementService } from '../services/settlement.service';
import { driverService } from '../services/driver.service';
import { success, paginated } from '../utils/response';

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role === 'DRIVER') {
      const driver = await driverService.getByUserId(req.tenantContext!.companyId, req.tenantContext!.userId);
      const result = await settlementService.getForDriver(req.tenantContext!.companyId, driver.id);
      return res.json(paginated({ data: result, meta: { total: result.length, page: 1, limit: result.length, totalPages: 1 } }));
    }
    const filters = {
      search: req.query.search as string,
      status: req.query.status as string,
      driver_id: req.query.driver_id as string,
    };

    const result = await settlementService.getAll(req.tenantContext!.companyId, filters);
    return res.json(paginated({ data: result, meta: { total: result.length, page: 1, limit: result.length, totalPages: 1 } }));
  } catch (err) {
    next(err);
  }
};

export const getMine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driver = await driverService.getByUserId(req.tenantContext!.companyId, req.tenantContext!.userId);
    const result = await settlementService.getForDriver(req.tenantContext!.companyId, driver.id);
    res.json(paginated({ data: result, meta: { total: result.length, page: 1, limit: result.length, totalPages: 1 } }));
  } catch (err) {
    next(err);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role === 'DRIVER') {
      const driver = await driverService.getByUserId(req.tenantContext!.companyId, req.tenantContext!.userId);
      const result = await settlementService.getForDriver(req.tenantContext!.companyId, driver.id, req.params.id);
      return res.json(success(result[0]));
    }
    const result = await settlementService.getById(req.tenantContext!.companyId, req.params.id);
    return res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const reconcile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { driverId, startDate, endDate } = req.query as any;
    const result = await settlementService.reconcileLoads(req.tenantContext!.companyId, driverId, startDate, endDate);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await settlementService.create(req.tenantContext!.companyId, req.tenantContext!.userId, req.body);
    res.status(201).json(success(result));
  } catch (err) {
    next(err);
  }
};

export const getRecurringDeductions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await settlementService.getRecurringDeductions(req.tenantContext!.companyId);
    res.json(paginated({ data: result, meta: { total: result.length, page: 1, limit: result.length, totalPages: 1 } }));
  } catch (err) {
    next(err);
  }
};

export const createRecurringDeduction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await settlementService.createRecurringDeduction(req.tenantContext!.companyId, req.body);
    res.status(201).json(success(result));
  } catch (err) {
    next(err);
  }
};

export const updateRecurringDeduction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await settlementService.updateRecurringDeduction(req.tenantContext!.companyId, req.params.id, req.body);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const deleteRecurringDeduction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await settlementService.deleteRecurringDeduction(req.tenantContext!.companyId, req.params.id);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const getAdjustments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await settlementService.getAdjustments(req.tenantContext!.companyId, req.params.id);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const addAdjustment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await settlementService.addAdjustment(req.tenantContext!.companyId, req.tenantContext!.userId, req.params.id, req.body);
    res.status(201).json(success(result));
  } catch (err) {
    next(err);
  }
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await settlementService.updateStatus(req.tenantContext!.companyId, req.tenantContext!.userId, req.params.id, req.body.status);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const markPaid = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await settlementService.markPaid(req.tenantContext!.companyId, req.tenantContext!.userId, req.params.id);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};
