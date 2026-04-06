import { Router } from 'express';
import { schemesController } from './schemes.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { requireSchemeAccess } from '../../middleware/scheme-scope.middleware';

const router = Router();

// Global Scheme Routes
router.get('/', requireAuth as any, schemesController.list as any);
router.post('/', requireAuth as any, requireRole('super_admin', 'scheme_admin') as any, schemesController.create as any);

// ID Scoped Scheme Routes
const scopedRouter = Router({ mergeParams: true });
scopedRouter.use(requireAuth as any, requireSchemeAccess as any);

scopedRouter.get('/', schemesController.get as any);
scopedRouter.put('/', requireRole('super_admin', 'scheme_admin') as any, schemesController.update as any);
scopedRouter.delete('/', requireRole('super_admin', 'scheme_admin') as any, schemesController.archive as any);

router.use('/:id', scopedRouter);

export const schemesRoutes = router;
