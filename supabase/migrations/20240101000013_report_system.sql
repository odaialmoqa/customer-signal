-- Report System Migration
-- This migration creates tables for report configuration, templates, and generation

-- Report Templates Table
CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('executive-summary', 'detailed-analytics', 'sentiment-analysis', 'keyword-performance', 'platform-comparison', 'trend-analysis', 'custom')),
    sections JSONB NOT NULL DEFAULT '[]',
    default_metrics JSONB NOT NULL DEFAULT '[]',
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Report Configurations Table
CREATE TABLE IF NOT EXISTS report_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    template_type TEXT NOT NULL REFERENCES report_templates(type),
    data_range JSONB NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}',
    metrics JSONB NOT NULL DEFAULT '[]',
    visualizations JSONB NOT NULL DEFAULT '[]',
    format JSONB NOT NULL DEFAULT '["pdf"]',
    schedule JSONB,
    recipients JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Report Generation Jobs Table
CREATE TABLE IF NOT EXISTS report_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_config_id UUID NOT NULL REFERENCES report_configs(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')) DEFAULT 'queued',
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generated Reports Table
CREATE TABLE IF NOT EXISTS generated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES report_generation_jobs(id) ON DELETE CASCADE,
    config_id UUID NOT NULL REFERENCES report_configs(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    format TEXT NOT NULL CHECK (format IN ('pdf', 'excel', 'csv')),
    status TEXT NOT NULL CHECK (status IN ('generating', 'completed', 'failed')) DEFAULT 'generating',
    file_path TEXT,
    file_size BIGINT,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    download_count INTEGER NOT NULL DEFAULT 0,
    error TEXT
);

-- Keyword Performance View (for reporting)
CREATE OR REPLACE VIEW keyword_performance AS
SELECT 
    k.id,
    k.keyword,
    k.tenant_id,
    COUNT(c.id) as mentions,
    AVG(CASE 
        WHEN c.sentiment = 'positive' THEN 1 
        WHEN c.sentiment = 'negative' THEN -1 
        ELSE 0 
    END) as avg_sentiment,
    COUNT(CASE WHEN c.sentiment = 'positive' THEN 1 END) as positive_mentions,
    COUNT(CASE WHEN c.sentiment = 'negative' THEN 1 END) as negative_mentions,
    COUNT(CASE WHEN c.sentiment = 'neutral' THEN 1 END) as neutral_mentions,
    DATE_TRUNC('day', c.created_at) as date
FROM keywords k
LEFT JOIN conversations c ON k.keyword = ANY(c.keywords) 
    AND c.tenant_id = k.tenant_id
WHERE k.is_active = true
GROUP BY k.id, k.keyword, k.tenant_id, DATE_TRUNC('day', c.created_at);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_report_configs_tenant_id ON report_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_report_configs_template_type ON report_configs(template_type);
CREATE INDEX IF NOT EXISTS idx_report_generation_jobs_config_id ON report_generation_jobs(report_config_id);
CREATE INDEX IF NOT EXISTS idx_report_generation_jobs_status ON report_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_generated_reports_tenant_id ON generated_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_config_id ON generated_reports(config_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_expires_at ON generated_reports(expires_at);

-- RLS Policies
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;

-- Report Templates - System templates are visible to all, custom templates only to creator
CREATE POLICY "report_templates_select" ON report_templates
    FOR SELECT USING (
        is_system = true OR 
        EXISTS (
            SELECT 1 FROM tenants t 
            WHERE t.id = auth.jwt() ->> 'tenant_id'::text
        )
    );

CREATE POLICY "report_templates_insert" ON report_templates
    FOR INSERT WITH CHECK (
        is_system = false AND
        EXISTS (
            SELECT 1 FROM tenants t 
            WHERE t.id = auth.jwt() ->> 'tenant_id'::text
        )
    );

-- Report Configs - Tenant isolation
CREATE POLICY "report_configs_tenant_isolation" ON report_configs
    FOR ALL USING (tenant_id::text = auth.jwt() ->> 'tenant_id');

-- Report Generation Jobs - Tenant isolation
CREATE POLICY "report_generation_jobs_tenant_isolation" ON report_generation_jobs
    FOR ALL USING (tenant_id::text = auth.jwt() ->> 'tenant_id');

-- Generated Reports - Tenant isolation
CREATE POLICY "generated_reports_tenant_isolation" ON generated_reports
    FOR ALL USING (tenant_id::text = auth.jwt() ->> 'tenant_id');

-- Insert default system templates
INSERT INTO report_templates (name, description, type, sections, default_metrics, is_system) VALUES
(
    'Executive Summary',
    'High-level overview with key metrics and insights for leadership',
    'executive-summary',
    '[
        {"id": "summary", "title": "Executive Summary", "type": "summary", "order": 1},
        {"id": "key_metrics", "title": "Key Metrics", "type": "chart", "order": 2},
        {"id": "sentiment_overview", "title": "Sentiment Overview", "type": "chart", "order": 3},
        {"id": "insights", "title": "Key Insights", "type": "insights", "order": 4}
    ]',
    '["conversation-volume", "sentiment-distribution", "platform-breakdown"]',
    true
),
(
    'Detailed Analytics',
    'Comprehensive analysis with detailed charts and data tables',
    'detailed-analytics',
    '[
        {"id": "overview", "title": "Overview", "type": "summary", "order": 1},
        {"id": "volume_trends", "title": "Conversation Volume Trends", "type": "chart", "order": 2},
        {"id": "sentiment_analysis", "title": "Sentiment Analysis", "type": "chart", "order": 3},
        {"id": "keyword_performance", "title": "Keyword Performance", "type": "table", "order": 4},
        {"id": "platform_breakdown", "title": "Platform Breakdown", "type": "chart", "order": 5},
        {"id": "top_mentions", "title": "Top Mentions", "type": "table", "order": 6}
    ]',
    '["conversation-volume", "sentiment-distribution", "keyword-performance", "platform-breakdown", "engagement-metrics", "top-mentions"]',
    true
),
(
    'Sentiment Analysis Report',
    'Focused analysis of sentiment trends and emotional insights',
    'sentiment-analysis',
    '[
        {"id": "sentiment_summary", "title": "Sentiment Summary", "type": "summary", "order": 1},
        {"id": "sentiment_trends", "title": "Sentiment Trends Over Time", "type": "chart", "order": 2},
        {"id": "sentiment_by_platform", "title": "Sentiment by Platform", "type": "chart", "order": 3},
        {"id": "negative_mentions", "title": "Negative Mentions Analysis", "type": "table", "order": 4}
    ]',
    '["sentiment-distribution", "trend-analysis"]',
    true
),
(
    'Keyword Performance Report',
    'Analysis of keyword effectiveness and mention tracking',
    'keyword-performance',
    '[
        {"id": "keyword_overview", "title": "Keyword Overview", "type": "summary", "order": 1},
        {"id": "keyword_trends", "title": "Keyword Mention Trends", "type": "chart", "order": 2},
        {"id": "keyword_sentiment", "title": "Keyword Sentiment Analysis", "type": "chart", "order": 3},
        {"id": "keyword_table", "title": "Detailed Keyword Performance", "type": "table", "order": 4}
    ]',
    '["keyword-performance", "sentiment-distribution"]',
    true
);

-- Scheduled Reports Table
CREATE TABLE IF NOT EXISTS scheduled_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_config_id UUID NOT NULL REFERENCES report_configs(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    next_run_at TIMESTAMPTZ NOT NULL,
    last_run_at TIMESTAMPTZ,
    schedule_config JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scheduled Report Errors Table
CREATE TABLE IF NOT EXISTS scheduled_report_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheduled_report_id UUID NOT NULL REFERENCES scheduled_reports(id) ON DELETE CASCADE,
    error_message TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email Logs Table
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES generated_reports(id) ON DELETE CASCADE,
    recipients JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
    error_message TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Additional indexes for scheduling
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(next_run_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_tenant_id ON scheduled_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_report_errors_occurred_at ON scheduled_report_errors(occurred_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);

-- RLS Policies for new tables
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_report_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduled_reports_tenant_isolation" ON scheduled_reports
    FOR ALL USING (tenant_id::text = auth.jwt() ->> 'tenant_id');

CREATE POLICY "scheduled_report_errors_tenant_isolation" ON scheduled_report_errors
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM scheduled_reports sr 
            WHERE sr.id = scheduled_report_id 
            AND sr.tenant_id::text = auth.jwt() ->> 'tenant_id'
        )
    );

CREATE POLICY "email_logs_tenant_isolation" ON email_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM generated_reports gr 
            WHERE gr.id = report_id 
            AND gr.tenant_id::text = auth.jwt() ->> 'tenant_id'
        )
    );

-- Function to clean up expired reports
CREATE OR REPLACE FUNCTION cleanup_expired_reports()
RETURNS void AS $$
BEGIN
    DELETE FROM generated_reports 
    WHERE expires_at < NOW() AND status = 'completed';
    
    -- Also clean up old email logs (older than 90 days)
    DELETE FROM email_logs 
    WHERE sent_at < NOW() - INTERVAL '90 days';
    
    -- Clean up old error logs (older than 30 days)
    DELETE FROM scheduled_report_errors 
    WHERE occurred_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function to get pending scheduled reports
CREATE OR REPLACE FUNCTION get_pending_scheduled_reports()
RETURNS TABLE (
    id UUID,
    report_config_id UUID,
    tenant_id UUID,
    next_run_at TIMESTAMPTZ,
    schedule_config JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sr.id,
        sr.report_config_id,
        sr.tenant_id,
        sr.next_run_at,
        sr.schedule_config
    FROM scheduled_reports sr
    WHERE sr.is_active = true 
    AND sr.next_run_at <= NOW()
    ORDER BY sr.next_run_at;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup function (would be called by a cron job)
-- This is a placeholder - actual scheduling would be done via pg_cron or external scheduler