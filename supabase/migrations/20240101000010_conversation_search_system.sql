-- Enhanced conversation search and storage system
-- This migration adds advanced search capabilities and optimizations

-- Add full-text search configuration for better search performance
CREATE TEXT SEARCH CONFIGURATION custom_english (COPY = english);

-- Add additional indexes for advanced filtering and search
CREATE INDEX IF NOT EXISTS idx_conversations_keywords_gin ON conversations USING gin(keywords);
CREATE INDEX IF NOT EXISTS idx_conversations_tags_gin ON conversations USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_conversations_url ON conversations(url);
CREATE INDEX IF NOT EXISTS idx_conversations_external_id ON conversations(external_id);

-- Enhanced full-text search index with custom configuration
DROP INDEX IF EXISTS idx_conversations_content_fts;
CREATE INDEX idx_conversations_content_fts ON conversations 
USING gin(to_tsvector('custom_english', content));

-- Combined content and author search index
CREATE INDEX IF NOT EXISTS idx_conversations_combined_fts ON conversations 
USING gin(to_tsvector('custom_english', coalesce(content, '') || ' ' || coalesce(author, '')));

-- Partial indexes for active conversations (non-null timestamp)
CREATE INDEX IF NOT EXISTS idx_conversations_active_timestamp ON conversations(timestamp DESC) 
WHERE timestamp IS NOT NULL;

-- Composite index for tenant-specific searches with filters
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_search ON conversations(tenant_id, timestamp DESC, sentiment, platform)
WHERE timestamp IS NOT NULL;

-- Function to search conversations with advanced filtering
CREATE OR REPLACE FUNCTION search_conversations(
    p_tenant_id UUID,
    p_search_query TEXT DEFAULT NULL,
    p_platforms TEXT[] DEFAULT NULL,
    p_sentiments sentiment_type[] DEFAULT NULL,
    p_keywords TEXT[] DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    author VARCHAR(255),
    platform platform_type,
    url TEXT,
    timestamp TIMESTAMP WITH TIME ZONE,
    sentiment sentiment_type,
    sentiment_confidence DECIMAL(3,2),
    keywords TEXT[],
    tags TEXT[],
    engagement_metrics JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    search_rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.content,
        c.author,
        c.platform,
        c.url,
        c.timestamp,
        c.sentiment,
        c.sentiment_confidence,
        c.keywords,
        c.tags,
        c.engagement_metrics,
        c.created_at,
        CASE 
            WHEN p_search_query IS NOT NULL THEN 
                ts_rank(to_tsvector('custom_english', c.content), plainto_tsquery('custom_english', p_search_query))
            ELSE 0.0
        END as search_rank
    FROM conversations c
    WHERE c.tenant_id = p_tenant_id
        AND (p_search_query IS NULL OR to_tsvector('custom_english', c.content) @@ plainto_tsquery('custom_english', p_search_query))
        AND (p_platforms IS NULL OR c.platform = ANY(p_platforms::platform_type[]))
        AND (p_sentiments IS NULL OR c.sentiment = ANY(p_sentiments))
        AND (p_keywords IS NULL OR c.keywords && p_keywords)
        AND (p_tags IS NULL OR c.tags && p_tags)
        AND (p_start_date IS NULL OR c.timestamp >= p_start_date)
        AND (p_end_date IS NULL OR c.timestamp <= p_end_date)
    ORDER BY 
        CASE WHEN p_search_query IS NOT NULL THEN search_rank END DESC,
        c.timestamp DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get conversation statistics for analytics
CREATE OR REPLACE FUNCTION get_conversation_stats(
    p_tenant_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    total_conversations BIGINT,
    positive_count BIGINT,
    negative_count BIGINT,
    neutral_count BIGINT,
    platform_distribution JSONB,
    daily_counts JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_conversations,
        COUNT(*) FILTER (WHERE sentiment = 'positive') as positive_count,
        COUNT(*) FILTER (WHERE sentiment = 'negative') as negative_count,
        COUNT(*) FILTER (WHERE sentiment = 'neutral') as neutral_count,
        jsonb_object_agg(platform, platform_count) as platform_distribution,
        jsonb_object_agg(date_trunc('day', timestamp), daily_count) as daily_counts
    FROM (
        SELECT 
            platform,
            sentiment,
            timestamp,
            COUNT(*) OVER (PARTITION BY platform) as platform_count,
            COUNT(*) OVER (PARTITION BY date_trunc('day', timestamp)) as daily_count
        FROM conversations
        WHERE tenant_id = p_tenant_id
            AND (p_start_date IS NULL OR timestamp >= p_start_date)
            AND (p_end_date IS NULL OR timestamp <= p_end_date)
            AND timestamp IS NOT NULL
    ) stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find similar conversations based on content
CREATE OR REPLACE FUNCTION find_similar_conversations(
    p_tenant_id UUID,
    p_conversation_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    author VARCHAR(255),
    platform platform_type,
    timestamp TIMESTAMP WITH TIME ZONE,
    similarity_score REAL
) AS $$
DECLARE
    source_content TEXT;
BEGIN
    -- Get the source conversation content
    SELECT content INTO source_content 
    FROM conversations 
    WHERE id = p_conversation_id AND tenant_id = p_tenant_id;
    
    IF source_content IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        c.id,
        c.content,
        c.author,
        c.platform,
        c.timestamp,
        similarity(c.content, source_content) as similarity_score
    FROM conversations c
    WHERE c.tenant_id = p_tenant_id
        AND c.id != p_conversation_id
        AND similarity(c.content, source_content) > 0.3
    ORDER BY similarity_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigram extension for similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add trigram index for similarity searches
CREATE INDEX IF NOT EXISTS idx_conversations_content_trgm ON conversations USING gin(content gin_trgm_ops);

-- Function to bulk insert conversations with deduplication
CREATE OR REPLACE FUNCTION bulk_insert_conversations(
    p_conversations JSONB
)
RETURNS TABLE (
    inserted_count INTEGER,
    updated_count INTEGER,
    skipped_count INTEGER
) AS $$
DECLARE
    inserted_cnt INTEGER := 0;
    updated_cnt INTEGER := 0;
    skipped_cnt INTEGER := 0;
    conv JSONB;
BEGIN
    FOR conv IN SELECT jsonb_array_elements(p_conversations)
    LOOP
        INSERT INTO conversations (
            tenant_id,
            content,
            author,
            platform,
            url,
            external_id,
            timestamp,
            sentiment,
            sentiment_confidence,
            keywords,
            tags,
            engagement_metrics,
            raw_data
        )
        VALUES (
            (conv->>'tenant_id')::UUID,
            conv->>'content',
            conv->>'author',
            (conv->>'platform')::platform_type,
            conv->>'url',
            conv->>'external_id',
            (conv->>'timestamp')::TIMESTAMP WITH TIME ZONE,
            (conv->>'sentiment')::sentiment_type,
            (conv->>'sentiment_confidence')::DECIMAL(3,2),
            ARRAY(SELECT jsonb_array_elements_text(conv->'keywords')),
            ARRAY(SELECT jsonb_array_elements_text(conv->'tags')),
            conv->'engagement_metrics',
            conv->'raw_data'
        )
        ON CONFLICT (tenant_id, platform, external_id) 
        DO UPDATE SET
            content = EXCLUDED.content,
            author = EXCLUDED.author,
            url = EXCLUDED.url,
            timestamp = EXCLUDED.timestamp,
            sentiment = EXCLUDED.sentiment,
            sentiment_confidence = EXCLUDED.sentiment_confidence,
            keywords = EXCLUDED.keywords,
            tags = EXCLUDED.tags,
            engagement_metrics = EXCLUDED.engagement_metrics,
            raw_data = EXCLUDED.raw_data,
            updated_at = NOW()
        WHERE conversations.updated_at < EXCLUDED.updated_at;
        
        IF FOUND THEN
            IF TG_OP = 'INSERT' THEN
                inserted_cnt := inserted_cnt + 1;
            ELSE
                updated_cnt := updated_cnt + 1;
            END IF;
        ELSE
            skipped_cnt := skipped_cnt + 1;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT inserted_cnt, updated_cnt, skipped_cnt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION search_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_stats TO authenticated;
GRANT EXECUTE ON FUNCTION find_similar_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_insert_conversations TO authenticated;