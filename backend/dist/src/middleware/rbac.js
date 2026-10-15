import { ForbiddenError } from '../utils/errors';
export const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new ForbiddenError('User not authenticated'));
        }
        if (!roles.includes(req.user.role)) {
            return next(new ForbiddenError('Insufficient permissions'));
        }
        next();
    };
};
