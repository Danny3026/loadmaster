import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { createLoadSchema } from '../validators/load.validator';
import { success, error } from '../utils/response';

export const validateLoadPayload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // run the same parse used by the validator middleware
    const parsed = await createLoadSchema.parseAsync({ body: req.body });
    return res.json(success(parsed.body));
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json(error('Validation failed', 'VALIDATION_ERROR', err.format()));
    }
    next(err);
  }
};

export default {};
