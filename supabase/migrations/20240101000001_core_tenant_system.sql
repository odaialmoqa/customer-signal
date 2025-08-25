-- Core Tenant System Migration
-- This migration creates the fundamental tenant and user management tables

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT tenants_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100)$')
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT user_profiles_role_check CHECK (role IN ('owner', 'admin', 'member')),
    CONSTRAINT user_profiles_email_format CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$'),$'),
    CONSTRAINT user_profiles_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100)
);

-- Create tenant_users table for many-to-many relationship (for future multi-tenant support)
CREATE TABLE IF NOT EXISTS tenant_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT tenant_users_role_check CHECK (role IN ('owner', 'admin', 'member')),
    UNIQUE(tenant_id, user_id)
);

-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenants
CREATE POLICY "Users can view their own tenant" ON tenants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.tenant_id = tenants.id 
            AND up.id = auth.uid()
        )
    );

CREATE POLICY "Users can create tenants" ON tenants
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Tenant owners can update their tenant" ON tenants
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.tenant_id = tenants.id 
            AND up.id = auth.uid()
            AND up.role = 'owner'
        )
    );

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view profiles in their tenant" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.tenant_id = user_profiles.tenant_id 
            AND up.id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for tenant_users
CREATE POLICY "Users can view tenant memberships in their tenant" ON tenant_users
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.tenant_id = tenant_users.tenant_id 
            AND up.id = auth.uid()
            AND up.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Users can join tenants" ON tenant_users
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenants_created_by ON tenants(created_by);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id ON user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_role ON tenant_users(role);

-- Create function to generate tenant slug
CREATE OR REPLACE FUNCTION generate_tenant_slug(tenant_name TEXT)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Convert name to slug format
    base_slug := lower(regexp_replace(trim(tenant_name), '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');$', '', 'g');
    
    -- Ensure slug is not empty
    IF base_slug = '' THEN
        base_slug := 'tenant';
    END IF;
    
    -- Find unique slug
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM tenants WHERE slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically create tenant slug
CREATE OR REPLACE FUNCTION set_tenant_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL THEN
        NEW.slug := generate_tenant_slug(NEW.name);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set tenant slug
CREATE TRIGGER trigger_set_tenant_slug
    BEFORE INSERT ON tenants
    FOR EACH ROW EXECUTE FUNCTION set_tenant_slug();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER trigger_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_tenant_users_updated_at
    BEFORE UPDATE ON tenant_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create tenant-user relationship
CREATE OR REPLACE FUNCTION create_tenant_user_relationship()
RETURNS TRIGGER AS $$
BEGIN
    -- Create tenant_users entry when user_profile is created
    INSERT INTO tenant_users (tenant_id, user_id, role)
    VALUES (NEW.tenant_id, NEW.id, NEW.role)
    ON CONFLICT (tenant_id, user_id) DO UPDATE SET
        role = NEW.role,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain tenant_users relationship
CREATE TRIGGER trigger_create_tenant_user_relationship
    AFTER INSERT OR UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION create_tenant_user_relationship();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON tenants TO authenticated;
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON tenant_users TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE tenants IS 'Organizations/companies using the platform';
COMMENT ON TABLE user_profiles IS 'Extended user information linked to auth.users';
COMMENT ON TABLE tenant_users IS 'Many-to-many relationship between tenants and users';

COMMENT ON FUNCTION generate_tenant_slug IS 'Generates a unique URL-friendly slug for tenants';
COMMENT ON FUNCTION set_tenant_slug IS 'Automatically sets tenant slug on insert';
COMMENT ON FUNCTION create_tenant_user_relationship IS 'Maintains tenant_users relationship when user_profiles change';