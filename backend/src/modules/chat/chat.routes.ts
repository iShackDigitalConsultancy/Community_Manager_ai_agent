import { Router } from 'express';
import { chatController } from './chat.controller';

const router = Router();

router.post('/message', chatController.sendMessage as any);
router.get('/documents/:docId/download', chatController.downloadDoc as any);
router.get('/schemes/:schemeId', chatController.getScheme as any);

export const chatRoutes = router;
