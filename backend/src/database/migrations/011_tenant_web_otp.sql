CREATE TABLE tenant_login_otp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_info VARCHAR(255) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenant_otp_contact ON tenant_login_otp(contact_info, created_at DESC);
