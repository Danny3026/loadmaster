import { Router } from 'express';
import * as driverController from '../controllers/driver.controller';
import { validate } from '../middleware/validator';
import { createDriverSchema, updateDriverSchema } from '../validators/driver.validator';
import { requireAuth } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { requireRole } from '../middleware/rbac';
import { Role } from '../types';
import {
	availabilityTimelineSchema,
	createDriverAvailabilitySchema,
	deleteDriverAvailabilitySchema,
	updateDriverAvailabilitySchema,
} from '../validators/driver-availability.validator';

const router = Router();

router.use(requireAuth, requireTenant);

router.get('/availability/timeline', requireRole(Role.ADMIN, Role.DISPATCHER), validate(availabilityTimelineSchema), driverController.getAvailabilityTimeline);
router.get('/me', requireRole(Role.DRIVER), driverController.getMe);
router.get('/', requireRole(Role.ADMIN, Role.DISPATCHER), driverController.getAll);
router.get('/:id/availability', requireRole(Role.ADMIN, Role.DISPATCHER), driverController.getAvailability);
router.post('/:id/availability', requireRole(Role.ADMIN, Role.DISPATCHER), validate(createDriverAvailabilitySchema), driverController.createAvailability);
router.patch('/:id/availability/:availabilityId', requireRole(Role.ADMIN, Role.DISPATCHER), validate(updateDriverAvailabilitySchema), driverController.updateAvailability);
router.delete('/:id/availability/:availabilityId', requireRole(Role.ADMIN, Role.DISPATCHER), validate(deleteDriverAvailabilitySchema), driverController.deleteAvailability);
router.get('/:id', requireRole(Role.ADMIN, Role.DISPATCHER), driverController.getById);
router.post('/:id/extract-cdl', requireRole(Role.ADMIN, Role.DISPATCHER), driverController.extractCdl);
router.post('/', requireRole(Role.ADMIN, Role.DISPATCHER), validate(createDriverSchema), driverController.create);
router.post('/:id/reset-password', requireRole(Role.ADMIN), driverController.resetPortalPassword);
router.patch('/:id', requireRole(Role.ADMIN, Role.DISPATCHER), validate(updateDriverSchema), driverController.update);
router.delete('/:id', requireRole(Role.ADMIN), driverController.deleteDriver);

export default router;
