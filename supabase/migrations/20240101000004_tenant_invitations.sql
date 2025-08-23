-- Tenant invitations table for user invitations
CREATE TABLE IF NOT EXISTS tenant_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    invited_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- Enable RLS on tenant_invitations
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant_invitations
CREATE POLICY "Users can view invitations in their tenant" ON tenant_invitations
    FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert invitations in their tenant" ON tenant_invitations
    FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update invitations in their tenant" ON tenant_invitations
    FOR UPDATE USING (tenant_id = get_user_tenant_id());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_tenant_id ON tenant_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email ON tenant_invitations(email);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_expires_at ON tenant_invitations(expires_at);