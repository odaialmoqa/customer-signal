-- Data Integration System Migration
-- This migration adds support for comprehensive data integration with external platforms

-- Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('data-imports', 'data-imports', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the data-imports bucket
CREATE POLICY "Users can upload files to their tenant folder" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'data-imports' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view files in their tenant folder" ON storage.objects
FOR SELECT USING (
  bucket_id = 'data-imports' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete files in their tenant folder" ON storage.objects
FOR DELETE USING (
  bucket_id = 'data-imports' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add indexes for better performance on integrations table
CREATE INDEX IF NOT EXISTS idx_integrations_tenant_type ON integrations(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);
CREATE INDEX IF NOT EXISTS idx_integrations_last_sync ON integrations(last_sync);

-- Add indexes for conversations table to support integration queries
CREATE INDEX IF NOT EXISTS idx_conversations_platform_external_id ON conversations(platform, external_id);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_platform ON conversations(tenant_id, platform);
CREATE INDEX IF NOT EXISTS idx_conversations_parent_id ON conversations(parent_conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp);

-- Create function to validate integration config based on type
CREATE OR REPLACE FUNCTION validate_integration_config(integration_type integration_type, config JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  CASE integration_type
    WHEN 'zendesk' THEN
      RETURN config ? 'subdomain' AND config ? 'email' AND config ? 'apiToken';
    WHEN 'salesforce' THEN
      RETURN config ? 'instanceUrl' AND config ? 'accessToken';
    WHEN 'hubspot' THEN
      RETURN config ? 'accessToken';
    WHEN 'intercom' THEN
      RETURN config ? 'accessToken';
    WHEN 'freshdesk' THEN
      RETURN config ? 'domain' AND config ? 'apiKey';
    WHEN 'csv' THEN
      RETURN config ? 'filePath';
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Add constraint to validate integration config
ALTER TABLE integrations 
ADD CONSTRAINT check_integration_config 
CHECK (validate_integration_config(type, config));

-- Create function to update integration last_sync timestamp
CREATE OR REPLACE FUNCTION update_integration_last_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.platform IN ('zendesk', 'salesforce', 'hubspot', 'intercom', 'freshdesk', 'csv') THEN
    -- Update the integration's last_sync timestamp when new conversations are added
    UPDATE integrations 
    SET last_sync = NOW()
    WHERE tenant_id = NEW.tenant_id 
      AND type = NEW.platform::integration_type
      AND status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update last_sync
CREATE TRIGGER trigger_update_integration_last_sync
  AFTER INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_last_sync();

-- Create function to clean up old integration data
CREATE OR REPLACE FUNCTION cleanup_old_integration_data(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete conversations older than specified days for CSV imports
  DELETE FROM conversations 
  WHERE platform = 'csv' 
    AND created_at < NOW() - INTERVAL '1 day' * days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log cleanup activity
  INSERT INTO integrations (tenant_id, type, name, config, status, created_by)
  VALUES (
    '00000000-0000-0000-0000-000000000000', -- System tenant
    'csv',
    'Cleanup Job',
    jsonb_build_object('deleted_records', deleted_count, 'cleanup_date', NOW()),
    'active',
    '00000000-0000-0000-0000-000000000000' -- System user
  );
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get integration statistics
CREATE OR REPLACE FUNCTION get_integration_stats(tenant_uuid UUID)
RETURNS TABLE (
  integration_type integration_type,
  integration_count BIGINT,
  total_conversations BIGINT,
  last_sync_date TIMESTAMP WITH TIME ZONE,
  active_integrations BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.type as integration_type,
    COUNT(i.id) as integration_count,
    COALESCE(c.conversation_count, 0) as total_conversations,
    MAX(i.last_sync) as last_sync_date,
    COUNT(i.id) FILTER (WHERE i.status = 'active') as active_integrations
  FROM integrations i
  LEFT JOIN (
    SELECT 
      platform,
      tenant_id,
      COUNT(*) as conversation_count
    FROM conversations 
    WHERE tenant_id = tenant_uuid
    GROUP BY platform, tenant_id
  ) c ON c.platform = i.type::text AND c.tenant_id = i.tenant_id
  WHERE i.tenant_id = tenant_uuid
  GROUP BY i.type, c.conversation_count;
END;
$$ LANGUAGE plpgsql;

-- Create view for integration dashboard
CREATE OR REPLACE VIEW integration_dashboard AS
SELECT 
  i.id,
  i.tenant_id,
  i.type,
  i.name,
  i.status,
  i.last_sync,
  i.error_message,
  i.created_at,
  COALESCE(c.conversation_count, 0) as conversation_count,
  COALESCE(c.latest_conversation, NULL) as latest_conversation_date,
  CASE 
    WHEN i.last_sync IS NULL THEN 'never'
    WHEN i.last_sync < NOW() - INTERVAL '1 day' THEN 'stale'
    WHEN i.last_sync < NOW() - INTERVAL '1 hour' THEN 'recent'
    ELSE 'current'
  END as sync_status
FROM integrations i
LEFT JOIN (
  SELECT 
    tenant_id,
    platform,
    COUNT(*) as conversation_count,
    MAX(timestamp) as latest_conversation
  FROM conversations
  GROUP BY tenant_id, platform
) c ON c.tenant_id = i.tenant_id AND c.platform = i.type::text;

-- Add RLS policy for integration dashboard view
CREATE POLICY "Users can view their tenant's integration dashboard" ON integrations
FOR SELECT USING (
  tenant_id IN (
    SELECT tenant_id 
    FROM user_profiles 
    WHERE id = auth.uid()
  )
);

-- Create function to validate CSV field mappings
CREATE OR REPLACE FUNCTION validate_csv_mapping(mapping JSONB, headers TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
  mapped_field TEXT;
BEGIN
  -- Check if all mapped fields exist in headers
  FOR mapped_field IN SELECT jsonb_array_elements_text(jsonb_agg(value)) FROM jsonb_each_text(mapping)
  LOOP
    IF NOT (mapped_field = ANY(headers)) THEN
      RETURN FALSE;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to process integration errors
CREATE OR REPLACE FUNCTION log_integration_error(
  integration_id UUID,
  error_message TEXT,
  error_context JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Update integration with error status
  UPDATE integrations 
  SET 
    status = 'error',
    error_message = log_integration_error.error_message,
    updated_at = NOW()
  WHERE id = integration_id;
  
  -- Log detailed error information
  INSERT INTO conversations (
    tenant_id,
    content,
    author,
    platform,
    external_id,
    tags,
    raw_data
  )
  SELECT 
    i.tenant_id,
    'Integration Error: ' || log_integration_error.error_message,
    'System',
    'system',
    'error_' || integration_id::text || '_' || extract(epoch from now())::text,
    ARRAY['error', 'integration'],
    jsonb_build_object(
      'integration_id', integration_id,
      'error_message', log_integration_error.error_message,
      'error_context', error_context,
      'timestamp', NOW()
    )
  FROM integrations i
  WHERE i.id = integration_id;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION validate_integration_config IS 'Validates integration configuration based on integration type';
COMMENT ON FUNCTION update_integration_last_sync IS 'Automatically updates integration last_sync when new conversations are imported';
COMMENT ON FUNCTION cleanup_old_integration_data IS 'Cleans up old CSV import data to manage storage';
COMMENT ON FUNCTION get_integration_stats IS 'Returns statistics for integrations by tenant';
COMMENT ON VIEW integration_dashboard IS 'Provides dashboard view of integration status and metrics';
COMMENT ON FUNCTION validate_csv_mapping IS 'Validates that CSV field mappings reference existing headers';
COMMENT ON FUNCTION log_integration_error IS 'Logs integration errors and updates integration status';