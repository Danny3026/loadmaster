import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { validate } from '../middleware/validator';
import { createUserSchema, updateUserSchema } from '../validators/user.validator';
import { requireAuth } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { requireRole } from '../middleware/rbac';
import { Role } from '../types';

const router = Router();

router.use(requireAuth, requireTenant);

router.get('/', requireRole(Role.ADMIN, Role.DISPATCHER), userController.getAll);
router.get('/:id', requireRole(Role.ADMIN, Role.DISPATCHER), userController.getById);
router.post('/', requireRole(Role.ADMIN), validate(createUserSchema), userController.create);
router.patch('/:id', requireRole(Role.ADMIN), validate(updateUserSchema), userController.update);
router.delete('/:id', requireRole(Role.ADMIN), userController.deleteUser);

export default router;
