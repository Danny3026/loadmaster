import { loadService } from '../services/load.service';
import { success, paginated } from '../utils/response';
export const getAll = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;
        const pagination = { limit, offset };
        const result = await loadService.getAll(req.tenantContext.companyId, req.query, pagination, req.user?.role === 'DRIVER' ? req.tenantContext.userId : undefined);
        res.json(paginated({ data: result.data, meta: { total: result.total, page, limit, totalPages: Math.ceil(result.total / limit) } }));
    }
    catch (err) {
        next(err);
    }
};
export const getById = async (req, res, next) => {
    try {
        const result = await loadService.getById(req.tenantContext.companyId, req.params.id, req.user?.role === 'DRIVER' ? req.tenantContext.userId : undefined);
        res.json(success(result));
    }
    catch (err) {
        next(err);
    }
};
export const create = async (req, res, next) => {
    try {
        const result = await loadService.create(req.tenantContext.companyId, req.tenantContext.userId, req.body);
        res.status(201).json(success(result));
    }
    catch (err) {
        next(err);
    }
};
export const update = async (req, res, next) => {
    try {
        const result = await loadService.update(req.tenantContext.companyId, req.params.id, req.body, req.tenantContext.userId);
        res.json(success(result));
    }
    catch (err) {
        next(err);
    }
};
export const deleteLoad = async (req, res, next) => {
    try {
        await loadService.delete(req.tenantContext.companyId, req.params.id);
        res.json(success(null));
    }
    catch (err) {
        next(err);
    }
};
export const getStatusHistory = async (req, res, next) => {
    try {
        const result = await loadService.getStatusHistory(req.tenantContext.companyId, req.params.id, req.user?.role === 'DRIVER' ? req.tenantContext.userId : undefined);
        res.json(success(result));
    }
    catch (err) {
        next(err);
    }
};
export const archive = async (req, res, next) => {
    try {
        const result = await loadService.archive(req.tenantContext.companyId, req.params.id, req.tenantContext.userId);
        res.json(success(result));
    }
    catch (err) {
        next(err);
    }
};
export const restore = async (req, res, next) => {
    try {
        const result = await loadService.restore(req.tenantContext.companyId, req.params.id, req.tenantContext.userId);
        res.json(success(result));
    }
    catch (err) {
        next(err);
    }
};
