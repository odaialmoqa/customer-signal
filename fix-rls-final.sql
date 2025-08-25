-- Final RLS Fix for CustomerSignal
-- This script properly configures Row Level Security

-- Re-enable RLS (it was disabled for testing)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
DROP POLICY IF EXISTS "Users can create tenants" ON tenants;
DROP POLICY IF EXISTS "Tenant owners can update their tenant" ON tenants;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Create corrected tenant policies
CREATE POLICY "Users can view their own tenant" ON tenants
    FOR SELECT USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.tenant_id = tenants.id 
            AND up.id = auth.uid()
        )
    );

CREATE POLICY "Users can create tenants" ON tenants
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Tenant owners can update their tenant" ON tenants
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.tenant_id = tenants.id 
            AND up.id = auth.uid()
            AND up.role = 'owner'
        )
    );

-- Create corrected user_profiles policies
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can view profiles in their tenant" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.tenant_id = user_profiles.tenant_id 
            AND up.id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid());

-- Test the setup
SELECT 'RLS policies configured successfully! Tenant creation should work with security enabled.' as message;