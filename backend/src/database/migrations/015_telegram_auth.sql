-- Migration: 015_telegram_auth.sql

-- Add columns to telegram_conversations for tracking authentication state
ALTER TABLE telegram_conversations ADD COLUMN IF NOT EXISTS auth_status VARCHAR(50) DEFAULT 'unverified';
ALTER TABLE telegram_conversations ADD COLUMN IF NOT EXISTS temp_contact_info VARCHAR(255);
ALTER TABLE telegram_conversations ADD COLUMN IF NOT EXISTS tenant_unit_id UUID REFERENCES scheme_units(id) ON DELETE SET NULL;

-- Auth statuses can be: 'unverified', 'pending_otp', 'verified'
