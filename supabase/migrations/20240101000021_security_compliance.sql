-- Security and Compliance Features Migration
-- This migration implements audit logging, data retention policies, and GDPR compliance features

-- Create audit log table for tracking all data changes
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    session_id TEXT
);

-- Create indexes for efficient audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation ON audit_logs(operation);

-- Enable RLS on audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy for audit logs - users can only see their tenant's audit logs
CREATE POLICY "Users can view their tenant's audit logs" ON audit_logs
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
        )
    );

-- Create data retention policies table
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    retention_days INTEGER NOT NULL CHECK (retention_days > 0),
    policy_type TEXT NOT NULL CHECK (policy_type IN ('soft_delete', 'hard_delete', 'archive')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, table_name)
);

-- Enable RLS on data retention policies
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;

-- RLS policy for data retention policies
CREATE POLICY "Users can manage their tenant's retention policies" ON data_retention_policies
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
        )
    );

-- Create GDPR data export requests table
CREATE TABLE IF NOT EXISTS gdpr_export_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    request_type TEXT NOT NULL CHECK (request_type IN ('data_export', 'data_deletion')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    export_url TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on GDPR export requests
ALTER TABLE gdpr_export_requests ENABLE ROW LEVEL SECURITY;

-- RLS policy for GDPR export requests
CREATE POLICY "Users can manage their own GDPR requests" ON gdpr_export_requests
    FOR ALL USING (user_id = auth.uid());

-- Create security events table for tracking security-related activities
CREATE TABLE IF NOT EXISTS security_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for security events
CREATE INDEX IF NOT EXISTS idx_security_events_tenant_id ON security_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);

-- Enable RLS on security events
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- RLS policy for security events
CREATE POLICY "Users can view their tenant's security events" ON security_events
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
        )
    );

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    tenant_id_val UUID;
    user_email_val TEXT;
    user_agent_val TEXT;
    ip_address_val INET;
    session_id_val TEXT;
BEGIN
    -- Extract tenant_id from the record
    IF TG_OP = 'DELETE' THEN
        tenant_id_val := OLD.tenant_id;
    ELSE
        tenant_id_val := NEW.tenant_id;
    END IF;

    -- Get user context from current session
    SELECT 
        COALESCE(current_setting('app.user_email', true), ''),
        COALESCE(current_setting('app.user_agent', true), ''),
        COALESCE(current_setting('app.ip_address', true), '')::INET,
        COALESCE(current_setting('app.session_id', true), '')
    INTO user_email_val, user_agent_val, ip_address_val, session_id_val;

    -- Insert audit log record
    INSERT INTO audit_logs (
        tenant_id,
        table_name,
        record_id,
        operation,
        old_values,
        new_values,
        user_id,
        user_email,
        ip_address,
        user_agent,
        session_id
    ) VALUES (
        tenant_id_val,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id
            ELSE NEW.id
        END,
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
        auth.uid(),
        user_email_val,
        ip_address_val,
        user_agent_val,
        session_id_val
    );

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for key tables
CREATE TRIGGER audit_conversations_trigger
    AFTER INSERT OR UPDATE OR DELETE ON conversations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_keywords_trigger
    AFTER INSERT OR UPDATE OR DELETE ON keywords
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_integrations_trigger
    AFTER INSERT OR UPDATE OR DELETE ON integrations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_alerts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON alerts
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_tags_trigger
    AFTER INSERT OR UPDATE OR DELETE ON tags
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_reports_trigger
    AFTER INSERT OR UPDATE OR DELETE ON reports
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    p_tenant_id UUID,
    p_event_type TEXT,
    p_severity TEXT,
    p_description TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
    user_agent_val TEXT;
    ip_address_val INET;
BEGIN
    -- Get user context
    SELECT 
        COALESCE(current_setting('app.user_agent', true), ''),
        COALESCE(current_setting('app.ip_address', true), '')::INET
    INTO user_agent_val, ip_address_val;

    INSERT INTO security_events (
        tenant_id,
        user_id,
        event_type,
        severity,
        description,
        ip_address,
        user_agent,
        metadata
    ) VALUES (
        p_tenant_id,
        auth.uid(),
        p_event_type,
        p_severity,
        p_description,
        ip_address_val,
        user_agent_val,
        p_metadata
    ) RETURNING id INTO event_id;

    RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply data retention policies
CREATE OR REPLACE FUNCTION apply_data_retention()
RETURNS INTEGER AS $$
DECLARE
    policy_record RECORD;
    deleted_count INTEGER := 0;
    total_deleted INTEGER := 0;
BEGIN
    -- Loop through active retention policies
    FOR policy_record IN 
        SELECT * FROM data_retention_policies 
        WHERE is_active = true
    LOOP
        -- Apply retention based on policy type
        CASE policy_record.policy_type
            WHEN 'soft_delete' THEN
                -- Soft delete by setting deleted_at timestamp
                EXECUTE format(
                    'UPDATE %I SET deleted_at = NOW() 
                     WHERE tenant_id = $1 
                     AND deleted_at IS NULL 
                     AND created_at < NOW() - INTERVAL ''%s days''',
                    policy_record.table_name,
                    policy_record.retention_days
                ) USING policy_record.tenant_id;
                
                GET DIAGNOSTICS deleted_count = ROW_COUNT;
                
            WHEN 'hard_delete' THEN
                -- Hard delete records
                EXECUTE format(
                    'DELETE FROM %I 
                     WHERE tenant_id = $1 
                     AND created_at < NOW() - INTERVAL ''%s days''',
                    policy_record.table_name,
                    policy_record.retention_days
                ) USING policy_record.tenant_id;
                
                GET DIAGNOSTICS deleted_count = ROW_COUNT;
                
            WHEN 'archive' THEN
                -- Move to archive table (implementation depends on specific needs)
                -- This is a placeholder for archive functionality
                deleted_count := 0;
        END CASE;
        
        total_deleted := total_deleted + deleted_count;
        
        -- Log the retention action
        PERFORM log_security_event(
            policy_record.tenant_id,
            'data_retention_applied',
            'low',
            format('Applied %s retention policy to %s, affected %s records', 
                   policy_record.policy_type, 
                   policy_record.table_name, 
                   deleted_count),
            jsonb_build_object(
                'table_name', policy_record.table_name,
                'policy_type', policy_record.policy_type,
                'retention_days', policy_record.retention_days,
                'affected_records', deleted_count
            )
        );
    END LOOP;
    
    RETURN total_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to export user data for GDPR compliance
CREATE OR REPLACE FUNCTION export_user_data(p_user_id UUID, p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
    user_data JSONB := '{}'::jsonb;
    conversations_data JSONB;
    keywords_data JSONB;
    alerts_data JSONB;
    tags_data JSONB;
    reports_data JSONB;
BEGIN
    -- Export user profile data
    SELECT to_jsonb(u.*) INTO user_data
    FROM auth.users u
    WHERE u.id = p_user_id;
    
    -- Export conversations data
    SELECT jsonb_agg(to_jsonb(c.*)) INTO conversations_data
    FROM conversations c
    WHERE c.tenant_id = p_tenant_id;
    
    -- Export keywords data
    SELECT jsonb_agg(to_jsonb(k.*)) INTO keywords_data
    FROM keywords k
    WHERE k.tenant_id = p_tenant_id;
    
    -- Export alerts data
    SELECT jsonb_agg(to_jsonb(a.*)) INTO alerts_data
    FROM alerts a
    WHERE a.tenant_id = p_tenant_id;
    
    -- Export tags data
    SELECT jsonb_agg(to_jsonb(t.*)) INTO tags_data
    FROM tags t
    WHERE t.tenant_id = p_tenant_id;
    
    -- Export reports data
    SELECT jsonb_agg(to_jsonb(r.*)) INTO reports_data
    FROM reports r
    WHERE r.tenant_id = p_tenant_id;
    
    -- Combine all data
    user_data := jsonb_build_object(
        'user_profile', user_data,
        'conversations', COALESCE(conversations_data, '[]'::jsonb),
        'keywords', COALESCE(keywords_data, '[]'::jsonb),
        'alerts', COALESCE(alerts_data, '[]'::jsonb),
        'tags', COALESCE(tags_data, '[]'::jsonb),
        'reports', COALESCE(reports_data, '[]'::jsonb),
        'export_timestamp', to_jsonb(NOW()),
        'export_version', '1.0'
    );
    
    RETURN user_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete user data for GDPR compliance
CREATE OR REPLACE FUNCTION delete_user_data(p_user_id UUID, p_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Delete user's data across all tables
    DELETE FROM conversations WHERE tenant_id = p_tenant_id;
    DELETE FROM keywords WHERE tenant_id = p_tenant_id;
    DELETE FROM alerts WHERE tenant_id = p_tenant_id;
    DELETE FROM tags WHERE tenant_id = p_tenant_id;
    DELETE FROM reports WHERE tenant_id = p_tenant_id;
    DELETE FROM integrations WHERE tenant_id = p_tenant_id;
    DELETE FROM audit_logs WHERE tenant_id = p_tenant_id;
    DELETE FROM security_events WHERE tenant_id = p_tenant_id;
    DELETE FROM gdpr_export_requests WHERE tenant_id = p_tenant_id;
    DELETE FROM data_retention_policies WHERE tenant_id = p_tenant_id;
    
    -- Log the deletion
    PERFORM log_security_event(
        p_tenant_id,
        'gdpr_data_deletion',
        'high',
        'User data deleted for GDPR compliance',
        jsonb_build_object('user_id', p_user_id, 'tenant_id', p_tenant_id)
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create default data retention policies for new tenants
CREATE OR REPLACE FUNCTION create_default_retention_policies(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO data_retention_policies (tenant_id, table_name, retention_days, policy_type)
    VALUES 
        (p_tenant_id, 'conversations', 2555, 'soft_delete'), -- 7 years
        (p_tenant_id, 'audit_logs', 2555, 'hard_delete'),    -- 7 years
        (p_tenant_id, 'security_events', 1095, 'hard_delete'), -- 3 years
        (p_tenant_id, 'gdpr_export_requests', 90, 'hard_delete') -- 90 days
    ON CONFLICT (tenant_id, table_name) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default retention policies for new tenants
CREATE OR REPLACE FUNCTION create_tenant_retention_policies_trigger()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_default_retention_policies(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_retention_policies_trigger
    AFTER INSERT ON tenants
    FOR EACH ROW EXECUTE FUNCTION create_tenant_retention_policies_trigger();

-- Grant necessary permissions
GRANT SELECT ON audit_logs TO authenticated;
GRANT SELECT ON data_retention_policies TO authenticated;
GRANT ALL ON gdpr_export_requests TO authenticated;
GRANT SELECT ON security_events TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_deleted_at ON conversations(deleted_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(timestamp);

COMMENT ON TABLE audit_logs IS 'Tracks all data changes for compliance and security auditing';
COMMENT ON TABLE data_retention_policies IS 'Defines data retention policies for GDPR compliance';
COMMENT ON TABLE gdpr_export_requests IS 'Tracks GDPR data export and deletion requests';
COMMENT ON TABLE security_events IS 'Logs security-related events and activities';