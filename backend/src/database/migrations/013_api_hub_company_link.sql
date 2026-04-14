-- MIGRATION: 013_api_hub_company_link.sql

-- 1. Add company_id to api_integrations
ALTER TABLE api_integrations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- 2. Migrate existing integrations by creating companies if they don't exist
INSERT INTO companies (name, status)
SELECT DISTINCT ai.company_name, 'active'
FROM api_integrations ai
WHERE NOT EXISTS (SELECT 1 FROM companies c WHERE c.name = ai.company_name)
  AND ai.company_name IS NOT NULL;

-- Link them
UPDATE api_integrations ai
SET company_id = c.id
FROM companies c
WHERE ai.company_name = c.name;

-- 3. Enforce constraint and drop old column
ALTER TABLE api_integrations ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE api_integrations DROP COLUMN IF EXISTS company_name;

-- 4. Create an index
CREATE INDEX IF NOT EXISTS idx_api_integrations_company ON api_integrations(company_id);
-- Note: We do NOT enforce UNIQUE (company_id, provider) because a PM Company might have multiple disjoint profiles (e.g., separate SmartBuilding community IDs).
