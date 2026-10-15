import { reportService } from '../services/report.service';
import { success } from '../utils/response';
export const getLoadsReport = async (req, res, next) => {
    try {
        const result = await reportService.getLoadReport(req.tenantContext.companyId, req.query);
        res.json(success(result));
    }
    catch (err) {
        next(err);
    }
};
export const getRevenueReport = async (req, res, next) => {
    try {
        const result = await reportService.getRevenueReport(req.tenantContext.companyId, req.query);
        res.json(success(result));
    }
    catch (err) {
        next(err);
    }
};
export const getDriversReport = async (req, res, next) => {
    try {
        const result = await reportService.getDriverReport(req.tenantContext.companyId, req.query);
        res.json(success(result));
    }
    catch (err) {
        next(err);
    }
};
export const getMissingDocuments = async (req, res, next) => {
    try {
        const result = await reportService.getMissingDocumentsReport(req.tenantContext.companyId);
        res.json(success(result));
    }
    catch (err) {
        next(err);
    }
};
