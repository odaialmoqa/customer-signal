-- Create monitoring_jobs table
CREATE TABLE IF NOT EXISTS monitoring_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    frequency TEXT NOT NULL CHECK (frequency IN ('realtime', 'hourly', 'daily')),
    platforms TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY, -- Platform-specific ID (e.g., 'reddit_abc123')
    keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    platform TEXT NOT NULL,
    url TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    engagement_metrics JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    sentiment_score DECIMAL(3,2), -- Will be populated by sentiment analysis
    sentiment_label TEXT CHECK (sentiment_label IN ('positive', 'negative', 'neutral')),
    tags TEXT[] DEFAULT '{}',
    is_processed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_monitoring_jobs_tenant_id ON monitoring_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_jobs_keyword_id ON monitoring_jobs(keyword_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_jobs_next_run ON monitoring_jobs(next_run) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_conversations_tenant_id ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_keyword_id ON conversations(keyword_id);
CREATE INDEX IF NOT EXISTS idx_conversations_platform ON conversations(platform);
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp);
CREATE INDEX IF NOT EXISTS idx_conversations_sentiment ON conversations(sentiment_label);
CREATE INDEX IF NOT EXISTS idx_conversations_unprocessed ON conversations(is_processed) WHERE is_processed = false;

-- Create full-text search index for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_content_search ON conversations USING gin(to_tsvector('english', content));

-- Enable Row Level Security
ALTER TABLE monitoring_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for monitoring_jobs
CREATE POLICY "Users can view their tenant's monitoring jobs" ON monitoring_jobs
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert monitoring jobs for their tenant" ON monitoring_jobs
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their tenant's monitoring jobs" ON monitoring_jobs
    FOR UPDATE USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their tenant's monitoring jobs" ON monitoring_jobs
    FOR DELETE USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for conversations
CREATE POLICY "Users can view their tenant's conversations" ON conversations
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can insert conversations" ON conversations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update conversations" ON conversations
    FOR UPDATE USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_monitoring_jobs_updated_at 
    BEFORE UPDATE ON monitoring_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create monitoring job when keyword is created
CREATE OR REPLACE FUNCTION create_monitoring_job_for_keyword()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = true THEN
        INSERT INTO monitoring_jobs (
            keyword_id,
            tenant_id,
            frequency,
            platforms,
            next_run
        ) VALUES (
            NEW.id,
            NEW.tenant_id,
            NEW.monitoring_frequency,
            NEW.platforms,
            NOW() + INTERVAL '5 minutes' -- Start monitoring in 5 minutes
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic monitoring job creation
CREATE TRIGGER create_monitoring_job_trigger
    AFTER INSERT ON keywords
    FOR EACH ROW EXECUTE FUNCTION create_monitoring_job_for_keyword();

-- Create function to update monitoring job when keyword is updated
CREATE OR REPLACE FUNCTION update_monitoring_job_for_keyword()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the monitoring job when keyword is updated
    UPDATE monitoring_jobs 
    SET 
        frequency = NEW.monitoring_frequency,
        platforms = NEW.platforms,
        is_active = NEW.is_active,
        updated_at = NOW()
    WHERE keyword_id = NEW.id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for monitoring job updates
CREATE TRIGGER update_monitoring_job_trigger
    AFTER UPDATE ON keywords
    FOR EACH ROW EXECUTE FUNCTION update_monitoring_job_for_keyword();