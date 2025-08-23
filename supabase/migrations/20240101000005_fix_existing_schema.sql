-- Fix existing schema conflicts and ensure proper multi-tenant setup

-- Ensure extensions are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types if they don't exist
DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE platform_type AS ENUM ('reddit', 'twitter', 'linkedin', 'facebook', 'instagram', 'tiktok', 'youtube', 'yelp', 'google_reviews', 'trustpilot', 'g2', 'capterra', 'stackoverflow', 'quora', 'news', 'blog', 'forum', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sentiment_type AS ENUM ('positive', 'negative', 'neutral');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE integration_type AS ENUM ('zendesk', 'salesforce', 'hubspot', 'intercom', 'freshdesk', 'csv');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE integration_status AS ENUM ('active', 'error', 'paused');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Ensure helper function exists
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $
BEGIN
    RETURN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE id = auth.uid()
    );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure all tables have RLS enabled
ALTER TABLE IF EXISTS tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tenant_invitations ENABLE ROW LEVEL SECURITY;

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add role column to user_profiles if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='role') THEN
        ALTER TABLE user_profiles ADD COLUMN role VARCHAR(50) DEFAULT 'member';
    END IF;
    
    -- Add tenant_id to existing tables if missing
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='keywords') AND 
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='keywords' AND column_name='tenant_id') THEN
        ALTER TABLE keywords ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='conversations') AND 
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='tenant_id') THEN
        ALTER TABLE conversations ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='integrations') AND 
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='integrations' AND column_name='tenant_id') THEN
        ALTER TABLE integrations ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='alerts') AND 
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alerts' AND column_name='tenant_id') THEN
        ALTER TABLE alerts ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='reports') AND 
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reports' AND column_name='tenant_id') THEN
        ALTER TABLE reports ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Ensure critical indexes exist
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id ON user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Update user_profiles to ensure proper role values
UPDATE user_profiles SET role = 'owner' WHERE role IS NULL OR role = '';

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE 'Multi-tenant schema fixes applied successfully';
END $$;