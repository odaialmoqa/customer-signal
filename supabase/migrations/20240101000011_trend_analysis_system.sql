-- Trend Analysis System Migration
-- This migration adds database functions and optimizations for trend analysis

-- Add indexes for trend analysis performance
CREATE INDEX IF NOT EXISTS idx_conversations_keywords_array ON conversations USING gin(keywords);
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp_desc ON conversations(timestamp DESC) WHERE timestamp IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_timestamp ON conversations(tenant_id, timestamp DESC) WHERE timestamp IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_platform_timestamp ON conversations(platform, timestamp DESC) WHERE timestamp IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_sentiment_timestamp ON conversations(sentiment, timestamp DESC) WHERE sentiment IS NOT NULL AND timestamp IS NOT NULL;

-- Composite index for trend analysis queries
CREATE INDEX IF NOT EXISTS idx_conversations_trend_analysis ON conversations(tenant_id, timestamp DESC, sentiment, platform) 
WHERE timestamp IS NOT NULL AND sentiment IS NOT NULL;

-- Function to get keyword frequency for trend detection
CREATE OR REPLACE FUNCTION get_keyword_frequency(
    p_tenant_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_platforms TEXT[] DEFAULT NULL,
    p_min_frequency INTEGER DEFAULT 1
)
RETURNS TABLE (
    keyword TEXT,
    frequency BIGINT,
    platforms TEXT[],
    sentiment_distribution JSONB,
    first_seen TIMESTAMP WITH TIME ZONE,
    last_seen TIMESTAMP WITH TIME ZONE,
    trend_direction TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH keyword_stats AS (
        SELECT 
            unnest(c.keywords) as kw,
            COUNT(*) as freq,
            array_agg(DISTINCT c.platform) as plats,
            jsonb_object_agg(
                COALESCE(c.sentiment::text, 'unknown'), 
                COUNT(*) FILTER (WHERE c.sentiment IS NOT NULL)
            ) as sentiment_dist,
            MIN(c.timestamp) as first_ts,
            MAX(c.timestamp) as last_ts,
            -- Calculate trend direction based on recent vs older conversations
            CASE 
                WHEN COUNT(*) FILTER (WHERE c.timestamp > NOW() - INTERVAL '3 days') > 
                     COUNT(*) FILTER (WHERE c.timestamp <= NOW() - INTERVAL '3 days' AND c.timestamp > NOW() - INTERVAL '7 days') * 1.2
                THEN 'rising'
                WHEN COUNT(*) FILTER (WHERE c.timestamp > NOW() - INTERVAL '3 days') < 
                     COUNT(*) FILTER (WHERE c.timestamp <= NOW() - INTERVAL '3 days' AND c.timestamp > NOW() - INTERVAL '7 days') * 0.8
                THEN 'falling'
                ELSE 'stable'
            END as trend_dir
        FROM conversations c
        WHERE c.tenant_id = p_tenant_id
            AND c.keywords IS NOT NULL
            AND array_length(c.keywords, 1) > 0
            AND (p_start_date IS NULL OR c.timestamp >= p_start_date)
            AND (p_end_date IS NULL OR c.timestamp <= p_end_date)
            AND (p_platforms IS NULL OR c.platform = ANY(p_platforms))
            AND c.timestamp IS NOT NULL
        GROUP BY unnest(c.keywords)
    )
    SELECT 
        ks.kw,
        ks.freq,
        ks.plats,
        ks.sentiment_dist,
        ks.first_ts,
        ks.last_ts,
        ks.trend_dir
    FROM keyword_stats ks
    WHERE ks.freq >= p_min_frequency
    ORDER BY ks.freq DESC, ks.last_ts DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get conversation clusters based on keyword similarity
CREATE OR REPLACE FUNCTION get_conversation_clusters(
    p_tenant_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_min_cluster_size INTEGER DEFAULT 3,
    p_similarity_threshold REAL DEFAULT 0.3
)
RETURNS TABLE (
    cluster_id TEXT,
    conversation_ids UUID[],
    shared_keywords TEXT[],
    platforms TEXT[],
    sentiment_distribution JSONB,
    time_span JSONB,
    conversation_count INTEGER
) AS $$
DECLARE
    cluster_counter INTEGER := 1;
    conv_record RECORD;
    cluster_record RECORD;
    similar_convs UUID[];
BEGIN
    -- Create temporary table to track processed conversations
    CREATE TEMP TABLE IF NOT EXISTS processed_conversations (
        conversation_id UUID PRIMARY KEY
    );
    
    -- Create temporary table to store clusters
    CREATE TEMP TABLE IF NOT EXISTS temp_clusters (
        cluster_id TEXT,
        conversation_ids UUID[],
        shared_keywords TEXT[],
        platforms TEXT[],
        sentiment_dist JSONB,
        time_range JSONB,
        conv_count INTEGER
    );
    
    -- Clear temporary tables
    DELETE FROM processed_conversations;
    DELETE FROM temp_clusters;
    
    -- Process each conversation to find clusters
    FOR conv_record IN 
        SELECT c.id, c.keywords, c.platform, c.sentiment, c.timestamp
        FROM conversations c
        WHERE c.tenant_id = p_tenant_id
            AND c.keywords IS NOT NULL
            AND array_length(c.keywords, 1) > 0
            AND (p_start_date IS NULL OR c.timestamp >= p_start_date)
            AND (p_end_date IS NULL OR c.timestamp <= p_end_date)
            AND c.timestamp IS NOT NULL
        ORDER BY c.timestamp DESC
    LOOP
        -- Skip if already processed
        IF EXISTS (SELECT 1 FROM processed_conversations WHERE conversation_id = conv_record.id) THEN
            CONTINUE;
        END IF;
        
        -- Find similar conversations
        SELECT array_agg(c2.id) INTO similar_convs
        FROM conversations c2
        WHERE c2.tenant_id = p_tenant_id
            AND c2.id != conv_record.id
            AND c2.keywords IS NOT NULL
            AND array_length(c2.keywords, 1) > 0
            AND (p_start_date IS NULL OR c2.timestamp >= p_start_date)
            AND (p_end_date IS NULL OR c2.timestamp <= p_end_date)
            AND c2.timestamp IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM processed_conversations WHERE conversation_id = c2.id)
            -- Check keyword similarity
            AND (
                SELECT COUNT(*)::REAL / GREATEST(array_length(conv_record.keywords, 1), array_length(c2.keywords, 1))
                FROM (
                    SELECT unnest(conv_record.keywords) 
                    INTERSECT 
                    SELECT unnest(c2.keywords)
                ) shared
            ) >= p_similarity_threshold;
        
        -- If we found enough similar conversations, create a cluster
        IF array_length(similar_convs, 1) >= p_min_cluster_size - 1 THEN
            INSERT INTO temp_clusters
            SELECT 
                'cluster_' || cluster_counter::text,
                array_append(similar_convs, conv_record.id),
                (
                    SELECT array_agg(DISTINCT kw)
                    FROM (
                        SELECT unnest(c.keywords) as kw
                        FROM conversations c
                        WHERE c.id = ANY(array_append(similar_convs, conv_record.id))
                    ) keywords
                    GROUP BY kw
                    HAVING COUNT(*) >= 2
                ),
                (
                    SELECT array_agg(DISTINCT c.platform)
                    FROM conversations c
                    WHERE c.id = ANY(array_append(similar_convs, conv_record.id))
                ),
                (
                    SELECT jsonb_object_agg(
                        COALESCE(c.sentiment::text, 'unknown'),
                        COUNT(*)
                    )
                    FROM conversations c
                    WHERE c.id = ANY(array_append(similar_convs, conv_record.id))
                ),
                (
                    SELECT jsonb_build_object(
                        'start', MIN(c.timestamp),
                        'end', MAX(c.timestamp)
                    )
                    FROM conversations c
                    WHERE c.id = ANY(array_append(similar_convs, conv_record.id))
                ),
                array_length(similar_convs, 1) + 1;
            
            -- Mark conversations as processed
            INSERT INTO processed_conversations
            SELECT unnest(array_append(similar_convs, conv_record.id));
            
            cluster_counter := cluster_counter + 1;
        END IF;
    END LOOP;
    
    -- Return results
    RETURN QUERY
    SELECT 
        tc.cluster_id,
        tc.conversation_ids,
        tc.shared_keywords,
        tc.platforms,
        tc.sentiment_dist,
        tc.time_range,
        tc.conv_count
    FROM temp_clusters tc
    ORDER BY tc.conv_count DESC;
    
    -- Clean up
    DROP TABLE IF EXISTS processed_conversations;
    DROP TABLE IF EXISTS temp_clusters;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate sentiment trends over time
CREATE OR REPLACE FUNCTION get_sentiment_trends(
    p_tenant_id UUID,
    p_keywords TEXT[] DEFAULT NULL,
    p_platforms TEXT[] DEFAULT NULL,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_interval_type TEXT DEFAULT 'day'
)
RETURNS TABLE (
    time_bucket TIMESTAMP WITH TIME ZONE,
    keyword TEXT,
    platform TEXT,
    positive_count BIGINT,
    negative_count BIGINT,
    neutral_count BIGINT,
    total_count BIGINT,
    sentiment_score REAL
) AS $$
DECLARE
    interval_expr TEXT;
BEGIN
    -- Set interval based on type
    CASE p_interval_type
        WHEN 'hour' THEN interval_expr := '1 hour';
        WHEN 'day' THEN interval_expr := '1 day';
        WHEN 'week' THEN interval_expr := '1 week';
        WHEN 'month' THEN interval_expr := '1 month';
        ELSE interval_expr := '1 day';
    END CASE;
    
    RETURN QUERY
    EXECUTE format('
        SELECT 
            date_trunc(%L, c.timestamp) as time_bucket,
            unnest(c.keywords) as keyword,
            c.platform,
            COUNT(*) FILTER (WHERE c.sentiment = ''positive'') as positive_count,
            COUNT(*) FILTER (WHERE c.sentiment = ''negative'') as negative_count,
            COUNT(*) FILTER (WHERE c.sentiment = ''neutral'') as neutral_count,
            COUNT(*) as total_count,
            -- Calculate sentiment score (-1 to 1)
            (
                COUNT(*) FILTER (WHERE c.sentiment = ''positive'')::REAL - 
                COUNT(*) FILTER (WHERE c.sentiment = ''negative'')::REAL
            ) / NULLIF(COUNT(*)::REAL, 0) as sentiment_score
        FROM conversations c
        WHERE c.tenant_id = $1
            AND c.timestamp IS NOT NULL
            AND c.sentiment IS NOT NULL
            AND c.keywords IS NOT NULL
            AND array_length(c.keywords, 1) > 0
            AND ($2 IS NULL OR c.keywords && $2)
            AND ($3 IS NULL OR c.platform = ANY($3))
            AND ($4 IS NULL OR c.timestamp >= $4)
            AND ($5 IS NULL OR c.timestamp <= $5)
        GROUP BY date_trunc(%L, c.timestamp), unnest(c.keywords), c.platform
        HAVING COUNT(*) >= 2
        ORDER BY time_bucket DESC, total_count DESC
    ', p_interval_type, p_interval_type)
    USING p_tenant_id, p_keywords, p_platforms, p_start_date, p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find cross-platform conversation patterns
CREATE OR REPLACE FUNCTION get_cross_platform_patterns(
    p_tenant_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_min_correlation REAL DEFAULT 0.3
)
RETURNS TABLE (
    keyword TEXT,
    platform1 TEXT,
    platform2 TEXT,
    shared_conversations BIGINT,
    correlation_strength REAL,
    temporal_overlap REAL
) AS $$
BEGIN
    RETURN QUERY
    WITH platform_keywords AS (
        SELECT 
            unnest(c.keywords) as kw,
            c.platform,
            COUNT(*) as conv_count,
            array_agg(c.id) as conversation_ids,
            array_agg(extract(epoch from c.timestamp)) as timestamps
        FROM conversations c
        WHERE c.tenant_id = p_tenant_id
            AND c.keywords IS NOT NULL
            AND array_length(c.keywords, 1) > 0
            AND (p_start_date IS NULL OR c.timestamp >= p_start_date)
            AND (p_end_date IS NULL OR c.timestamp <= p_end_date)
            AND c.timestamp IS NOT NULL
        GROUP BY unnest(c.keywords), c.platform
        HAVING COUNT(*) >= 2
    ),
    cross_platform_pairs AS (
        SELECT 
            pk1.kw,
            pk1.platform as plat1,
            pk2.platform as plat2,
            LEAST(pk1.conv_count, pk2.conv_count) as shared_convs,
            -- Calculate correlation based on conversation counts
            (LEAST(pk1.conv_count, pk2.conv_count)::REAL / GREATEST(pk1.conv_count, pk2.conv_count)) as correlation,
            -- Calculate temporal overlap (simplified)
            CASE 
                WHEN pk1.timestamps && pk2.timestamps THEN 0.8
                ELSE 0.2
            END as temporal_overlap
        FROM platform_keywords pk1
        JOIN platform_keywords pk2 ON pk1.kw = pk2.kw AND pk1.platform < pk2.platform
        WHERE pk1.conv_count >= 2 AND pk2.conv_count >= 2
    )
    SELECT 
        cpp.kw,
        cpp.plat1,
        cpp.plat2,
        cpp.shared_convs,
        cpp.correlation,
        cpp.temporal_overlap
    FROM cross_platform_pairs cpp
    WHERE cpp.correlation >= p_min_correlation
    ORDER BY cpp.correlation DESC, cpp.shared_convs DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to identify emerging themes
CREATE OR REPLACE FUNCTION get_emerging_themes(
    p_tenant_id UUID,
    p_lookback_days INTEGER DEFAULT 7,
    p_comparison_days INTEGER DEFAULT 14,
    p_min_growth_rate REAL DEFAULT 2.0
)
RETURNS TABLE (
    keyword TEXT,
    recent_count BIGINT,
    previous_count BIGINT,
    growth_rate REAL,
    platforms TEXT[],
    sentiment_trend REAL
) AS $$
BEGIN
    RETURN QUERY
    WITH recent_keywords AS (
        SELECT 
            unnest(c.keywords) as kw,
            COUNT(*) as recent_cnt,
            array_agg(DISTINCT c.platform) as plats,
            AVG(
                CASE c.sentiment
                    WHEN 'positive' THEN 1
                    WHEN 'negative' THEN -1
                    ELSE 0
                END
            ) as avg_sentiment
        FROM conversations c
        WHERE c.tenant_id = p_tenant_id
            AND c.timestamp >= NOW() - (p_lookback_days || ' days')::INTERVAL
            AND c.keywords IS NOT NULL
            AND array_length(c.keywords, 1) > 0
        GROUP BY unnest(c.keywords)
    ),
    previous_keywords AS (
        SELECT 
            unnest(c.keywords) as kw,
            COUNT(*) as prev_cnt
        FROM conversations c
        WHERE c.tenant_id = p_tenant_id
            AND c.timestamp >= NOW() - (p_comparison_days || ' days')::INTERVAL
            AND c.timestamp < NOW() - (p_lookback_days || ' days')::INTERVAL
            AND c.keywords IS NOT NULL
            AND array_length(c.keywords, 1) > 0
        GROUP BY unnest(c.keywords)
    )
    SELECT 
        rk.kw,
        rk.recent_cnt,
        COALESCE(pk.prev_cnt, 0),
        CASE 
            WHEN COALESCE(pk.prev_cnt, 0) = 0 THEN rk.recent_cnt::REAL
            ELSE rk.recent_cnt::REAL / pk.prev_cnt::REAL
        END as growth_rate,
        rk.plats,
        rk.avg_sentiment
    FROM recent_keywords rk
    LEFT JOIN previous_keywords pk ON rk.kw = pk.kw
    WHERE (
        CASE 
            WHEN COALESCE(pk.prev_cnt, 0) = 0 THEN rk.recent_cnt::REAL
            ELSE rk.recent_cnt::REAL / pk.prev_cnt::REAL
        END
    ) >= p_min_growth_rate
    AND rk.recent_cnt >= 3
    ORDER BY growth_rate DESC, rk.recent_cnt DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION get_keyword_frequency TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_clusters TO authenticated;
GRANT EXECUTE ON FUNCTION get_sentiment_trends TO authenticated;
GRANT EXECUTE ON FUNCTION get_cross_platform_patterns TO authenticated;
GRANT EXECUTE ON FUNCTION get_emerging_themes TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_keyword_frequency IS 'Analyzes keyword frequency and trends for trend detection';
COMMENT ON FUNCTION get_conversation_clusters IS 'Groups conversations into clusters based on keyword similarity';
COMMENT ON FUNCTION get_sentiment_trends IS 'Tracks sentiment changes over time for keywords and platforms';
COMMENT ON FUNCTION get_cross_platform_patterns IS 'Identifies patterns and correlations across different platforms';
COMMENT ON FUNCTION get_emerging_themes IS 'Detects emerging themes based on recent conversation growth';