import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { success } from '../utils/response';

export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, driverId } = req.query;
    const filters = {
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      driverId: driverId ? String(driverId) : undefined
    };

    const result = await dashboardService.getMetrics(req.tenantContext!.companyId, filters);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
};
