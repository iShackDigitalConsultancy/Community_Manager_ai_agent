-- MIGRATION: 013_api_hub_company_link.sql

ALTER TABLE api_integrations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='api_integrations' AND column_name='company_name') THEN
        EXECUTE '
        INSERT INTO companies (name, status)
        SELECT DISTINCT ai.company_name, ''active''
        FROM api_integrations ai
        WHERE NOT EXISTS (SELECT 1 FROM companies c WHERE c.name = ai.company_name)
          AND ai.company_name IS NOT NULL;
        ';

        EXECUTE '
        UPDATE api_integrations ai
        SET company_id = c.id
        FROM companies c
        WHERE ai.company_name = c.name;
        ';

        EXECUTE 'ALTER TABLE api_integrations ALTER COLUMN company_id SET NOT NULL';
        EXECUTE 'ALTER TABLE api_integrations DROP COLUMN company_name';
    END IF;
END $$;

-- 4. Create an index
CREATE INDEX IF NOT EXISTS idx_api_integrations_company ON api_integrations(company_id);
-- Note: We do NOT enforce UNIQUE (company_id, provider) because a PM Company might have multiple disjoint profiles (e.g., separate SmartBuilding community IDs).
