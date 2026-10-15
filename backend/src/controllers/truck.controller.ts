import { Request, Response, NextFunction } from 'express';
import { truckService } from '../services/truck.service';
import { success, paginated } from '../utils/response';

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = {
      limit: parseInt(req.query.limit as string) || 10,
      offset: parseInt(req.query.offset as string) || 0,
    };
    const result = await truckService.getAll(req.tenantContext!.companyId, pagination);
    res.json(paginated({ data: result.data, meta: { total: result.total, page: Math.floor(pagination.offset / pagination.limit) + 1, limit: pagination.limit, totalPages: Math.ceil(result.total / pagination.limit) } }));
  } catch (err) {
    next(err);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await truckService.getById(req.tenantContext!.companyId, req.params.id);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await truckService.create(req.tenantContext!.companyId, req.body);
    res.status(201).json(success(result));
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await truckService.update(req.tenantContext!.companyId, req.params.id, req.body);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const deleteTruck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await truckService.delete(req.tenantContext!.companyId, req.params.id);
    res.json(success(null));
  } catch (err) {
    next(err);
  }
};
