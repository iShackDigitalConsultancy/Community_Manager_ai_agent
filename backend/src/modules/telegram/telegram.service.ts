import { pool } from '../../config/database';
import { env } from '../../config/env';
import { logger } from '../../shared/logger';
import { conversationService } from '../agent/conversation.service';
import { claudeService } from '../agent/claude.service';
import { authService } from '../auth/auth.service';
import { Telegraf, Markup } from 'telegraf';
import { TenantContext } from '../agent/prompt.builder';

export class TelegramService {
    private bots: Map<string, Telegraf> = new Map();

    async initializeBots() {
        logger.info('[Telegram] Initializing bots from database...');
        try {
            const res = await pool.query('SELECT id, telegram_bot_token FROM schemes WHERE telegram_bot_token IS NOT NULL');
            for (const row of res.rows) {
                const botToken = row.telegram_bot_token;
                const schemeId = row.id;

                const bot = new Telegraf(botToken);
                this.bots.set(schemeId, bot);

                this.setupBotListeners(bot, schemeId);

                if (env.NODE_ENV === 'production' && process.env.PUBLIC_URL) {
                    const webhookUrl = `${process.env.PUBLIC_URL}/api/v1/telegram/webhook/${schemeId}`;
                    await bot.telegram.setWebhook(webhookUrl);
                    logger.info(`[Telegram] Webhook set for scheme ${schemeId} at ${webhookUrl}`);
                } else {
                    bot.launch();
                    logger.info(`[Telegram] Bot started in polling mode for scheme ${schemeId}`);
                }
            }
        } catch (e) {
            logger.error('[Telegram] Failed to initialize bots', e);
        }
    }

    async handleWebhookUpdate(schemeId: string, update: any) {
        const bot = this.bots.get(schemeId);
        if (bot) {
            await bot.handleUpdate(update);
        }
    }

    private setupBotListeners(bot: Telegraf, schemeId: string) {
        // Handle Callback Queries (Button Clicks)
        bot.on('callback_query', async (ctx: any) => {
            try {
                const data = ctx.callbackQuery.data;
                const chatId = ctx.chat.id;
                
                let convoResult = await this.getOrCreateConversation(chatId, schemeId);
                
                if (data.startsWith('sel_sch:')) {
                    const selectedSchemeId = data.split(':')[1];
                    // Setup new conversation with selected scheme
                    const newConvId = await conversationService.createConversation(`telegram-${chatId}-${Date.now()}`, selectedSchemeId);
                    
                    await pool.query(
                        `UPDATE telegram_conversations
                         SET auth_status = 'verified', 
                             scheme_id = $1, 
                             conversation_id = $2,
                             updated_at = NOW()
                         WHERE id = $3`,
                        [selectedSchemeId, newConvId, convoResult.id]
                    );

                    await ctx.editMessageText("Community selected! You can now start asking questions regarding this community.");
                } else if (data.startsWith('sel_unt:')) {
                    const selectedUnitId = data.split(':')[1];
                    // Find scheme for this unit
                    const unitRes = await pool.query('SELECT scheme_id FROM scheme_units WHERE id = $1', [selectedUnitId]);
                    const selectedSchemeId = unitRes.rows[0]?.scheme_id;
                    
                    const newConvId = await conversationService.createConversation(`telegram-${chatId}-${Date.now()}`, selectedSchemeId);

                    await pool.query(
                        `UPDATE telegram_conversations
                         SET auth_status = 'verified', 
                             tenant_unit_id = $1,
                             scheme_id = $2,
                             conversation_id = $3,
                             active_role = 'tenant',
                             updated_at = NOW()
                         WHERE id = $4`,
                        [selectedUnitId, selectedSchemeId, newConvId, convoResult.id]
                    );
                    await ctx.editMessageText("Property selected! You can now ask questions about your community.");
                }
            } catch (e) {
                logger.error('[Telegram] Error handling callback', e);
                await ctx.reply("Failed to process selection. Try again.");
            }
            await ctx.answerCbQuery();
        });

        bot.on('text', async (ctx) => {
            try {
                const chatId = ctx.chat.id;
                const text = ctx.message.text.trim();

                let convoResult = await this.getOrCreateConversation(chatId, schemeId);

                // State Machine handling
                switch (convoResult.authStatus) {
                    case 'unverified':
                    case 'pending_contact':
                        await this.handlePendingContact(ctx, text, convoResult, schemeId);
                        break;
                    case 'pending_otp':
                        await this.handlePendingOTP(ctx, text, convoResult, schemeId);
                        break;
                    case 'pending_scheme_selection':
                        await ctx.reply("Please select a community from the options provided above.");
                        break;
                    case 'verified':
                        await this.handleVerifiedMessage(ctx, text, convoResult, convoResult.schemeId || schemeId);
                        break;
                    default:
                        await ctx.reply("An unknown error occurred with your profile state. Let's restart. Please provide your email or phone number.");
                        await this.updateConversationState(convoResult.id, 'pending_contact', null);
                        break;
                }
            } catch (error) {
                logger.error('[Telegram] Error in bot text handler', error);
                await ctx.reply("Sorry, I encountered an error. Let's try that again later.");
            }
        });

        bot.on('photo', async (ctx: any) => {
            try {
                const chatId = ctx.chat.id;
                let convoResult = await this.getOrCreateConversation(chatId, schemeId);

                if (convoResult.authStatus !== 'verified') {
                    await ctx.reply("Please verify your account before sending photos. Send any text to restart.");
                    return;
                }

                const photos = ctx.message.photo;
                const largestPhoto = photos[photos.length - 1];
                const fileId = largestPhoto.file_id;
                
                const link = await ctx.telegram.getFileLink(fileId);
                const response = await fetch(link.href);
                const buffer = await response.arrayBuffer();
                const base64 = Buffer.from(buffer).toString('base64');
                const caption = ctx.message.caption || "Image uploaded";

                await this.handleVerifiedMessage(ctx, caption, convoResult, convoResult.schemeId || schemeId, { base64, mimeType: 'image/jpeg' });
            } catch (error) {
                logger.error('[Telegram] Error in bot photo handler', error);
                await ctx.reply("Sorry, I encountered an error processing your photo.");
            }
        });
    }

    private async handlePendingContact(ctx: any, text: string, convoResult: any, schemeId: string) {
        if (text.includes('@') || /[0-9]{9,}/.test(text.replace(/[^0-9]/g, ''))) {
            try {
                await authService.requestTelegramOTP(text);
                await this.updateConversationState(convoResult.id, 'pending_otp', text);
                await ctx.reply(`I have sent an OTP to ${text}. Please reply with the code to verify your identity.`);
            } catch (e: any) {
                await ctx.reply(`Failed to send OTP: ${e.message}\nPlease make sure you are registered and try again.`);
            }
        } else {
            await ctx.reply("Welcome, I am Wendy your AI community manager, please give me your email or your mobile number so that I can send you an OTP and then I can help you with all your queries.");
        }
    }

    private async handlePendingOTP(ctx: any, text: string, convoResult: any, schemeId: string) {
        const otpPattern = /^[0-9]{6}$/;
        if (!otpPattern.test(text.trim())) {
            await ctx.reply("Please enter a valid 6-digit OTP code.");
            return;
        }

        try {
            const authResult = await authService.verifyTelegramOTP(convoResult.tempContactInfo, text.trim());
            
            if (authResult.authType === 'admin') {
                const adminId = authResult.user?.id;
                const companyId = authResult.user?.companyId;

                await pool.query(
                    `UPDATE telegram_conversations SET admin_user_id = $1, active_role = 'manager' WHERE id = $2`,
                    [adminId, convoResult.id]
                );

                const schemesRes = await pool.query(`SELECT id, scheme_name FROM schemes WHERE company_id = $1 ORDER BY scheme_name LIMIT 20`, [companyId]);
                
                if (schemesRes.rows.length === 0) {
                    await ctx.reply("You are authenticated as a manager, but no communities are assigned to your company.");
                    return;
                }
                
                await this.updateConversationState(convoResult.id, 'pending_scheme_selection');
                
                const buttons = schemesRes.rows.map(s => [Markup.button.callback(s.scheme_name, `sel_sch:${s.id}`)]);
                await ctx.reply("Verification successful! Please select the community you'd like to manage:", Markup.inlineKeyboard(buttons));
            
            } else if (authResult.authType === 'tenant_multiple') {
                await this.updateConversationState(convoResult.id, 'pending_scheme_selection');
                
                const buttons = (authResult.units || []).map((u: any) => 
                    [Markup.button.callback(`${u.scheme_name} (Unit ${u.unit_number})`, `sel_unt:${u.unit_id}`)]
                );
                await ctx.reply("Verification successful! You have access to multiple units. Please select one:", Markup.inlineKeyboard(buttons));

            } else {
                // tenant_single
                await pool.query(
                    `UPDATE telegram_conversations SET tenant_unit_id = $1, active_role = 'tenant', scheme_id = $2 WHERE id = $3`,
                    [authResult.user?.id, authResult.user?.schemeId, convoResult.id]
                );
                await this.updateConversationState(convoResult.id, 'verified');
                await ctx.reply("Identity verification successful! You can now ask me questions regarding your community, log maintenance requests, or review documents.");
            }
        } catch (e: any) {
            await ctx.reply(`Verification failed: ${e.message}\nPlease enter the correct OTP or try another email/phone.`);
        }
    }

    private async handleVerifiedMessage(ctx: any, text: string, convoResult: any, schemeId: string, image?: { base64: string, mimeType: string }) {
        if (!schemeId) {
            await ctx.reply("Your session lost its community context. Let's restart.");
            await this.updateConversationState(convoResult.id, 'unverified');
            return;
        }

        const schemeRes = await pool.query('SELECT scheme_name FROM schemes WHERE id = $1', [schemeId]);
        const schemeName = schemeRes.rows[0]?.scheme_name || 'Community';

        const tenantContext: TenantContext = {
            unitId: convoResult.tenantUnitId,
            role: (convoResult.activeRole as any) || 'tenant'
        };

        const thinkingMsg = await ctx.reply("Processing...");

        let lastMessageText = '';

        await claudeService.processMessage(
            convoResult.conversationId,
            schemeId,
            schemeName,
            text,
            tenantContext,
            (event) => {
                if (event.type === 'text') {
                    lastMessageText += event.content;
                }
            },
            image
        );

        if (lastMessageText) {
            const chunks = lastMessageText.match(/.{1,4000}/g) || [lastMessageText];
            for (let i = 0; i < chunks.length; i++) {
                if (i === 0) {
                    await ctx.telegram.editMessageText(
                        ctx.chat.id, 
                        thinkingMsg.message_id, 
                        undefined, 
                        chunks[i],
                        { parse_mode: 'Markdown' }
                    ).catch(() => ctx.reply(chunks[i], { parse_mode: 'Markdown' }));
                } else {
                    await ctx.reply(chunks[i], { parse_mode: 'Markdown' });
                }
            }
        } else {
             await ctx.telegram.editMessageText(ctx.chat.id, thinkingMsg.message_id, undefined, "I'm sorry, I couldn't formulate a proper response.");
        }
    }

    private async getOrCreateConversation(chatId: number, schemeId: string) {
        let res = await pool.query(
            `SELECT id, conversation_id as "conversationId", scheme_id as "schemeId", auth_status as "authStatus", 
                    temp_contact_info as "tempContactInfo", tenant_unit_id as "tenantUnitId", 
                    admin_user_id as "adminUserId", active_role as "activeRole"
             FROM telegram_conversations WHERE telegram_chat_id = $1`,
            [chatId]
        );

        if (res.rows[0]) {
            return res.rows[0];
        }

        const newConvId = await conversationService.createConversation(`telegram-${chatId}`, schemeId);
        
        const insertRes = await pool.query(
            `INSERT INTO telegram_conversations (telegram_chat_id, conversation_id, scheme_id, auth_status)
             VALUES ($1, $2, $3, 'unverified')
             RETURNING id, conversation_id as "conversationId", scheme_id as "schemeId", auth_status as "authStatus", 
                       temp_contact_info as "tempContactInfo", tenant_unit_id as "tenantUnitId",
                       admin_user_id as "adminUserId", active_role as "activeRole"`,
            [chatId, newConvId, schemeId]
        );

        return insertRes.rows[0];
    }

    private async updateConversationState(id: string, status: string, contactInfo: string | null = null) {
        if (contactInfo !== null) {
            await pool.query(
                `UPDATE telegram_conversations 
                 SET auth_status = $1, temp_contact_info = $2, updated_at = NOW() 
                 WHERE id = $3`,
                [status, contactInfo, id]
            );
        } else {
            await pool.query(
                `UPDATE telegram_conversations 
                 SET auth_status = $1, updated_at = NOW() 
                 WHERE id = $2`,
                [status, id]
            );
        }
    }
}

export const telegramService = new TelegramService();
