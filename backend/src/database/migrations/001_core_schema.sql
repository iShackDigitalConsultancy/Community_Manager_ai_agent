-- ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- SCHEMES
CREATE TABLE schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_name VARCHAR(255) NOT NULL,
    scheme_code VARCHAR(50) UNIQUE NOT NULL,
    scheme_type VARCHAR(50) NOT NULL CHECK (scheme_type IN (
        'sectional_title', 'hoa', 'estate', 'rental'
    )),
    managing_agent_name VARCHAR(255),
    managing_agent_email VARCHAR(255),
    managing_agent_phone VARCHAR(50),
    smartbuilding_property_id VARCHAR(100),
    mda_scheme_id VARCHAR(100),
    escalation_email VARCHAR(255),
    escalation_phone VARCHAR(50),
    status VARCHAR(30) DEFAULT 'setup' CHECK (status IN (
        'setup', 'in_review', 'live', 'paused', 'archived'
    )),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SCHEME UNITS & RESIDENTS
CREATE TABLE scheme_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id UUID NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
    unit_number VARCHAR(50) NOT NULL,
    unit_type VARCHAR(50) DEFAULT 'residential' CHECK (unit_type IN (
        'residential', 'commercial', 'parking', 'storage', 'other'
    )),
    owner_name VARCHAR(255),
    owner_email VARCHAR(255),
    owner_phone VARCHAR(50),
    tenant_name VARCHAR(255),
    tenant_email VARCHAR(255),
    tenant_phone VARCHAR(50),
    smartbuilding_unit_id VARCHAR(100),
    mda_unit_id VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(scheme_id, unit_number)
);

CREATE INDEX idx_units_scheme ON scheme_units(scheme_id);
CREATE INDEX idx_units_owner_email ON scheme_units(scheme_id, owner_email);
CREATE INDEX idx_units_owner_phone ON scheme_units(scheme_id, owner_phone);
CREATE INDEX idx_units_tenant_email ON scheme_units(scheme_id, tenant_email);

-- KNOWLEDGE BASE — DOCUMENTS
CREATE TABLE knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id UUID NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        'conduct_rules', 'management_rules', 'minutes', 'financials',
        'insurance', 'maintenance_plan', 'trustee_info', 'levy_schedule',
        'faq', 'architectural_guidelines', 'general'
    )),
    title VARCHAR(500) NOT NULL,
    original_filename VARCHAR(500),
    file_path VARCHAR(1000),
    content_text TEXT,
    content_hash VARCHAR(64),
    page_count INTEGER,
    chunk_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    effective_date DATE,
    expiry_date DATE,
    uploaded_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_docs_scheme ON knowledge_documents(scheme_id);
CREATE INDEX idx_docs_type ON knowledge_documents(scheme_id, document_type);

-- KNOWLEDGE BASE — VECTOR CHUNKS
CREATE TABLE knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    scheme_id UUID NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(1536),
    token_count INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chunks_scheme ON knowledge_chunks(scheme_id);
CREATE INDEX idx_chunks_doc ON knowledge_chunks(document_id);
CREATE INDEX idx_chunks_embedding ON knowledge_chunks
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- USER VERIFICATION
CREATE TABLE verified_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id UUID NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES scheme_units(id),
    display_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'owner', 'tenant', 'trustee', 'managing_agent'
    )),
    verification_method VARCHAR(50),
    verified_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_verified_email ON verified_users(scheme_id, email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX idx_verified_phone ON verified_users(scheme_id, phone) WHERE phone IS NOT NULL;

-- CONVERSATIONS & MESSAGES
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verified_user_id UUID REFERENCES verified_users(id),
    scheme_id UUID REFERENCES schemes(id),
    channel VARCHAR(20) NOT NULL CHECK (channel IN (
        'web', 'whatsapp', 'telegram', 'smartbuilding'
    )),
    channel_user_id VARCHAR(255),
    state VARCHAR(50) DEFAULT 'awaiting_scheme' CHECK (state IN (
        'awaiting_scheme', 'scheme_lookup', 'scheme_confirmed',
        'awaiting_identity', 'awaiting_verify', 'verified',
        'verification_failed', 'manual_escalation', 'session_expired'
    )),
    session_context JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    transcript_emailed BOOLEAN DEFAULT false,
    message_count INTEGER DEFAULT 0,
    token_count INTEGER DEFAULT 0
);

CREATE INDEX idx_convos_scheme ON conversations(scheme_id);
CREATE INDEX idx_convos_channel_user ON conversations(channel, channel_user_id);
CREATE INDEX idx_convos_activity ON conversations(last_activity_at DESC);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    tool_calls JSONB,
    tool_results JSONB,
    token_count INTEGER,
    sources JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_convo ON messages(conversation_id, created_at);

-- OTP VERIFICATION
CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id),
    target VARCHAR(255) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    delivery_method VARCHAR(10) NOT NULL CHECK (delivery_method IN ('email', 'sms')),
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AGENT CONFIGURATION
CREATE TABLE agent_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id UUID NOT NULL UNIQUE REFERENCES schemes(id) ON DELETE CASCADE,
    greeting_message TEXT,
    personality_prompt TEXT,
    fallback_message TEXT DEFAULT 'I don''t have that information right now. Please contact your managing agent for assistance.',
    escalation_auto_threshold INTEGER DEFAULT 3,
    allowed_topics JSONB DEFAULT '[]',
    blocked_topics JSONB DEFAULT '[]',
    business_hours JSONB,
    after_hours_message TEXT,
    max_conversation_turns INTEGER DEFAULT 50,
    enable_maintenance_logging BOOLEAN DEFAULT true,
    enable_levy_queries BOOLEAN DEFAULT true,
    enable_transcript_email BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
