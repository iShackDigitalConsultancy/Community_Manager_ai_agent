-- ADD ID NUMBER FOR TENANT AUTH
ALTER TABLE scheme_units ADD COLUMN IF NOT EXISTS tenant_id_number VARCHAR(100);
ALTER TABLE scheme_units ADD COLUMN IF NOT EXISTS owner_id_number VARCHAR(100);

-- INDEX FOR AUTH LOOKUPS
CREATE INDEX IF NOT EXISTS idx_units_tenant_auth 
ON scheme_units(scheme_id, unit_number, tenant_id_number);
