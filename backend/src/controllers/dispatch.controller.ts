import { Request, Response, NextFunction } from 'express';
import { dispatchService } from '../services/dispatch.service';
import { success } from '../utils/response';

export const assign = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { driver_id, truck_id, dispatch, override_availability_conflict } = req.body;
    const result = await dispatchService.assignLoad(
      req.tenantContext!.companyId,
      req.params.id,
      driver_id,
      truck_id,
      req.tenantContext!.userId,
      dispatch === true,
      override_availability_conflict === true
    );
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const dispatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await dispatchService.dispatchLoad(req.tenantContext!.companyId, req.params.id, req.tenantContext!.userId);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const unassign = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await dispatchService.unassignLoad(req.tenantContext!.companyId, req.params.id, req.tenantContext!.userId);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, notes, location } = req.body;
    const result = await dispatchService.updateLoadStatus(req.tenantContext!.companyId, req.params.id, status, req.tenantContext!.userId, notes, location);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};
