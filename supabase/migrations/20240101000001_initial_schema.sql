-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE platform_type AS ENUM ('reddit', 'twitter', 'linkedin', 'facebook', 'instagram', 'tiktok', 'youtube', 'yelp', 'google_reviews', 'trustpilot', 'g2', 'capterra', 'stackoverflow', 'quora', 'news', 'blog', 'forum', 'other');
CREATE TYPE sentiment_type AS ENUM ('positive', 'negative', 'neutral');
CREATE TYPE integration_type AS ENUM ('zendesk', 'salesforce', 'hubspot', 'intercom', 'freshdesk', 'csv');
CREATE TYPE integration_status AS ENUM ('active', 'error', 'paused');
CREATE TYPE alert_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Tenants table (organizations)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subscription subscription_tier DEFAULT 'free',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Users table (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'member',
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Keywords table
CREATE TABLE keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    term VARCHAR(255) NOT NULL,
    platforms platform_type[] DEFAULT ARRAY[]::platform_type[],
    is_active BOOLEAN DEFAULT true,
    alert_threshold INTEGER DEFAULT 5,
    monitoring_frequency VARCHAR(20) DEFAULT 'hourly',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, term)
);

-- Enable RLS on keywords
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;

-- Conversations table (captured mentions and discussions)
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author VARCHAR(255),
    platform platform_type NOT NULL,
    url TEXT,
    external_id VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE,
    sentiment sentiment_type,
    sentiment_confidence DECIMAL(3,2),
    keywords TEXT[],
    tags TEXT[],
    engagement_metrics JSONB DEFAULT '{}',
    parent_conversation_id UUID REFERENCES conversations(id),
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, platform, external_id)
);

-- Enable RLS on conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Integrations table
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    type integration_type NOT NULL,
    name VARCHAR(255) NOT NULL,
    config JSONB NOT NULL,
    status integration_status DEFAULT 'active',
    last_sync TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on integrations
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Alerts table
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    keyword_id UUID REFERENCES keywords(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    priority alert_priority DEFAULT 'medium',
    title VARCHAR(255) NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    notified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on alerts
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    config JSONB NOT NULL,
    file_url TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;