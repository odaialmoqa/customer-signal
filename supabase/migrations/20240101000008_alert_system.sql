-- Alert System Enhancement Migration
-- This migration enhances the existing alert system with configuration tables and real-time capabilities

-- Create alert configuration types
CREATE TYPE alert_type AS ENUM ('keyword_mention', 'sentiment_threshold', 'volume_spike', 'custom');
CREATE TYPE notification_channel AS ENUM ('email', 'in_app', 'webhook', 'sms');
CREATE TYPE alert_frequency AS ENUM ('immediate', 'hourly', 'daily', 'weekly');

-- Alert configurations table for user-defined alert rules
CREATE TABLE alert_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    alert_type alert_type NOT NULL,
    is_active BOOLEAN DEFAULT true,
    
    -- Configuration for different alert types
    keyword_ids UUID[], -- Array of keyword IDs to monitor
    sentiment_threshold DECIMAL(3,2), -- Trigger when sentiment drops below this
    volume_threshold INTEGER, -- Trigger when mention volume exceeds this
    platforms platform_type[], -- Platforms to monitor
    
    -- Notification settings
    notification_channels notification_channel[] DEFAULT ARRAY['in_app']::notification_channel[],
    frequency alert_frequency DEFAULT 'immediate',
    
    -- Advanced settings
    conditions JSONB DEFAULT '{}', -- Custom conditions in JSON format
    priority alert_priority DEFAULT 'medium',
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on alert_configurations
ALTER TABLE alert_configurations ENABLE ROW LEVEL SECURITY;

-- Alert notification preferences per user
CREATE TABLE alert_notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Email preferences
    email_enabled BOOLEAN DEFAULT true,
    email_frequency alert_frequency DEFAULT 'immediate',
    email_digest_time TIME DEFAULT '09:00:00', -- For daily/weekly digests
    
    -- In-app preferences
    in_app_enabled BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT false,
    
    -- Webhook preferences
    webhook_url TEXT,
    webhook_enabled BOOLEAN DEFAULT false,
    
    -- General preferences
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, tenant_id)
);

-- Enable RLS on alert_notification_preferences
ALTER TABLE alert_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Alert delivery log for tracking notifications
CREATE TABLE alert_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    channel notification_channel NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed, delivered
    delivery_details JSONB DEFAULT '{}',
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- Enable RLS on alert_deliveries
ALTER TABLE alert_deliveries ENABLE ROW LEVEL SECURITY;

-- Enhance the existing alerts table with additional fields
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS alert_configuration_id UUID REFERENCES alert_configurations(id) ON DELETE SET NULL;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- RLS Policies for new tables

-- Alert configurations policies
CREATE POLICY "Users can view alert configurations in their tenant" ON alert_configurations
    FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert alert configurations in their tenant" ON alert_configurations
    FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update alert configurations in their tenant" ON alert_configurations
    FOR UPDATE USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete alert configurations in their tenant" ON alert_configurations
    FOR DELETE USING (tenant_id = get_user_tenant_id());

-- Alert notification preferences policies
CREATE POLICY "Users can view their own notification preferences" ON alert_notification_preferences
    FOR SELECT USING (user_id = auth.uid() AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert their own notification preferences" ON alert_notification_preferences
    FOR INSERT WITH CHECK (user_id = auth.uid() AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update their own notification preferences" ON alert_notification_preferences
    FOR UPDATE USING (user_id = auth.uid() AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete their own notification preferences" ON alert_notification_preferences
    FOR DELETE USING (user_id = auth.uid() AND tenant_id = get_user_tenant_id());

-- Alert deliveries policies
CREATE POLICY "Users can view their own alert deliveries" ON alert_deliveries
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert alert deliveries" ON alert_deliveries
    FOR INSERT WITH CHECK (true); -- Allow system to insert deliveries

CREATE POLICY "System can update alert deliveries" ON alert_deliveries
    FOR UPDATE USING (true); -- Allow system to update delivery status

-- Indexes for performance
CREATE INDEX idx_alert_configurations_tenant_id ON alert_configurations(tenant_id);
CREATE INDEX idx_alert_configurations_active ON alert_configurations(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX idx_alert_configurations_type ON alert_configurations(alert_type);

CREATE INDEX idx_alert_notification_preferences_user_tenant ON alert_notification_preferences(user_id, tenant_id);

CREATE INDEX idx_alert_deliveries_alert_id ON alert_deliveries(alert_id);
CREATE INDEX idx_alert_deliveries_user_id ON alert_deliveries(user_id);
CREATE INDEX idx_alert_deliveries_status ON alert_deliveries(status);
CREATE INDEX idx_alert_deliveries_attempted_at ON alert_deliveries(attempted_at);

CREATE INDEX idx_alerts_configuration_id ON alerts(alert_configuration_id);
CREATE INDEX idx_alerts_priority ON alerts(priority);
CREATE INDEX idx_alerts_created_at ON alerts(created_at);
CREATE INDEX idx_alerts_tenant_unread ON alerts(tenant_id, is_read) WHERE is_read = false;

-- Functions for alert processing

-- Function to check if alert should be triggered based on configuration
CREATE OR REPLACE FUNCTION should_trigger_alert(
    config_id UUID,
    conversation_data JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    config RECORD;
    sentiment_score DECIMAL(3,2);
    keyword_match BOOLEAN := false;
    platform_match BOOLEAN := false;
    volume_check BOOLEAN := false;
    conversation_keywords TEXT[];
    config_keywords TEXT[];
    keyword_id UUID;
BEGIN
    -- Get alert configuration
    SELECT * INTO config FROM alert_configurations WHERE id = config_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Check platform match
    IF config.platforms IS NOT NULL AND array_length(config.platforms, 1) > 0 THEN
        platform_match := (conversation_data->>'platform')::platform_type = ANY(config.platforms);
        IF NOT platform_match THEN
            RETURN false;
        END IF;
    ELSE
        platform_match := true; -- No platform restriction
    END IF;
    
    -- Check keyword match
    IF config.keyword_ids IS NOT NULL AND array_length(config.keyword_ids, 1) > 0 THEN
        conversation_keywords := ARRAY(SELECT jsonb_array_elements_text(conversation_data->'keywords'));
        
        -- Get keywords for the configured keyword IDs
        FOR keyword_id IN SELECT unnest(config.keyword_ids)
        LOOP
            SELECT ARRAY[term] INTO config_keywords FROM keywords WHERE id = keyword_id;
            
            -- Check if any conversation keywords match configuration keywords
            IF config_keywords && conversation_keywords THEN
                keyword_match := true;
                EXIT;
            END IF;
        END LOOP;
    ELSE
        keyword_match := true; -- No keyword restriction
    END IF;
    
    -- Check sentiment threshold
    IF config.sentiment_threshold IS NOT NULL THEN
        sentiment_score := COALESCE((conversation_data->>'sentiment_confidence')::DECIMAL(3,2), 0);
        
        -- Trigger if negative sentiment exceeds threshold
        IF (conversation_data->>'sentiment')::sentiment_type = 'negative' AND 
           sentiment_score >= config.sentiment_threshold THEN
            RETURN true;
        END IF;
    END IF;
    
    -- Check volume threshold (mentions in last hour)
    IF config.volume_threshold IS NOT NULL THEN
        DECLARE
            recent_count INTEGER;
            tenant_id_val UUID;
        BEGIN
            tenant_id_val := (conversation_data->>'tenant_id')::UUID;
            
            SELECT COUNT(*) INTO recent_count
            FROM conversations 
            WHERE tenant_id = tenant_id_val
              AND created_at >= NOW() - INTERVAL '1 hour'
              AND keywords && conversation_keywords;
            
            volume_check := recent_count >= config.volume_threshold;
        END;
    ELSE
        volume_check := false;
    END IF;
    
    -- Return true if any condition matches based on alert type
    CASE config.alert_type
        WHEN 'keyword_mention' THEN
            RETURN keyword_match AND platform_match;
        WHEN 'sentiment_threshold' THEN
            RETURN config.sentiment_threshold IS NOT NULL AND 
                   (conversation_data->>'sentiment')::sentiment_type = 'negative' AND 
                   COALESCE((conversation_data->>'sentiment_confidence')::DECIMAL(3,2), 0) >= config.sentiment_threshold;
        WHEN 'volume_spike' THEN
            RETURN volume_check;
        WHEN 'custom' THEN
            -- For custom alerts, all specified conditions must match
            RETURN (config.keyword_ids IS NULL OR keyword_match) AND
                   (config.platforms IS NULL OR platform_match) AND
                   (config.sentiment_threshold IS NULL OR 
                    ((conversation_data->>'sentiment')::sentiment_type = 'negative' AND 
                     COALESCE((conversation_data->>'sentiment_confidence')::DECIMAL(3,2), 0) >= config.sentiment_threshold)) AND
                   (config.volume_threshold IS NULL OR volume_check);
        ELSE
            RETURN keyword_match AND platform_match;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate alert priority based on multiple factors
CREATE OR REPLACE FUNCTION calculate_alert_priority(
    conversation_data JSONB,
    config_data JSONB DEFAULT NULL
) RETURNS alert_priority AS $$
DECLARE
    base_priority alert_priority := 'medium';
    sentiment_val sentiment_type;
    confidence_val DECIMAL(3,2);
    platform_val platform_type;
    keyword_count INTEGER := 0;
    engagement_score INTEGER := 0;
    priority_score INTEGER := 0;
BEGIN
    -- Extract values from conversation data
    sentiment_val := (conversation_data->>'sentiment')::sentiment_type;
    confidence_val := COALESCE((conversation_data->>'sentiment_confidence')::DECIMAL(3,2), 0);
    platform_val := (conversation_data->>'platform')::platform_type;
    
    -- Get keyword count
    IF conversation_data->'keywords' IS NOT NULL THEN
        keyword_count := jsonb_array_length(conversation_data->'keywords');
    END IF;
    
    -- Get engagement metrics
    IF conversation_data->'engagement_metrics' IS NOT NULL THEN
        engagement_score := COALESCE((conversation_data->'engagement_metrics'->>'likes')::INTEGER, 0) +
                           COALESCE((conversation_data->'engagement_metrics'->>'shares')::INTEGER, 0) +
                           COALESCE((conversation_data->'engagement_metrics'->>'comments')::INTEGER, 0);
    END IF;
    
    -- Start with base priority from configuration or default
    IF config_data IS NOT NULL AND config_data->>'priority' IS NOT NULL THEN
        base_priority := (config_data->>'priority')::alert_priority;
    END IF;
    
    -- Calculate priority score (0-100)
    priority_score := CASE base_priority
        WHEN 'low' THEN 25
        WHEN 'medium' THEN 50
        WHEN 'high' THEN 75
        WHEN 'urgent' THEN 90
        ELSE 50
    END;
    
    -- Adjust based on sentiment
    IF sentiment_val = 'negative' THEN
        priority_score := priority_score + ROUND(confidence_val * 30); -- Up to +30 for high confidence negative
    ELSIF sentiment_val = 'positive' THEN
        priority_score := priority_score - ROUND(confidence_val * 10); -- Reduce for positive sentiment
    END IF;
    
    -- Adjust based on platform influence
    CASE platform_val
        WHEN 'twitter', 'reddit', 'linkedin' THEN
            priority_score := priority_score + 10; -- High visibility platforms
        WHEN 'yelp', 'google_reviews', 'trustpilot' THEN
            priority_score := priority_score + 15; -- Review platforms are critical
        WHEN 'news', 'blog' THEN
            priority_score := priority_score + 20; -- News and blogs have high impact
        ELSE
            priority_score := priority_score + 5; -- Other platforms
    END CASE;
    
    -- Adjust based on keyword matches
    priority_score := priority_score + (keyword_count * 5);
    
    -- Adjust based on engagement
    IF engagement_score > 100 THEN
        priority_score := priority_score + 15; -- High engagement
    ELSIF engagement_score > 50 THEN
        priority_score := priority_score + 10; -- Medium engagement
    ELSIF engagement_score > 10 THEN
        priority_score := priority_score + 5; -- Low engagement
    END IF;
    
    -- Convert score back to priority level
    IF priority_score >= 85 THEN
        RETURN 'urgent';
    ELSIF priority_score >= 70 THEN
        RETURN 'high';
    ELSIF priority_score >= 40 THEN
        RETURN 'medium';
    ELSE
        RETURN 'low';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to create alert from conversation with enhanced prioritization
CREATE OR REPLACE FUNCTION create_alert_from_conversation(
    p_tenant_id UUID,
    p_conversation_id UUID,
    p_config_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    conversation RECORD;
    config RECORD;
    alert_id UUID;
    alert_title VARCHAR(255);
    alert_message TEXT;
    alert_priority alert_priority;
    conversation_data JSONB;
    config_data JSONB;
    matched_keyword_id UUID;
BEGIN
    -- Get conversation details
    SELECT * INTO conversation FROM conversations WHERE id = p_conversation_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conversation not found';
    END IF;
    
    -- Get configuration details if provided
    IF p_config_id IS NOT NULL THEN
        SELECT * INTO config FROM alert_configurations WHERE id = p_config_id;
        config_data := to_jsonb(config);
    END IF;
    
    -- Build conversation data for priority calculation
    conversation_data := jsonb_build_object(
        'sentiment', conversation.sentiment,
        'sentiment_confidence', conversation.sentiment_confidence,
        'platform', conversation.platform,
        'keywords', to_jsonb(conversation.keywords),
        'engagement_metrics', conversation.engagement_metrics,
        'author', conversation.author,
        'url', conversation.url,
        'content_length', LENGTH(conversation.content)
    );
    
    -- Calculate priority using enhanced algorithm
    alert_priority := calculate_alert_priority(conversation_data, config_data);
    
    -- Find matching keyword for better context
    IF conversation.keywords IS NOT NULL AND array_length(conversation.keywords, 1) > 0 THEN
        SELECT id INTO matched_keyword_id 
        FROM keywords 
        WHERE tenant_id = p_tenant_id 
          AND term = ANY(conversation.keywords)
        LIMIT 1;
    END IF;
    
    -- Create contextual alert title
    alert_title := CASE 
        WHEN config.name IS NOT NULL THEN
            config.name || ': New mention on ' || conversation.platform
        WHEN conversation.sentiment = 'negative' THEN
            '⚠️ Negative mention on ' || conversation.platform
        WHEN conversation.sentiment = 'positive' THEN
            '✅ Positive mention on ' || conversation.platform
        ELSE
            'New mention on ' || conversation.platform
    END;
    
    -- Create detailed alert message
    alert_message := CASE 
        WHEN conversation.sentiment IS NOT NULL THEN
            'Sentiment: ' || UPPER(LEFT(conversation.sentiment, 1)) || SUBSTRING(conversation.sentiment, 2) || 
            ' (' || ROUND(COALESCE(conversation.sentiment_confidence, 0) * 100) || '% confidence)' ||
            CASE WHEN conversation.author IS NOT NULL THEN E'\nAuthor: ' || conversation.author ELSE '' END ||
            CASE WHEN array_length(conversation.keywords, 1) > 0 THEN E'\nKeywords: ' || array_to_string(conversation.keywords, ', ') ELSE '' END ||
            E'\n\nContent: ' || LEFT(conversation.content, 300) ||
            CASE WHEN LENGTH(conversation.content) > 300 THEN '...' ELSE '' END
        ELSE
            CASE WHEN conversation.author IS NOT NULL THEN 'Author: ' || conversation.author || E'\n\n' ELSE '' END ||
            'Content: ' || LEFT(conversation.content, 300) ||
            CASE WHEN LENGTH(conversation.content) > 300 THEN '...' ELSE '' END
    END;
    
    -- Set expiration time based on priority
    DECLARE
        expires_at TIMESTAMP WITH TIME ZONE;
    BEGIN
        expires_at := CASE alert_priority
            WHEN 'urgent' THEN NOW() + INTERVAL '1 day'
            WHEN 'high' THEN NOW() + INTERVAL '3 days'
            WHEN 'medium' THEN NOW() + INTERVAL '1 week'
            WHEN 'low' THEN NOW() + INTERVAL '2 weeks'
        END;
    END;
    
    -- Insert alert with enhanced metadata
    INSERT INTO alerts (
        tenant_id,
        keyword_id,
        conversation_id,
        alert_configuration_id,
        priority,
        title,
        message,
        expires_at,
        metadata
    ) VALUES (
        p_tenant_id,
        matched_keyword_id,
        p_conversation_id,
        p_config_id,
        alert_priority,
        alert_title,
        alert_message,
        expires_at,
        jsonb_build_object(
            'platform', conversation.platform,
            'sentiment', conversation.sentiment,
            'confidence', conversation.sentiment_confidence,
            'author', conversation.author,
            'url', conversation.url,
            'keywords', conversation.keywords,
            'engagement_metrics', conversation.engagement_metrics,
            'priority_factors', jsonb_build_object(
                'sentiment_impact', CASE WHEN conversation.sentiment = 'negative' THEN 'high' ELSE 'low' END,
                'platform_influence', CASE 
                    WHEN conversation.platform IN ('news', 'blog') THEN 'high'
                    WHEN conversation.platform IN ('twitter', 'reddit', 'linkedin') THEN 'medium'
                    ELSE 'low'
                END,
                'keyword_matches', COALESCE(array_length(conversation.keywords, 1), 0)
            )
        )
    ) RETURNING id INTO alert_id;
    
    RETURN alert_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to automatically create alerts for new conversations
CREATE OR REPLACE FUNCTION trigger_conversation_alerts()
RETURNS TRIGGER AS $$
DECLARE
    config RECORD;
    alert_id UUID;
    conversation_data JSONB;
BEGIN
    -- Build conversation data for alert checking
    conversation_data := jsonb_build_object(
        'platform', NEW.platform,
        'sentiment', NEW.sentiment,
        'sentiment_confidence', NEW.sentiment_confidence,
        'content', NEW.content,
        'author', NEW.author,
        'keywords', NEW.keywords
    );
    
    -- Check all active alert configurations for this tenant
    FOR config IN 
        SELECT * FROM alert_configurations 
        WHERE tenant_id = NEW.tenant_id AND is_active = true
    LOOP
        -- Check if this conversation should trigger an alert
        IF should_trigger_alert(config.id, conversation_data) THEN
            -- Create alert
            SELECT create_alert_from_conversation(NEW.tenant_id, NEW.id, config.id) INTO alert_id;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic alert creation
CREATE TRIGGER conversation_alert_trigger
    AFTER INSERT ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_conversation_alerts();

-- Enable realtime for alerts table
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE alert_configurations;
ALTER PUBLICATION supabase_realtime ADD TABLE alert_notification_preferences;