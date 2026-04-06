import { Router } from 'express';
import { knowledgeTemplatesController } from './knowledge-templates.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth as any);

router.get('/', knowledgeTemplatesController.list as any);
router.get('/:id', knowledgeTemplatesController.get as any);

// Super admin only mutative routes
router.post('/', requireRole('super_admin') as any, knowledgeTemplatesController.create as any);
router.put('/:id', requireRole('super_admin') as any, knowledgeTemplatesController.update as any);

export const knowledgeTemplatesRoutes = router;
