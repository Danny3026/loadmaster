import { Router } from 'express';
import * as documentController from '../controllers/document.controller';
import { requireAuth } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { requireRole } from '../middleware/rbac';
import { Role } from '../types';

const router = Router();

router.use(requireAuth, requireTenant);

router.get('/', requireRole(Role.ADMIN, Role.DISPATCHER), documentController.getAll);
router.post('/extract-batch', requireRole(Role.ADMIN, Role.DISPATCHER), documentController.extractBatch);
router.get('/:id', documentController.download);
router.delete('/:id', requireRole(Role.ADMIN, Role.DISPATCHER), documentController.deleteDocument);
router.get('/:id/extractions', requireRole(Role.ADMIN, Role.DISPATCHER), documentController.getExtractions);
router.post('/:id/verify', requireRole(Role.ADMIN, Role.DISPATCHER), documentController.verifyExtraction);

export default router;
