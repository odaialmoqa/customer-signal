-- Create sentiment analysis logging tables

-- Table for individual sentiment analysis logs
CREATE TABLE IF NOT EXISTS sentiment_analysis_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_preview TEXT NOT NULL,
    result JSONB,
    status TEXT NOT NULL,
    error_message TEXT,
    provider TEXT NOT NULL,
    processing_time INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for batch sentiment analysis logs
CREATE TABLE IF NOT EXISTS sentiment_batch_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    input_count INTEGER NOT NULL,
    processed_count INTEGER NOT NULL,
    error_count INTEGER NOT NULL DEFAULT 0,
    processing_time INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for API usage tracking (individual requests)
CREATE TABLE IF NOT EXISTS sentiment_api_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content_length INTEGER NOT NULL,
    provider_used TEXT NOT NULL,
    processing_time INTEGER NOT NULL DEFAULT 0,
    sentiment TEXT NOT NULL,
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for batch API usage tracking
CREATE TABLE IF NOT EXISTS sentiment_batch_api_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    input_count INTEGER NOT NULL,
    processed_count INTEGER NOT NULL,
    error_count INTEGER NOT NULL DEFAULT 0,
    processing_time INTEGER NOT NULL DEFAULT 0,
    average_content_length INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_logs_created_at ON sentiment_analysis_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_logs_provider ON sentiment_analysis_logs(provider);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_logs_status ON sentiment_analysis_logs(status);

CREATE INDEX IF NOT EXISTS idx_sentiment_batch_logs_created_at ON sentiment_batch_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_sentiment_api_usage_user_id ON sentiment_api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_api_usage_created_at ON sentiment_api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_sentiment_api_usage_provider ON sentiment_api_usage(provider_used);

CREATE INDEX IF NOT EXISTS idx_sentiment_batch_api_usage_user_id ON sentiment_batch_api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_batch_api_usage_created_at ON sentiment_batch_api_usage(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE sentiment_analysis_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentiment_batch_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentiment_api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentiment_batch_api_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sentiment_analysis_logs (admin only)
CREATE POLICY "Service role can manage sentiment_analysis_logs" ON sentiment_analysis_logs
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for sentiment_batch_logs (admin only)
CREATE POLICY "Service role can manage sentiment_batch_logs" ON sentiment_batch_logs
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for sentiment_api_usage (users can view their own data)
CREATE POLICY "Users can view their own sentiment API usage" ON sentiment_api_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage sentiment_api_usage" ON sentiment_api_usage
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for sentiment_batch_api_usage (users can view their own data)
CREATE POLICY "Users can view their own batch sentiment API usage" ON sentiment_batch_api_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage sentiment_batch_api_usage" ON sentiment_batch_api_usage
    FOR ALL USING (auth.role() = 'service_role');

-- Create a function to clean up old logs (optional, for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_sentiment_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete logs older than 90 days
    DELETE FROM sentiment_analysis_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    DELETE FROM sentiment_batch_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Keep API usage data for longer (1 year)
    DELETE FROM sentiment_api_usage 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    DELETE FROM sentiment_batch_api_usage 
    WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$;