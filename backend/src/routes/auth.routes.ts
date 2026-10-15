import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middleware/validator';
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '../validators/auth.validator';
import { authRateLimiter, registrationRateLimiter } from '../middleware/rateLimiter';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/login', authRateLimiter, validate(loginSchema), authController.login);
router.post('/register', registrationRateLimiter, validate(registerSchema), authController.register);
router.post('/forgot-password', authRateLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authRateLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.post('/change-password', requireAuth, validate(changePasswordSchema), authController.changePassword);
router.get('/me', requireAuth, authController.me);

export default router;
