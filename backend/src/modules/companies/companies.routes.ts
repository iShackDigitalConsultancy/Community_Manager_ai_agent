import { Router } from 'express';
import { companiesController } from './companies.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

// Only super_admin can manage companies globally
router.use(requireAuth as any, requireRole('super_admin') as any);

router.post('/', companiesController.create as any);
router.get('/', companiesController.list as any);
router.get('/:id', companiesController.get as any);
router.put('/:id', companiesController.update as any);
router.delete('/:id', companiesController.delete as any);

export const companiesRoutes = router;
