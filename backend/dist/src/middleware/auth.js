import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/errors';
import { env } from '../config/env';
export const requireAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedError('Missing or invalid token');
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            throw new UnauthorizedError('Missing token');
        }
        const decoded = jwt.verify(token, env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            next(new UnauthorizedError('Token expired'));
        }
        else if (error instanceof jwt.JsonWebTokenError) {
            next(new UnauthorizedError('Invalid token'));
        }
        else {
            next(error);
        }
    }
};
