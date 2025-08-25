-- Fix RLS policies for tenant creation
-- Run this in Supabase SQL Editor if the debug shows RLS issues

-- Temporarily disable RLS to test
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Re-enable with corrected policies
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
DROP POLICY IF EXISTS "Users can create tenants" ON tenants;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Create corrected policies
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

CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid());

-- Test the setup
SELECT 'RLS policies updated successfully' as message;