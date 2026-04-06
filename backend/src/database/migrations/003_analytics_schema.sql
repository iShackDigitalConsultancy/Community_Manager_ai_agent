CREATE TABLE analytics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id UUID REFERENCES schemes(id),
    date DATE NOT NULL,
    total_conversations INTEGER DEFAULT 0,
    verified_conversations INTEGER DEFAULT 0,
    failed_verifications INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    avg_messages_per_conversation NUMERIC(5,2),
    escalations_created INTEGER DEFAULT 0,
    escalations_resolved INTEGER DEFAULT 0,
    transcripts_emailed INTEGER DEFAULT 0,
    maintenance_requests_logged INTEGER DEFAULT 0,
    knowledge_miss_count INTEGER DEFAULT 0,
    knowledge_hit_count INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER,
    avg_retrieval_confidence NUMERIC(4,3),
    unique_users INTEGER DEFAULT 0,
    channel_breakdown JSONB DEFAULT '{}',
    top_query_categories JSONB DEFAULT '[]',
    top_unanswered_queries JSONB DEFAULT '[]',
    total_input_tokens INTEGER DEFAULT 0,
    total_output_tokens INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(scheme_id, date)
);

CREATE INDEX idx_analytics_scheme_date ON analytics_daily(scheme_id, date DESC);
