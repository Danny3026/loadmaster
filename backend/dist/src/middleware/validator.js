import { ZodError } from 'zod';
import { ValidationError } from '../utils/errors';
export const validate = (schema) => {
    return async (req, res, next) => {
        try {
            // parseAsync may apply defaults and transforms — capture the parsed result
            const parsed = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            // overwrite the request parts with the parsed values so downstream handlers
            // receive defaulted/transformed values (e.g., default enums, coerced types)
            if (parsed.body)
                req.body = parsed.body;
            if (parsed.query)
                req.query = parsed.query;
            if (parsed.params)
                req.params = parsed.params;
            next();
        }
        catch (error) {
            if (error instanceof ZodError) {
                next(new ValidationError('Invalid request data', error.format()));
            }
            else {
                next(error);
            }
        }
    };
};
