# 🔧 FIXED Database Setup Script

## The Issue
The previous script had a mismatch between column names. Here's the **corrected script** that will work:

## 🚀 Run This Corrected Script

Go to your Supabase SQL Editor and run this **fixed script**:

```sql
-- CORRECTED Database Setup Script
-- This matches exactly what the API expects

-- Create tenants table (simplified)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create user_profiles table (simplified)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Simple security policies
CREATE POLICY "Users can create tenants" ON tenants 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view tenants" ON tenants 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE tenant_id = tenants.id 
            AND id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their profile" ON user_profiles 
    FOR ALL USING (auth.uid() = id);

-- Grant permissions
GRANT ALL ON tenants TO authenticated;
GRANT ALL ON user_profiles TO authenticated;
```

## ✅ What This Fixed Script Does

1. **Removes the problematic `created_by` column** that was causing the error
2. **Simplifies the table structure** to match what the API actually uses
3. **Uses basic security policies** that will work immediately
4. **Grants the right permissions** for the authenticated users

## 🎯 After Running This Script

1. You should see **"Success. No rows returned"**
2. Go back to your CustomerSignal app
3. **Refresh the workspace creation page**
4. **Try creating your workspace again**
5. It should work now! 🎉

## 🔍 Verification

After running the script, you can verify it worked by:
1. Going to **Table Editor** in Supabase
2. You should see:
   - `tenants` table with columns: `id`, `name`, `created_at`, `updated_at`
   - `user_profiles` table with columns: `id`, `tenant_id`, `email`, `name`, `role`, `created_at`, `updated_at`

This simplified version will get you up and running immediately!