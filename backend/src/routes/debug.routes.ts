import { Router } from 'express';
import { validateLoadPayload } from '../controllers/debug.controller';
import { requireAuth } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';

const router = Router();

router.use(requireAuth, requireTenant);

router.post('/validate-load', validateLoadPayload);

export default router;
