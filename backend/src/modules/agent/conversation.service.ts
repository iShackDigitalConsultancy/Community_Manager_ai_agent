import { pool } from '../../config/database';

export class ConversationService {
    async createConversation(visitorId: string, schemeId?: string) {
        const res = await pool.query(
            `INSERT INTO conversations (channel_user_id, channel, scheme_id, state) VALUES ($1, 'web', $2, 'awaiting_scheme') RETURNING id`,
            [visitorId, schemeId || null]
        );
        return res.rows[0].id;
    }

    async getConversation(id: string) {
        const res = await pool.query('SELECT * FROM conversations WHERE id = $1', [id]);
        return res.rows[0];
    }

    async addMessage(conversationId: string, role: 'user' | 'assistant' | 'system', content: string, tokenCount: number = 0) {
        const res = await pool.query(
            `INSERT INTO messages (conversation_id, role, content, token_count) VALUES ($1, $2, $3, $4) RETURNING *`,
            [conversationId, role, content, tokenCount]
        );
        return res.rows[0];
    }

    async getHistory(conversationId: string) {
        const res = await pool.query('SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC', [conversationId]);
        return res.rows;
    }
}

export const conversationService = new ConversationService();
