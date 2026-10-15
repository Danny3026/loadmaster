import multer from 'multer';
import { env } from '../config/env';
import { ValidationError } from '../utils/errors';
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: env.MAX_FILE_SIZE,
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = env.ALLOWED_FILE_TYPES.split(',');
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new ValidationError(`Invalid file type. Allowed types: ${env.ALLOWED_FILE_TYPES}`));
        }
    },
});
export const logoUpload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new ValidationError('Invalid logo format. Use PNG, JPG, or WebP.'));
        }
    },
});
export default upload;
