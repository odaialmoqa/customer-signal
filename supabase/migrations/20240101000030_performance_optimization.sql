-- Performance Optimization Migration
-- Adds indexes, query optimizations, and performance enhancements

-- Create indexes for frequently queried columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_tenant_timestamp 
ON conversations (tenant_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_sentiment_score 
ON conversations (sentiment_score) WHERE sentiment_score IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_platform_tenant 
ON conversations (platform, tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_keywords_gin 
ON conversations USING GIN (keywords);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_tags_gin 
ON conversations USING GIN (tags);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_content_fts 
ON conversations USING GIN (to_tsvector('english', content));

-- Keywords table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_keywords_tenant_active 
ON keywords (tenant_id, is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_keywords_term_tenant 
ON keywords (term, tenant_id);

-- Alerts table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_tenant_active 
ON alerts (tenant_id, is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_triggered_at 
ON alerts (triggered_at DESC) WHERE triggered_at IS NOT NULL;

-- Analytics aggregation tables for performance
CREATE TABLE IF NOT EXISTS conversation_analytics_daily (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    platform TEXT NOT NULL,
    total_conversations INTEGER DEFAULT 0,
    positive_sentiment INTEGER DEFAULT 0,
    negative_sentiment INTEGER DEFAULT 0,
    neutral_sentiment INTEGER DEFAULT 0,
    avg_sentiment_score DECIMAL(3,2),
    top_keywords JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, date, platform)
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_tenant_date 
ON conversation_analytics_daily (tenant_id, date DESC);

-- Function to update daily analytics
CREATE OR REPLACE FUNCTION update_daily_analytics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO conversation_analytics_daily (
        tenant_id, date, platform, total_conversations, 
        positive_sentiment, negative_sentiment, neutral_sentiment,
        avg_sentiment_score, top_keywords
    )
    SELECT 
        NEW.tenant_id,
        DATE(NEW.created_at),
        NEW.platform,
        1,
        CASE WHEN NEW.sentiment = 'positive' THEN 1 ELSE 0 END,
        CASE WHEN NEW.sentiment = 'negative' THEN 1 ELSE 0 END,
        CASE WHEN NEW.sentiment = 'neutral' THEN 1 ELSE 0 END,
        NEW.sentiment_score,
        jsonb_build_array(NEW.keywords)
    ON CONFLICT (tenant_id, date, platform) 
    DO UPDATE SET
        total_conversations = conversation_analytics_daily.total_conversations + 1,
        positive_sentiment = conversation_analytics_daily.positive_sentiment + 
            CASE WHEN NEW.sentiment = 'positive' THEN 1 ELSE 0 END,
        negative_sentiment = conversation_analytics_daily.negative_sentiment + 
            CASE WHEN NEW.sentiment = 'negative' THEN 1 ELSE 0 END,
        neutral_sentiment = conversation_analytics_daily.neutral_sentiment + 
            CASE WHEN NEW.sentiment = 'neutral' THEN 1 ELSE 0 END,
        avg_sentiment_score = (
            (conversation_analytics_daily.avg_sentiment_score * conversation_analytics_daily.total_conversations) + 
            COALESCE(NEW.sentiment_score, 0)
        ) / (conversation_analytics_daily.total_conversations + 1),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for real-time analytics updates
DROP TRIGGER IF EXISTS trigger_update_daily_analytics ON conversations;
CREATE TRIGGER trigger_update_daily_analytics
    AFTER INSERT ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_analytics();

-- Partitioning for conversations table (by month)
CREATE TABLE IF NOT EXISTS conversations_template (
    LIKE conversations INCLUDING ALL
);

-- Function to create monthly partitions
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name TEXT, start_date DATE)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    end_date DATE;
BEGIN
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I 
                    FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);
    
    -- Add indexes to partition
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (tenant_id, created_at DESC)',
                   'idx_' || partition_name || '_tenant_timestamp', partition_name);
END;
$$ LANGUAGE plpgsql;

-- Query optimization views
CREATE OR REPLACE VIEW conversation_summary AS
SELECT 
    c.id,
    c.tenant_id,
    c.content,
    c.author,
    c.platform,
    c.sentiment,
    c.sentiment_score,
    c.created_at,
    array_length(c.keywords, 1) as keyword_count,
    array_length(c.tags, 1) as tag_count
FROM conversations c
WHERE c.created_at >= NOW() - INTERVAL '30 days';

-- Materialized view for trending keywords
CREATE MATERIALIZED VIEW IF NOT EXISTS trending_keywords AS
SELECT 
    tenant_id,
    keyword,
    COUNT(*) as mention_count,
    AVG(sentiment_score) as avg_sentiment,
    DATE_TRUNC('day', created_at) as trend_date
FROM conversations c,
     UNNEST(c.keywords) as keyword
WHERE c.created_at >= NOW() - INTERVAL '7 days'
GROUP BY tenant_id, keyword, DATE_TRUNC('day', created_at)
ORDER BY mention_count DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trending_keywords_unique 
ON trending_keywords (tenant_id, keyword, trend_date);

-- Refresh trending keywords hourly
CREATE OR REPLACE FUNCTION refresh_trending_keywords()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY trending_keywords;
END;
$$ LANGUAGE plpgsql;

-- Connection pooling configuration
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Enable query plan caching
ALTER SYSTEM SET plan_cache_mode = 'auto';

-- Analyze tables for better query planning
ANALYZE conversations;
ANALYZE keywords;
ANALYZE alerts;
ANALYZE tenants;