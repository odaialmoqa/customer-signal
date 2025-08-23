-- Data Processing Pipeline Migration
-- This migration sets up the infrastructure for automated data processing

-- Create processing jobs table
CREATE TABLE IF NOT EXISTS processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('sentiment_analysis', 'content_normalization', 'trend_analysis', 'data_cleanup')),
    data JSONB NOT NULL DEFAULT '{}',
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    result JSONB,
    error TEXT,
    processing_time_ms INTEGER,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Create indexes for processing jobs
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_type ON processing_jobs(type);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_priority ON processing_jobs(priority);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_tenant ON processing_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_created_at ON processing_jobs(created_at);

-- Create scheduled tasks table
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('sentiment_batch', 'trend_analysis', 'data_cleanup', 'report_generation')),
    schedule TEXT NOT NULL, -- cron expression or simple schedule
    enabled BOOLEAN NOT NULL DEFAULT true,
    config JSONB NOT NULL DEFAULT '{}',
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ,
    last_status TEXT CHECK (last_status IN ('completed', 'failed')),
    last_error TEXT,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for scheduled tasks
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run ON scheduled_tasks(next_run) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_tenant ON scheduled_tasks(tenant_id);

-- Create processing metrics table for monitoring
CREATE TABLE IF NOT EXISTS processing_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}',
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for processing metrics
CREATE INDEX IF NOT EXISTS idx_processing_metrics_type ON processing_metrics(type);
CREATE INDEX IF NOT EXISTS idx_processing_metrics_created_at ON processing_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_processing_metrics_tenant ON processing_metrics(tenant_id);

-- Add processing-related columns to conversations table if they don't exist
DO $$ 
BEGIN
    -- Add sentiment analysis columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'sentiment_analyzed_at') THEN
        ALTER TABLE conversations ADD COLUMN sentiment_analyzed_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'sentiment_keywords') THEN
        ALTER TABLE conversations ADD COLUMN sentiment_keywords TEXT[] DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'sentiment_emotions') THEN
        ALTER TABLE conversations ADD COLUMN sentiment_emotions JSONB DEFAULT '{}';
    END IF;
    
    -- Add content normalization columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'normalized_content') THEN
        ALTER TABLE conversations ADD COLUMN normalized_content TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'extracted_keywords') THEN
        ALTER TABLE conversations ADD COLUMN extracted_keywords TEXT[] DEFAULT '{}';
    END IF;
    
    -- Add processing status columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'processing_status') THEN
        ALTER TABLE conversations ADD COLUMN processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'archived') THEN
        ALTER TABLE conversations ADD COLUMN archived BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create function to automatically create processing jobs for new conversations
CREATE OR REPLACE FUNCTION create_processing_jobs_for_conversation()
RETURNS TRIGGER AS $$
BEGIN
    -- Create sentiment analysis job for new conversations
    INSERT INTO processing_jobs (type, data, priority, tenant_id)
    VALUES (
        'sentiment_analysis',
        jsonb_build_object('conversation_ids', ARRAY[NEW.id::text]),
        CASE 
            WHEN NEW.platform IN ('twitter', 'reddit') THEN 'high'
            WHEN NEW.platform IN ('news', 'forums') THEN 'medium'
            ELSE 'low'
        END,
        NEW.tenant_id
    );
    
    -- Create content normalization job
    INSERT INTO processing_jobs (type, data, priority, tenant_id)
    VALUES (
        'content_normalization',
        jsonb_build_object('conversation_ids', ARRAY[NEW.id::text]),
        'low',
        NEW.tenant_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new conversations
DROP TRIGGER IF EXISTS trigger_create_processing_jobs ON conversations;
CREATE TRIGGER trigger_create_processing_jobs
    AFTER INSERT ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION create_processing_jobs_for_conversation();

-- Create function to update processing job status
CREATE OR REPLACE FUNCTION update_processing_job_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Set started_at when status changes to processing
    IF OLD.status != 'processing' AND NEW.status = 'processing' THEN
        NEW.started_at = NOW();
    END IF;
    
    -- Set completed_at when status changes to completed or failed
    IF OLD.status NOT IN ('completed', 'failed') AND NEW.status IN ('completed', 'failed') THEN
        NEW.completed_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for processing job updates
DROP TRIGGER IF EXISTS trigger_update_processing_job_timestamps ON processing_jobs;
CREATE TRIGGER trigger_update_processing_job_timestamps
    BEFORE UPDATE ON processing_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_processing_job_timestamps();

-- Create function to clean up old processing jobs
CREATE OR REPLACE FUNCTION cleanup_old_processing_jobs()
RETURNS void AS $$
BEGIN
    -- Delete completed jobs older than 7 days
    DELETE FROM processing_jobs 
    WHERE status = 'completed' 
    AND completed_at < NOW() - INTERVAL '7 days';
    
    -- Delete failed jobs older than 30 days
    DELETE FROM processing_jobs 
    WHERE status = 'failed' 
    AND completed_at < NOW() - INTERVAL '30 days';
    
    -- Log cleanup metrics
    INSERT INTO processing_metrics (type, metrics)
    VALUES ('cleanup', jsonb_build_object(
        'cleaned_at', NOW(),
        'type', 'processing_jobs_cleanup'
    ));
END;
$$ LANGUAGE plpgsql;

-- Create function to get processing queue statistics
CREATE OR REPLACE FUNCTION get_processing_queue_stats(tenant_uuid UUID DEFAULT NULL)
RETURNS TABLE (
    status TEXT,
    type TEXT,
    count BIGINT,
    avg_processing_time_ms NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pj.status,
        pj.type,
        COUNT(*) as count,
        AVG(pj.processing_time_ms) as avg_processing_time_ms
    FROM processing_jobs pj
    WHERE (tenant_uuid IS NULL OR pj.tenant_id = tenant_uuid)
    AND pj.created_at > NOW() - INTERVAL '24 hours'
    GROUP BY pj.status, pj.type
    ORDER BY pj.status, pj.type;
END;
$$ LANGUAGE plpgsql;

-- Create function to prioritize processing jobs
CREATE OR REPLACE FUNCTION prioritize_processing_jobs()
RETURNS void AS $$
BEGIN
    -- Increase priority for jobs that have been pending too long
    UPDATE processing_jobs 
    SET priority = CASE 
        WHEN priority = 'low' THEN 'medium'
        WHEN priority = 'medium' THEN 'high'
        ELSE priority
    END
    WHERE status = 'pending' 
    AND created_at < NOW() - INTERVAL '1 hour'
    AND priority != 'high';
    
    -- Reset stuck processing jobs (processing for more than 30 minutes)
    UPDATE processing_jobs 
    SET status = 'pending', 
        started_at = NULL,
        error = 'Job was stuck in processing state and was reset'
    WHERE status = 'processing' 
    AND started_at < NOW() - INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies for processing tables
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_metrics ENABLE ROW LEVEL SECURITY;

-- Policy for processing jobs - users can only see jobs for their tenant
CREATE POLICY processing_jobs_tenant_isolation ON processing_jobs
    FOR ALL USING (
        tenant_id IS NULL OR 
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
        )
    );

-- Policy for scheduled tasks - users can only see tasks for their tenant
CREATE POLICY scheduled_tasks_tenant_isolation ON scheduled_tasks
    FOR ALL USING (
        tenant_id IS NULL OR 
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
        )
    );

-- Policy for processing metrics - users can only see metrics for their tenant
CREATE POLICY processing_metrics_tenant_isolation ON processing_metrics
    FOR ALL USING (
        tenant_id IS NULL OR 
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_processing_status ON conversations(processing_status) WHERE processing_status != 'completed';
CREATE INDEX IF NOT EXISTS idx_conversations_sentiment_analyzed ON conversations(sentiment_analyzed_at) WHERE sentiment_analyzed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_archived ON conversations(archived) WHERE archived = false;

-- Insert default scheduled tasks
INSERT INTO scheduled_tasks (name, type, schedule, config) VALUES
    ('Daily Sentiment Batch', 'sentiment_batch', 'daily', '{"batch_size": 100}'),
    ('Hourly Trend Analysis', 'trend_analysis', 'hourly', '{"time_range": "1h"}'),
    ('Weekly Data Cleanup', 'data_cleanup', 'weekly', '{"retention_days": 30}'),
    ('Daily Report Generation', 'report_generation', 'daily', '{"auto_generate": true}')
ON CONFLICT DO NOTHING;

-- Create function to get next scheduled tasks
CREATE OR REPLACE FUNCTION get_next_scheduled_tasks(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    name TEXT,
    type TEXT,
    schedule TEXT,
    config JSONB,
    tenant_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        st.id,
        st.name,
        st.type,
        st.schedule,
        st.config,
        st.tenant_id
    FROM scheduled_tasks st
    WHERE st.enabled = true
    AND (st.next_run IS NULL OR st.next_run <= NOW())
    ORDER BY st.next_run ASC NULLS FIRST
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;