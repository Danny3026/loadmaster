import { Router } from 'express';
import * as truckController from '../controllers/truck.controller';
import { validate } from '../middleware/validator';
import { createTruckSchema, updateTruckSchema } from '../validators/truck.validator';
import { requireAuth } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { requireRole } from '../middleware/rbac';
import { Role } from '../types';

const router = Router();

router.use(requireAuth, requireTenant);

router.get('/', requireRole(Role.ADMIN, Role.DISPATCHER), truckController.getAll);
router.get('/:id', requireRole(Role.ADMIN, Role.DISPATCHER), truckController.getById);
router.post('/', requireRole(Role.ADMIN, Role.DISPATCHER), validate(createTruckSchema), truckController.create);
router.patch('/:id', requireRole(Role.ADMIN, Role.DISPATCHER), validate(updateTruckSchema), truckController.update);
router.delete('/:id', requireRole(Role.ADMIN), truckController.deleteTruck);

export default router;
