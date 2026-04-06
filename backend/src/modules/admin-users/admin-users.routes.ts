import { Router } from 'express';
import { adminUsersController } from './admin-users.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth as any, requireRole('super_admin') as any);

router.get('/', adminUsersController.list as any);
router.post('/invite', adminUsersController.invite as any);
router.put('/:id', adminUsersController.update as any);
router.delete('/:id', adminUsersController.deactivate as any);
router.post('/:id/assign-schemes', adminUsersController.assignSchemes as any);

export const adminUsersRoutes = router;
