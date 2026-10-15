import { Router } from 'express';
import * as brokerController from '../controllers/broker.controller';
import { validate } from '../middleware/validator';
import { createBrokerSchema, updateBrokerSchema } from '../validators/broker.validator';
import { requireAuth } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { requireRole } from '../middleware/rbac';
import { Role } from '../types';

const router = Router();

router.use(requireAuth, requireTenant);

router.get('/', requireRole(Role.ADMIN, Role.DISPATCHER), brokerController.getAll);
router.get('/:id', requireRole(Role.ADMIN, Role.DISPATCHER), brokerController.getById);
router.post('/', requireRole(Role.ADMIN, Role.DISPATCHER), validate(createBrokerSchema), brokerController.create);
router.patch('/:id', requireRole(Role.ADMIN, Role.DISPATCHER), validate(updateBrokerSchema), brokerController.update);
router.delete('/:id', requireRole(Role.ADMIN), brokerController.deleteBroker);

export default router;
