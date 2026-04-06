import { Request, Response } from 'express';
import { telegramService } from './telegram.service';
import { logger } from '../../shared/logger';

export const telegramController = {
    /**
     * Webhook endpoint hit by Telegram servers when a user messages the bot.
     * Route: POST /api/v1/telegram/webhook/:schemeId
     */
    async handleWebhook(req: Request, res: Response) {
        try {
            const { schemeId } = req.params;
            const payload = req.body;

            // Telegram requires a 200 OK immediately to prevent retries
            res.status(200).send('OK');

            // Process message asynchronously
            await telegramService.handleIncomingMessage(schemeId, payload);
            
        } catch (error) {
            logger.error('[Telegram] Webhook error', error);
        }
    }
};
