import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import driverRoutes from './driver.routes';
import truckRoutes from './truck.routes';
import brokerRoutes from './broker.routes';
import loadRoutes from './load.routes';
import dispatchRoutes from './dispatch.routes';
import documentRoutes from './document.routes';
import invoiceRoutes from './invoice.routes';
import dashboardRoutes from './dashboard.routes';
import reportRoutes from './report.routes';
import notificationRoutes from './notification.routes';
import debugRoutes from './debug.routes';
import settlementRoutes from './settlement.routes';
import companyRoutes from './company.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/drivers', driverRoutes);
router.use('/trucks', truckRoutes);
router.use('/brokers', brokerRoutes);
router.use('/loads', loadRoutes);
router.use('/dispatch', dispatchRoutes);
router.use('/documents', documentRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/debug', debugRoutes);
router.use('/reports', reportRoutes);
router.use('/notifications', notificationRoutes);
router.use('/settlements', settlementRoutes);
router.use('/companies', companyRoutes);

export default router;
