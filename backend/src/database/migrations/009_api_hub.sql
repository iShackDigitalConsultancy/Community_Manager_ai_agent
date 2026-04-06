-- API Hub: Per-company integration credentials for SmartBuildingApp / MDA
-- Migration: 009_api_hub.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS api_integrations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name    VARCHAR(255)    NOT NULL,
    provider        VARCHAR(50)     NOT NULL DEFAULT 'smartbuildingapp',
    brand_id        VARCHAR(100)    NOT NULL,         -- appid header (e.g. "sm")
    client_id       VARCHAR(255)    NOT NULL,
    client_secret   VARCHAR(500)    NOT NULL,         -- encrypted at application level
    community_id    INTEGER,                          -- SmartBuilding communityId
    db_identifier   VARCHAR(255),                     -- MDA database GUID
    is_active       BOOLEAN         NOT NULL DEFAULT true,
    -- Sync state
    last_synced_at  TIMESTAMPTZ,
    sync_status     VARCHAR(50)     NOT NULL DEFAULT 'never',  -- never|running|success|error
    sync_error      TEXT,
    -- Token cache (to avoid re-authenticating on every request)
    token_cache     TEXT,
    token_expires   TIMESTAMPTZ,
    -- Metadata
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_api_integrations_provider ON api_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_api_integrations_active   ON api_integrations(is_active);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_api_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_api_integrations_updated_at ON api_integrations;
CREATE TRIGGER trg_api_integrations_updated_at
    BEFORE UPDATE ON api_integrations
    FOR EACH ROW EXECUTE FUNCTION update_api_integrations_updated_at();
