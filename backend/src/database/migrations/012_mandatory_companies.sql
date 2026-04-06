-- MIGRATION: 012_mandatory_companies.sql

-- 1. Insert 'iShack Ventures' if not exists
INSERT INTO companies (name, status) 
SELECT 'iShack Ventures', 'active' 
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name = 'iShack Ventures');

-- 2. Link existing schemes with NULL company_id to 'iShack Ventures'
UPDATE schemes 
SET company_id = (SELECT id FROM companies WHERE name = 'iShack Ventures' LIMIT 1)
WHERE company_id IS NULL;

-- 3. Enforce NOT NULL on company_id in schemes
ALTER TABLE schemes ALTER COLUMN company_id SET NOT NULL;
