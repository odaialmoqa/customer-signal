-- Onboarding System Migration
-- This migration creates tables and functions for the user onboarding system

-- Create onboarding_progress table
CREATE TABLE IF NOT EXISTS onboarding_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    current_step INTEGER NOT NULL DEFAULT 0,
    completed_steps TEXT[] NOT NULL DEFAULT '{}',
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Ensure one progress record per user per tenant
    UNIQUE(user_id, tenant_id)
);

-- Create help_articles table for documentation system
CREATE TABLE IF NOT EXISTS help_articles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    category TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    author TEXT NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    read_time INTEGER, -- in minutes
    rating DECIMAL(3,2) DEFAULT 0,
    views INTEGER DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create help_categories table
CREATE TABLE IF NOT EXISTS help_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    article_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create faqs table
CREATE TABLE IF NOT EXISTS faqs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    is_popular BOOLEAN NOT NULL DEFAULT FALSE,
    views INTEGER DEFAULT 0,
    helpful_votes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create user_tours table to track completed interactive tours
CREATE TABLE IF NOT EXISTS user_tours (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tour_id TEXT NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Ensure one completion record per user per tour
    UNIQUE(user_id, tour_id)
);

-- Add RLS policies for onboarding_progress
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own onboarding progress" ON onboarding_progress
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM tenant_users tu 
            WHERE tu.tenant_id = onboarding_progress.tenant_id 
            AND tu.user_id = auth.uid()
            AND tu.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Users can insert their own onboarding progress" ON onboarding_progress
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM tenant_users tu 
            WHERE tu.tenant_id = onboarding_progress.tenant_id 
            AND tu.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own onboarding progress" ON onboarding_progress
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM tenant_users tu 
            WHERE tu.tenant_id = onboarding_progress.tenant_id 
            AND tu.user_id = auth.uid()
            AND tu.role IN ('admin', 'owner')
        )
    );

-- Add RLS policies for help_articles (public read access)
ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published help articles" ON help_articles
    FOR SELECT USING (is_published = TRUE);

-- Add RLS policies for help_categories (public read access)
ALTER TABLE help_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view help categories" ON help_categories
    FOR SELECT USING (TRUE);

-- Add RLS policies for faqs (public read access)
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view FAQs" ON faqs
    FOR SELECT USING (TRUE);

-- Add RLS policies for user_tours
ALTER TABLE user_tours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tour completions" ON user_tours
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tour completions" ON user_tours
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_tenant ON onboarding_progress(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_tenant ON onboarding_progress(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_completed ON onboarding_progress(is_completed);

CREATE INDEX IF NOT EXISTS idx_help_articles_category ON help_articles(category);
CREATE INDEX IF NOT EXISTS idx_help_articles_published ON help_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_help_articles_published_at ON help_articles(published_at DESC);

CREATE INDEX IF NOT EXISTS idx_faqs_category ON faqs(category);
CREATE INDEX IF NOT EXISTS idx_faqs_popular ON faqs(is_popular);
CREATE INDEX IF NOT EXISTS idx_faqs_updated ON faqs(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_tours_user ON user_tours(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tours_tour ON user_tours(tour_id);

-- Create function to update article count in categories
CREATE OR REPLACE FUNCTION update_category_article_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the article count for the affected category
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE help_categories 
        SET article_count = (
            SELECT COUNT(*) 
            FROM help_articles 
            WHERE category = NEW.category AND is_published = TRUE
        ),
        updated_at = NOW()
        WHERE id = NEW.category;
    END IF;
    
    IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.category != NEW.category) THEN
        UPDATE help_categories 
        SET article_count = (
            SELECT COUNT(*) 
            FROM help_articles 
            WHERE category = OLD.category AND is_published = TRUE
        ),
        updated_at = NOW()
        WHERE id = OLD.category;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update category article counts
CREATE TRIGGER trigger_update_category_article_count
    AFTER INSERT OR UPDATE OR DELETE ON help_articles
    FOR EACH ROW EXECUTE FUNCTION update_category_article_count();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER trigger_onboarding_progress_updated_at
    BEFORE UPDATE ON onboarding_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_help_categories_updated_at
    BEFORE UPDATE ON help_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_faqs_updated_at
    BEFORE UPDATE ON faqs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default help categories
INSERT INTO help_categories (id, name, description, icon, order_index) VALUES
    ('getting-started', 'Getting Started', 'Learn the basics of CustomerSignal', 'play-circle', 1),
    ('keywords', 'Keywords & Monitoring', 'Managing keywords and monitoring setup', 'search', 2),
    ('analytics', 'Analytics & Reports', 'Understanding your data and insights', 'bar-chart', 3),
    ('alerts', 'Alerts & Notifications', 'Setting up and managing alerts', 'bell', 4),
    ('integrations', 'Integrations', 'Connecting external platforms', 'link', 5),
    ('account', 'Account & Billing', 'Managing your account and subscription', 'user', 6)
ON CONFLICT (id) DO NOTHING;

-- Insert sample FAQs
INSERT INTO faqs (question, answer, category, tags, is_popular) VALUES
    (
        'How do I add keywords to monitor?',
        'Go to the Keywords page and click "Add Keyword". Enter your keyword, select the platforms you want to monitor, and configure alert settings. You can add multiple keywords at once by separating them with commas.',
        'keywords',
        ARRAY['keywords', 'monitoring', 'setup'],
        TRUE
    ),
    (
        'What platforms does CustomerSignal monitor?',
        'We monitor Twitter/X, Reddit, LinkedIn, Instagram, YouTube, news sites, forums, review platforms (Google Reviews, Yelp, Trustpilot), and many other sources across the web.',
        'getting-started',
        ARRAY['platforms', 'monitoring', 'coverage'],
        TRUE
    ),
    (
        'How accurate is the sentiment analysis?',
        'Our sentiment analysis uses advanced AI models with an accuracy rate of over 85%. The system analyzes context, tone, and emotion to provide nuanced sentiment scores beyond simple positive/negative classifications.',
        'analytics',
        ARRAY['sentiment', 'accuracy', 'ai'],
        TRUE
    ),
    (
        'Can I export my data and reports?',
        'Yes, you can export data in multiple formats including PDF reports, Excel spreadsheets, and CSV files. Go to the Reports section to generate and download custom reports.',
        'analytics',
        ARRAY['export', 'reports', 'data'],
        FALSE
    ),
    (
        'How do I set up alerts for negative mentions?',
        'In the Alerts section, create a new alert rule. Set the sentiment threshold to "Negative" and choose your notification preferences. You can also set volume thresholds and specific keywords for more targeted alerts.',
        'alerts',
        ARRAY['alerts', 'negative', 'notifications'],
        FALSE
    )
ON CONFLICT DO NOTHING;

-- Insert sample help articles
INSERT INTO help_articles (title, content, excerpt, category, tags, author, published_at, read_time, rating, is_published) VALUES
    (
        'Getting Started with CustomerSignal',
        'This comprehensive guide will walk you through setting up your CustomerSignal account and getting started with monitoring your brand across the internet...',
        'Learn how to set up your account and start monitoring conversations',
        'getting-started',
        ARRAY['setup', 'onboarding', 'basics'],
        'CustomerSignal Team',
        NOW(),
        5,
        4.8,
        TRUE
    ),
    (
        'Advanced Keyword Strategies',
        'Choosing the right keywords is crucial for effective brand monitoring. This guide covers best practices for keyword selection, organization, and optimization...',
        'Master keyword selection and organization for better monitoring results',
        'keywords',
        ARRAY['keywords', 'strategy', 'best-practices'],
        'CustomerSignal Team',
        NOW(),
        8,
        4.6,
        TRUE
    )
ON CONFLICT DO NOTHING;

-- Create function to get onboarding statistics
CREATE OR REPLACE FUNCTION get_onboarding_stats(tenant_uuid UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_users', COUNT(*),
        'completed_onboarding', COUNT(*) FILTER (WHERE is_completed = TRUE),
        'in_progress', COUNT(*) FILTER (WHERE is_completed = FALSE),
        'completion_rate', ROUND(
            (COUNT(*) FILTER (WHERE is_completed = TRUE)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 
            2
        ),
        'average_completion_time', AVG(
            EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600
        ) FILTER (WHERE completed_at IS NOT NULL)
    ) INTO result
    FROM onboarding_progress
    WHERE tenant_uuid IS NULL OR tenant_id = tenant_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON onboarding_progress TO authenticated;
GRANT ALL ON help_articles TO authenticated;
GRANT ALL ON help_categories TO authenticated;
GRANT ALL ON faqs TO authenticated;
GRANT ALL ON user_tours TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE onboarding_progress IS 'Tracks user onboarding progress and completion status';
COMMENT ON TABLE help_articles IS 'Stores help documentation articles';
COMMENT ON TABLE help_categories IS 'Organizes help content into categories';
COMMENT ON TABLE faqs IS 'Frequently asked questions and answers';
COMMENT ON TABLE user_tours IS 'Tracks completed interactive tours for users';

COMMENT ON FUNCTION get_onboarding_stats IS 'Returns onboarding completion statistics for analytics';
COMMENT ON FUNCTION update_category_article_count IS 'Automatically updates article counts in categories';
COMMENT ON FUNCTION update_updated_at_column IS 'Updates the updated_at timestamp on record changes';