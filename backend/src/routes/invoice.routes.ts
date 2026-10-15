import { Router } from 'express';
import * as invoiceController from '../controllers/invoice.controller';
import { requireAuth } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { requireRole } from '../middleware/rbac';
import { Role } from '../types';

const router = Router();

router.use(requireAuth, requireTenant);

// Get invoice stats (must come BEFORE /:id route!)
router.get('/stats', requireRole(Role.ADMIN, Role.DISPATCHER), invoiceController.getStats);

// Get tax summary for paid contractor/driver earnings
router.get('/tax-summary', requireRole(Role.ADMIN), invoiceController.getTaxSummary);
router.get('/tax-preparation/:driverId/validate', requireRole(Role.ADMIN), invoiceController.validateTaxPreparation);
router.get('/tax-preparation/development-fixture', requireRole(Role.ADMIN), invoiceController.getDevelopmentTaxFixture);
router.get('/tax-preparations', requireRole(Role.ADMIN), invoiceController.getTaxPreparations);
router.post('/tax-preparations', requireRole(Role.ADMIN), invoiceController.createTaxPreparation);
router.get('/tax-preparations/:id/pdf', requireRole(Role.ADMIN), invoiceController.downloadTaxPreparation);

// Get all invoices with filters and pagination
router.get('/', requireRole(Role.ADMIN, Role.DISPATCHER), invoiceController.getAll);

// Get single invoice by ID
router.get('/:id', requireRole(Role.ADMIN, Role.DISPATCHER), invoiceController.getById);

// Create new invoice
router.post('/', requireRole(Role.ADMIN, Role.DISPATCHER), invoiceController.create);

// Update invoice
router.patch('/:id', requireRole(Role.ADMIN, Role.DISPATCHER), invoiceController.update);

// Delete invoice
router.delete('/:id', requireRole(Role.ADMIN), invoiceController.deleteInvoice);

// Mark invoice as sent
router.post('/:id/mark-sent', requireRole(Role.ADMIN, Role.DISPATCHER), invoiceController.markAsSent);

// Mark invoice as paid
router.post('/:id/mark-paid', requireRole(Role.ADMIN, Role.DISPATCHER), invoiceController.markAsPaid);

export default router;
