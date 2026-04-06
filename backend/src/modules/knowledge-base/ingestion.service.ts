import crypto from 'crypto';
import { pool } from '../../config/database';
import { s3Service } from '../../shared/s3.service';
import { extractionService } from './extraction.service';
import { chunkingService } from './chunking.service';
import { embeddingService } from './embedding.service';

export class IngestionService {
    
    async uploadDocumentOnly(schemeId: string, file: Express.Multer.File, documentType: string, title: string, uploadedBy: string) {
        const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');
        
        const existing = await pool.query('SELECT id FROM knowledge_documents WHERE scheme_id = $1 AND content_hash = $2', [schemeId, hash]);
        if (existing.rows.length > 0) {
            throw new Error('Identical document already exists in this scheme.');
        }

        const key = `schemes/${schemeId}/knowledge/${Date.now()}-${file.originalname}`;
        console.log(`[Ingestion] Uploading to S3...`);
        const fileUrl = await s3Service.uploadFile(key, file.buffer, file.mimetype);
        console.log(`[Ingestion] S3 upload complete: ${fileUrl}`);

        const docRes = await pool.query(
            `INSERT INTO knowledge_documents 
            (scheme_id, document_type, title, original_filename, file_path, content_text, content_hash, chunk_count, uploaded_by, processing_status) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
            [schemeId, documentType, title, file.originalname, fileUrl, '', hash, 0, uploadedBy, 'uploaded']
        );
        
        return { id: docRes.rows[0].id, status: 'uploaded' };
    }

    async processForLLM(schemeId: string, docId: string) {
        console.log(`[Ingestion] Starting LLM processing for document ${docId}`);
        const docRes = await pool.query('SELECT * FROM knowledge_documents WHERE id = $1 AND scheme_id = $2', [docId, schemeId]);
        if (docRes.rows.length === 0) throw new Error('Document not found');
        const doc = docRes.rows[0];

        if (doc.processing_status === 'processed') {
            return { message: 'Already processed' };
        }

        const fileBuffer = await s3Service.downloadFile(doc.file_path);
        
        // Infer mimetype from original extension
        const ext = doc.original_filename.split('.').pop()?.toLowerCase();
        let mimetype = 'application/octet-stream';
        if (ext === 'pdf') mimetype = 'application/pdf';
        else if (ext === 'txt') mimetype = 'text/plain';
        else if (ext === 'docx') mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        console.log(`[Ingestion] Extraction...`);
        const rawText = await extractionService.extractText(fileBuffer, mimetype);
        
        console.log(`[Ingestion] Chunking text...`);
        const chunks = chunkingService.chunkText(rawText);
        
        console.log(`[Ingestion] Generating embeddings...`);
        const embeddings = await embeddingService.generateEmbeddingsBatch(chunks);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            await client.query('UPDATE knowledge_documents SET content_text = $1, chunk_count = $2, processing_status = $3 WHERE id = $4', 
                [rawText, chunks.length, 'processed', docId]);

            await client.query('DELETE FROM knowledge_chunks WHERE document_id = $1', [docId]);

            for (let i = 0; i < chunks.length; i++) {
                const embeddingStr = `[${embeddings[i].join(',')}]`;
                await client.query(
                    `INSERT INTO knowledge_chunks (document_id, scheme_id, chunk_index, chunk_text, embedding, token_count) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [docId, schemeId, i, chunks[i], embeddingStr, Math.floor(chunks[i].split(' ').length * 1.3)]
                );
            }

            await client.query('COMMIT');
            return { id: docId, chunksProcessed: chunks.length, status: 'processed' };
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
}

export const ingestionService = new IngestionService();
