-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id ON user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_keywords_tenant_id ON keywords(tenant_id);
CREATE INDEX IF NOT EXISTS idx_keywords_term ON keywords(term);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_id ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_platform ON conversations(platform);
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp);
CREATE INDEX IF NOT EXISTS idx_conversations_sentiment ON conversations(sentiment);
CREATE INDEX IF NOT EXISTS idx_integrations_tenant_id ON integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alerts_tenant_id ON alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reports_tenant_id ON reports(tenant_id);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_conversations_content_fts ON conversations USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_conversations_author_fts ON conversations USING gin(to_tsvector('english', author));

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_platform_timestamp ON conversations(tenant_id, platform, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_sentiment_timestamp ON conversations(tenant_id, sentiment, timestamp DESC);

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_keywords_updated_at ON keywords;
CREATE TRIGGER update_keywords_updated_at BEFORE UPDATE ON keywords
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_integrations_updated_at ON integrations;
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reports_updated_at ON reports;
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();