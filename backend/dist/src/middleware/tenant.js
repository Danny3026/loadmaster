import { UnauthorizedError } from '../utils/errors';
import db from '../config/database';
export const requireTenant = async (req, res, next) => {
    if (!req.user || !req.user.companyId || !req.user.userId || !req.user.role) {
        return next(new UnauthorizedError('Tenant context missing from token'));
    }
    const currentUser = await db('users')
        .join('roles', 'roles.id', 'users.role_id')
        .join('companies', 'companies.id', 'users.company_id')
        .where({ 'users.id': req.user.userId, 'users.company_id': req.user.companyId })
        .first('users.status', 'users.must_change_password', 'roles.name as role', 'companies.status as company_status');
    if (!currentUser || currentUser.status !== 'ACTIVE' || currentUser.company_status !== 'ACTIVE') {
        return next(new UnauthorizedError('Your account is inactive'));
    }
    if (currentUser.must_change_password) {
        return next(new UnauthorizedError('You must change your password before accessing the portal'));
    }
    req.tenantContext = {
        companyId: req.user.companyId,
        userId: req.user.userId,
        role: currentUser.role,
    };
    req.user.role = currentUser.role;
    next();
};
