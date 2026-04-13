import { Router } from 'express';
import { telegramController } from './telegram.controller';

const router = Router();

// Endpoint for receiving webhook payload from Telegram (production mode)
router.post('/webhook/:schemeId', telegramController.handleWebhook);

export const telegramRoutes = router;
