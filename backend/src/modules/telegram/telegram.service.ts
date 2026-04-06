import { pool } from '../../config/database';
import { logger } from '../../shared/logger';
import { conversationService } from '../agent/conversation.service';
import { openaiService } from '../agent/openai.service';
// import TelegramBot from 'node-telegram-bot-api'; // Will be installed later

export class TelegramService {
    // Store bot instances per scheme: schemeId -> TelegramBot
    // private bots: Map<string, TelegramBot> = new Map();

    async initializeBots() {
        logger.info('[Telegram] Initializing bots from database...');
        /*
        const res = await pool.query('SELECT id, telegram_bot_token FROM schemes WHERE telegram_bot_token IS NOT NULL');
        for (const row of res.rows) {
            const bot = new TelegramBot(row.telegram_bot_token);
            // Setup Webhook: bot.setWebHook(\`\${env.PUBLIC_URL}/api/v1/telegram/webhook/\${row.id}\`)
            this.bots.set(row.id, bot);
        }
        */
    }

    async handleIncomingMessage(schemeId: string, payload: any) {
        logger.info('[Telegram] Received webhook payload for scheme', { schemeId, payload });
        
        // 1. Extract chat_id and message
        const chatId = payload.message?.chat?.id;
        const text = payload.message?.text;

        if (!chatId || !text) return;

        // 2. Map Telegram Chat ID to System Conversation ID
        let conversationId = await this.getConversationForChat(chatId, schemeId);
        if (!conversationId) {
            conversationId = await conversationService.createConversation(`telegram-${chatId}`, schemeId);
            await this.linkChatToConversation(chatId, conversationId!, schemeId);
        }

        // 3. Process via AI Service
        try {
            /*
            const bot = this.bots.get(schemeId);
            const schemeRes = await pool.query('SELECT scheme_name FROM schemes WHERE id = $1', [schemeId]);
            const schemeName = schemeRes.rows[0]?.scheme_name || 'Community';

            await openaiService.processMessage(
                conversationId,
                schemeId,
                schemeName,
                text,
                undefined, // No direct tenant JWT context for public telegram yet, could be linked later via OTP
                (event) => {
                    // Stream status updates back to Telegram as "typing..." or status edits
                    if (event.type === 'text' && event.content) {
                        // Accumulate and send back, or send chunks if large
                    } else if (event.type === 'complete' && event.actionData) {
                        // Optional interactive keyboards for ui_actions
                    }
                }
            );
            */
            logger.info('[Telegram] AI processing stub executed correctly');
        } catch (e: any) {
            logger.error('[Telegram] Error processing message', e);
        }
    }

    private async getConversationForChat(chatId: number, schemeId: string): Promise<string | null> {
        try {
            const res = await pool.query(
                'SELECT conversation_id FROM telegram_conversations WHERE telegram_chat_id = $1 AND scheme_id = $2',
                [chatId, schemeId]
            );
            return res.rows[0]?.conversation_id || null;
        } catch {
            return null;
        }
    }

    private async linkChatToConversation(chatId: number, conversationId: string, schemeId: string) {
        try {
            await pool.query(
                `INSERT INTO telegram_conversations (telegram_chat_id, conversation_id, scheme_id)
                 VALUES ($1, $2, $3)`,
                [chatId, conversationId, schemeId]
            );
        } catch (e) {
            logger.error('[Telegram] Failed to link chat', e);
        }
    }
}

export const telegramService = new TelegramService();
