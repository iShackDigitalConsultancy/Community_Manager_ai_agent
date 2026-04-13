CREATE TABLE IF NOT EXISTS knowledge_document_downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    scheme_id UUID NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT idx_knowledge_document_downloads_doc_id FOREIGN KEY (document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    CONSTRAINT idx_knowledge_document_downloads_scheme_id FOREIGN KEY (scheme_id) REFERENCES schemes(id) ON DELETE CASCADE 
);

CREATE INDEX IF NOT EXISTS idx_kdd_created_at ON knowledge_document_downloads(created_at);
CREATE INDEX IF NOT EXISTS idx_kdd_scheme_id ON knowledge_document_downloads(scheme_id);
CREATE INDEX IF NOT EXISTS idx_kdd_document_id ON knowledge_document_downloads(document_id);
