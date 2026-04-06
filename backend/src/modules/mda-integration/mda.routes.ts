import { Router } from 'express';
import { mdaController } from './mda.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

// Protect this route, only Super Admins can trigger a sync
router.post('/sync', requireAuth, mdaController.triggerSync);

export const mdaRoutes = router;
