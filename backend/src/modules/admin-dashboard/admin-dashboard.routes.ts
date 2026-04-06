import { Router } from 'express';
import { adminDashboardController } from './admin-dashboard.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

// Endpoint: /api/v1/admin/dashboard/stats
router.get('/stats', requireAuth as any, adminDashboardController.getStats as any);
router.post('/sync', requireAuth as any, adminDashboardController.triggerSync as any);

export const adminDashboardRoutes = router;
