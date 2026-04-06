import { Request, Response } from 'express';
import { openaiService } from '../agent/openai.service';
import { conversationService } from '../agent/conversation.service';
import { pool } from '../../config/database';
import { s3Service } from '../../shared/s3.service';
import { logger } from '../../shared/logger';

export const chatController = {
    async sendMessage(req: Request, res: Response) {
        try {
            const { message, schemeId, attachment } = req.body;
            let { conversationId } = req.body;
            const jwtUser = (req as any).user;

            if (!message || !schemeId) {
                return res.status(400).json({ error: 'message and schemeId are required' });
            }

            // ── Validate scheme ─────────────────────────────────────
            const schemeRes = await pool.query(
                'SELECT scheme_name FROM schemes WHERE id = $1', [schemeId]
            );
            if (schemeRes.rows.length === 0) {
                return res.status(404).json({ error: 'Scheme not found' });
            }
            const schemeName = schemeRes.rows[0].scheme_name;

            // ── Build tenant context from JWT ──────────────────────
            let tenantContext: any = undefined;
            if (jwtUser?.sub && jwtUser?.role === 'tenant') {
                try {
                    const unitRes = await pool.query(
                        `SELECT unit_number, tenant_name, owner_name 
                         FROM scheme_units WHERE id = $1 AND scheme_id = $2`,
                        [jwtUser.sub, schemeId]
                    );
                    if (unitRes.rows.length > 0) {
                        const unit = unitRes.rows[0];
                        tenantContext = {
                            unitId: jwtUser.sub,
                            unitNumber: unit.unit_number,
                            tenantName: unit.tenant_name || unit.owner_name,
                            role: 'tenant'
                        };
                    }
                } catch (e) {
                    logger.warn('[Chat] Could not enrich tenant context', e);
                }
            }

            // ── Create or resume conversation ──────────────────────
            let activeConvId = conversationId;
            if (activeConvId) {
                try {
                    const check = await pool.query('SELECT id FROM conversations WHERE id = $1', [activeConvId]);
                    if (check.rows.length === 0) {
                        activeConvId = null; // Force recreation if missing
                    }
                } catch (e) {
                    activeConvId = null; // E.g. invalid UUID format
                }
            }

            if (!activeConvId) {
                const visitorId = jwtUser?.sub
                    ? `tenant-${jwtUser.sub}`
                    : `guest-${schemeId}-${Date.now()}`;
                activeConvId = await conversationService.createConversation(visitorId, schemeId);
            }

            // Set up Server-Sent Events headers
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders();

            // Stream Conversation ID first so UI has it
            res.write(`data: ${JSON.stringify({ type: 'init', conversationId: activeConvId })}\n\n`);
            if (typeof (res as any).flush === 'function') (res as any).flush();

            const aiResponse = await openaiService.processMessage(
                activeConvId,
                schemeId,
                schemeName,
                message,
                tenantContext,
                (event) => {
                    res.write(`data: ${JSON.stringify(event)}\n\n`);
                    if (typeof (res as any).flush === 'function') (res as any).flush();
                },
                attachment
            );

            // Send completed event and close
            res.write(`data: ${JSON.stringify({ type: 'complete', text: aiResponse })}\n\n`);
            if (typeof (res as any).flush === 'function') (res as any).flush();
            res.end();

        } catch (error: any) {
            require('fs').appendFileSync('/tmp/chat-error.log', new Date().toISOString() + '\\n' + String(error.stack || error) + '\\n');
            logger.error('[Chat] sendMessage error', error);
            // If headers are already sent, write an error event and close
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to process chat message' });
            } else {
                res.write(`data: ${JSON.stringify({ type: 'error', content: 'Logic error: ' + (error?.message || 'Unknown error occurred') })}\n\n`);
                res.end();
            }
        }
    },

    async downloadDoc(req: Request, res: Response) {
        try {
            const docRes = await pool.query(
                'SELECT file_path, original_filename FROM knowledge_documents WHERE id = $1 AND is_active = true', 
                [req.params.docId]
            );
            
            if (docRes.rows.length === 0) {
                return res.status(404).json({ error: 'Document not found or inactive' });
            }

            const doc = docRes.rows[0];
            const buffer = await s3Service.downloadFile(doc.file_path);
            
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const mime = require('mime-types');
            const mimetype = mime.lookup(doc.original_filename) || 'application/octet-stream';

            res.setHeader('Content-Type', mimetype);
            res.setHeader('Content-Disposition', `inline; filename="${doc.original_filename}"`);
            
            res.send(buffer);
        } catch (e: any) {
            if (e.message === 'Mock file not found') {
                return res.status(404).json({ error: 'This file was uploaded in a previous session using Mock S3, which did not save to disk. Please re-upload the document.' });
            }
            logger.error('[Chat] Download error', e);
            res.status(500).json({ error: e.message });
        }
    },

    async getScheme(req: Request, res: Response) {
        try {
            const schemeRes = await pool.query(
                'SELECT id, scheme_name FROM schemes WHERE id = $1',
                [req.params.schemeId]
            );
            if (schemeRes.rows.length === 0) {
                return res.status(404).json({ error: 'Scheme not found' });
            }
            res.json(schemeRes.rows[0]);
        } catch (e: any) {
            res.status(500).json({ error: 'Failed to fetch scheme details' });
        }
    }
};
