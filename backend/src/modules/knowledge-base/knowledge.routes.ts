import { Router } from 'express';
import multer from 'multer';
import { knowledgeController } from './knowledge.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireSchemeAccess } from '../../middleware/scheme-scope.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const router = Router({ mergeParams: true });

router.use(requireAuth as any, requireSchemeAccess as any);

router.get('/', knowledgeController.list as any);
router.post('/upload', requireRole('super_admin', 'scheme_admin') as any, upload.single('file') as any, knowledgeController.upload as any);
router.post('/:docId/process', requireRole('super_admin', 'scheme_admin') as any, knowledgeController.processDoc as any);
router.get('/:docId/download', requireRole('super_admin', 'scheme_admin') as any, knowledgeController.downloadDoc as any);
router.delete('/:docId', requireRole('super_admin', 'scheme_admin') as any, knowledgeController.delete as any);
router.post('/test-query', knowledgeController.testQuery as any);

export const knowledgeRoutes = router;
