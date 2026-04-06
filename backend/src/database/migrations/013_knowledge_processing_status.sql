ALTER TABLE knowledge_documents 
ADD COLUMN processing_status VARCHAR(50) DEFAULT 'uploaded';

UPDATE knowledge_documents SET processing_status = 'processed' WHERE chunk_count > 0;
