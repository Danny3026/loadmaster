import { userService } from '../services/user.service';
import { success, paginated } from '../utils/response';
export const getAll = async (req, res, next) => {
    try {
        const pagination = {
            limit: parseInt(req.query.limit) || 10,
            offset: parseInt(req.query.offset) || 0,
        };
        const result = await userService.getAll(req.tenantContext.companyId, pagination);
        res.json(paginated({ data: result.data, meta: { total: result.total, page: Math.floor(pagination.offset / pagination.limit) + 1, limit: pagination.limit, totalPages: Math.ceil(result.total / pagination.limit) } }));
    }
    catch (err) {
        next(err);
    }
};
export const getById = async (req, res, next) => {
    try {
        const result = await userService.getById(req.tenantContext.companyId, req.params.id);
        res.json(success(result));
    }
    catch (err) {
        next(err);
    }
};
export const create = async (req, res, next) => {
    try {
        const result = await userService.create(req.tenantContext.companyId, req.body);
        res.status(201).json(success(result));
    }
    catch (err) {
        next(err);
    }
};
export const update = async (req, res, next) => {
    try {
        const result = await userService.update(req.tenantContext.companyId, req.params.id, req.body);
        res.json(success(result));
    }
    catch (err) {
        next(err);
    }
};
export const deleteUser = async (req, res, next) => {
    try {
        await userService.delete(req.tenantContext.companyId, req.params.id);
        res.json(success(null));
    }
    catch (err) {
        next(err);
    }
};
