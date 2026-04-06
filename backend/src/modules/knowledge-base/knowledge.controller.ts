import { Response } from 'express';
import { AdminRequest } from '../auth/auth.types';
import { ingestionService } from './ingestion.service';
import { retrievalService } from './retrieval.service';
import { pool } from '../../config/database';
import { s3Service } from '../../shared/s3.service';

export const knowledgeController = {
    async upload(req: AdminRequest, res: Response) {
        console.log(`[Upload] Request received for scheme: ${req.params.id}`);
        try {
            if (!req.file) {
                console.log(`[Upload] No file uploaded`);
                return res.status(400).json({ error: 'No file uploaded' });
            }
            console.log(`[Upload] File received: ${req.file.originalname}, Size: ${req.file.size}`);
            
            const { document_type, title } = req.body;
            if (!document_type || !title) {
                console.log(`[Upload] Missing body fields`);
                return res.status(400).json({ error: 'document_type and title are required' });
            }

            console.log(`[Upload] Triggering ingestionService.uploadDocumentOnly...`);
            const result = await ingestionService.uploadDocumentOnly(
                req.params.id as string, 
                req.file, 
                document_type, 
                title, 
                req.admin!.userId
            );
            console.log(`[Upload] Upload phase complete, returning 201`);
            
            res.status(201).json(result);
        } catch (e: any) {
            console.error(`[Upload] Error Caught:`, e);
            res.status(500).json({ error: e.message });
        }
    },

    async list(req: AdminRequest, res: Response) {
        try {
            const result = await pool.query(
                `SELECT id, title, document_type, original_filename, chunk_count, is_active, created_at, processing_status 
                 FROM knowledge_documents WHERE scheme_id = $1 ORDER BY created_at DESC`,
                [req.params.id]
            );
            res.json(result.rows);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    },

    async delete(req: AdminRequest, res: Response) {
        try {
            const docRes = await pool.query('SELECT file_path FROM knowledge_documents WHERE id = $1 AND scheme_id = $2', [req.params.docId, req.params.id]);
            if (docRes.rows.length > 0) {
                await s3Service.deleteFile(docRes.rows[0].file_path);
            }

            await pool.query('DELETE FROM knowledge_documents WHERE id = $1 AND scheme_id = $2', [req.params.docId, req.params.id]);
            res.json({ success: true });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    },

    async processDoc(req: AdminRequest, res: Response) {
        try {
            const result = await ingestionService.processForLLM(req.params.id as string, req.params.docId as string);
            res.json(result);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    },

    async downloadDoc(req: AdminRequest, res: Response) {
        try {
            const docRes = await pool.query(
                'SELECT file_path, original_filename FROM knowledge_documents WHERE id = $1 AND scheme_id = $2', 
                [req.params.docId, req.params.id]
            );
            
            if (docRes.rows.length === 0) {
                return res.status(404).json({ error: 'Document not found' });
            }

            const doc = docRes.rows[0];
            const buffer = await s3Service.downloadFile(doc.file_path);
            
            const mime = require('mime-types');
            const mimetype = mime.lookup(doc.original_filename) || 'application/octet-stream';

            res.setHeader('Content-Type', mimetype);
            // inline means it will try to view it in browser (e.g. PDF view), fallback to download
            res.setHeader('Content-Disposition', `inline; filename="${doc.original_filename}"`);
            
            res.send(buffer);
        } catch (e: any) {
            if (e.message === 'Mock file not found') {
                return res.status(404).json({ error: 'This file was uploaded in a previous session using Mock S3, which did not save to disk. Please re-upload the document.' });
            }
            res.status(500).json({ error: e.message });
        }
    },

    async testQuery(req: AdminRequest, res: Response) {
        try {
            const { query, topK } = req.body;
            if (!query) {
                return res.status(400).json({ error: 'query is required' });
            }

            const results = await retrievalService.retrieveContext(req.params.id as string, query, topK || 5);
            
            res.json({
                query,
                context: results,
                score: results.length > 0 ? results[0].similarity : 0
            });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    }
};
