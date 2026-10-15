import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { requireRole } from '../middleware/rbac';
import { Role } from '../types';
import { getCurrentCompany, getPayerEin, updateCompany, uploadLogo } from '../controllers/company.controller';
import { logoUpload } from '../middleware/upload';

const router = Router();

router.use(requireAuth, requireTenant);
router.get('/me', getCurrentCompany);
router.get('/me/payer-ein', requireRole(Role.ADMIN), getPayerEin);
router.put('/me', requireRole(Role.ADMIN), updateCompany);
router.post('/logo', requireRole(Role.ADMIN), logoUpload.single('logo'), uploadLogo);

export default router;
