import multer from 'multer';
import { NextFunction, Request, Response } from 'express';
import { ValidationError } from '../utils/errors';
import { PROFILE_PHOTO_MAX_BYTES } from '../utils/profile-photo';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PROFILE_PHOTO_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(new ValidationError('Invalid image format. Use JPEG, PNG, or WebP.'));
  },
});

export const profilePhotoUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      next(new ValidationError('Profile photo must be no larger than 5 MB'));
      return;
    }
    if (error instanceof multer.MulterError) {
      next(new ValidationError('Unable to upload profile photo'));
      return;
    }
    next(error);
  });
};
