import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { requireAuth } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { requireRole } from '../middleware/rbac';
import { Role } from '../types';

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

router.get('/', requireRole(Role.ADMIN, Role.DISPATCHER), dashboardController.getStats);

export default router;
