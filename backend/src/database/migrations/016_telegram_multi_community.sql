-- Migration: 016_telegram_multi_community.sql

ALTER TABLE telegram_conversations ADD COLUMN IF NOT EXISTS admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL;
ALTER TABLE telegram_conversations ADD COLUMN IF NOT EXISTS active_role VARCHAR(50);
ALTER TABLE telegram_conversations ALTER COLUMN scheme_id DROP NOT NULL;
