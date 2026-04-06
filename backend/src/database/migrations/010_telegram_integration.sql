-- Migration: 010_telegram_integration.sql

-- Add telegram bot token to schemes (1 bot per scheme)
ALTER TABLE schemes ADD COLUMN IF NOT EXISTS telegram_bot_token VARCHAR(255);

-- Create a table to map Telegram chat_ids to our system's conversations
CREATE TABLE IF NOT EXISTS telegram_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_chat_id BIGINT UNIQUE NOT NULL,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    scheme_id UUID NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast webhook lookups
CREATE INDEX IF NOT EXISTS idx_telegram_chat_id ON telegram_conversations(telegram_chat_id);
