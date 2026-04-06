-- ADMIN USERS & RBAC
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'super_admin', 'scheme_admin', 'scheme_viewer'
    )),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE admin_scheme_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    scheme_id UUID NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(admin_user_id, scheme_id)
);

-- KNOWLEDGE TEMPLATES
CREATE TABLE knowledge_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    scheme_type VARCHAR(50),
    template_documents JSONB NOT NULL,
    checklist JSONB NOT NULL,
    created_by UUID REFERENCES admin_users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ONBOARDING PROGRESS
CREATE TABLE scheme_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id UUID NOT NULL UNIQUE REFERENCES schemes(id) ON DELETE CASCADE,
    template_id UUID REFERENCES knowledge_templates(id),
    status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN (
        'in_progress', 'ready_for_review', 'approved', 'live'
    )),
    checklist_progress JSONB DEFAULT '{}',
    knowledge_score INTEGER DEFAULT 0,
    current_step INTEGER DEFAULT 1,
    reviewed_by UUID REFERENCES admin_users(id),
    reviewed_at TIMESTAMPTZ,
    go_live_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ESCALATIONS
CREATE TABLE escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id),
    scheme_id UUID NOT NULL REFERENCES schemes(id),
    reason TEXT NOT NULL,
    agent_summary TEXT,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN (
        'low', 'medium', 'high', 'emergency'
    )),
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN (
        'open', 'in_progress', 'resolved', 'dismissed'
    )),
    assigned_to UUID REFERENCES admin_users(id),
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_escalations_scheme ON escalations(scheme_id, status);

-- AUDIT LOG
CREATE TABLE agent_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES admin_users(id),
    conversation_id UUID REFERENCES conversations(id),
    scheme_id UUID REFERENCES schemes(id),
    action VARCHAR(100) NOT NULL,
    detail JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_scheme ON agent_audit_log(scheme_id, created_at DESC);
CREATE INDEX idx_audit_action ON agent_audit_log(action, created_at DESC);
