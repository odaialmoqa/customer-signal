# 🗄️ Database Setup Guide - URGENT FIX NEEDED

## 🚨 Current Issue
The workspace creation is failing because the required database tables don't exist in your Supabase database.

**Error**: "Failed to create tenant"  
**Cause**: Missing `tenants` and `user_profiles` tables

## 🚀 Quick Fix (5 minutes)

### Step 1: Access Your Supabase Dashboard
1. Go to [supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your CustomerSignal project

### Step 2: Run the Database Setup Script
1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy and paste this SQL script:

```sql
-- Emergency Database Setup Script
-- Creates the required tables for tenant management

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
    CONSTRAINT tenants_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100)
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT user_profiles_role_check CHECK (role IN ('owner', 'admin', 'member')),
    CONSTRAINT user_profiles_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100)
);

-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

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

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

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

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON tenants TO authenticated;
GRANT ALL ON user_profiles TO authenticated;
```

4. Click **"Run"** to execute the script
5. You should see "Success. No rows returned" or similar

### Step 3: Test the Fix
1. Go back to your CustomerSignal app
2. Refresh the workspace creation page
3. Try creating your workspace again
4. It should now work! 🎉

## 🔍 Verification

After running the script, you can verify it worked by:

1. In Supabase dashboard, go to **Table Editor**
2. You should see two new tables:
   - `tenants`
   - `user_profiles`

## 🎯 What This Script Does

- **Creates `tenants` table**: Stores workspace/company information
- **Creates `user_profiles` table**: Links users to tenants with roles
- **Sets up security policies**: Ensures users can only access their own data
- **Adds constraints**: Validates data integrity
- **Grants permissions**: Allows the app to read/write data

## 🚨 If You Still Get Errors

If you still see "Failed to create tenant" after running the script:

1. **Check the SQL Editor output** for any error messages
2. **Verify the tables exist** in the Table Editor
3. **Try refreshing your app** and attempting workspace creation again
4. **Check browser console** for any JavaScript errors

## 📞 Alternative: Manual Table Creation

If the SQL script doesn't work, you can create tables manually:

1. Go to **Table Editor** in Supabase
2. Click **"New Table"**
3. Create table named `tenants` with columns:
   - `id` (uuid, primary key, default: gen_random_uuid())
   - `name` (text, required)
   - `created_by` (uuid, foreign key to auth.users)
   - `created_at` (timestamptz, default: now())
   - `updated_at` (timestamptz, default: now())

4. Create table named `user_profiles` with columns:
   - `id` (uuid, primary key, foreign key to auth.users)
   - `tenant_id` (uuid, foreign key to tenants)
   - `email` (text, required)
   - `name` (text, required)
   - `role` (text, default: 'owner')
   - `created_at` (timestamptz, default: now())
   - `updated_at` (timestamptz, default: now())

## 🎉 After Setup

Once the database is set up:

1. **Create your workspace** - should work immediately
2. **Complete onboarding** - set up your first keywords
3. **Explore the dashboard** - start monitoring conversations
4. **Set up alerts** - get notified of important mentions

---

**This is a one-time setup**. Once completed, all future users will be able to create workspaces without issues.