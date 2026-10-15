import { AppError, ConflictError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { error } from '../utils/response';
import { env } from '../config/env';
export const errorHandler = (err, req, res, next) => {
    logger.error(`${err.name}: ${err.message}\n${err.stack}`);
    if (err instanceof ValidationError) {
        return res.status(err.statusCode).json(error(err.message, err.code, err.details));
    }
    if (err instanceof ConflictError) {
        return res.status(err.statusCode).json(error(err.message, err.code, err.details));
    }
    if (err instanceof AppError) {
        return res.status(err.statusCode).json(error(err.message, err.code));
    }
    // Handle generic / unexpected errors
    const message = env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;
    return res.status(500).json(error(message, 'INTERNAL_ERROR'));
};
