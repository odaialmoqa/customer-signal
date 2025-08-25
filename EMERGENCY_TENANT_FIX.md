# 🚨 Emergency Tenant Creation Fix

## 🔍 Issue Identified
The production API is returning **405 Method Not Allowed** instead of the expected 401 Unauthorized. This means the API route isn't properly deployed or there's a routing issue.

## 🚀 Immediate Solution

Since the database is set up correctly, let's create a **temporary workaround** by manually creating your tenant in the database:

### Step 1: Get Your User ID
1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication > Users**
3. Find your user account and **copy the User ID** (UUID)

### Step 2: Create Your Tenant Manually
In the **Supabase SQL Editor**, run this script (replace `YOUR_USER_ID` with your actual user ID):

```sql
-- Replace YOUR_USER_ID with your actual user ID from Step 1
-- Replace 'Your Company Name' with your desired company name

-- Create the tenant
INSERT INTO tenants (name) 
VALUES ('Your Company Name') 
RETURNING id;

-- Note the tenant ID from the result above, then run this:
-- Replace YOUR_USER_ID and TENANT_ID_FROM_ABOVE
INSERT INTO user_profiles (id, tenant_id, email, name, role)
VALUES (
    'YOUR_USER_ID',  -- Replace with your user ID
    'TENANT_ID_FROM_ABOVE',  -- Replace with tenant ID from previous query
    'your-email@example.com',  -- Replace with your email
    'Your Name',  -- Replace with your name
    'owner'
);
```

### Step 3: Test Access
1. Go back to your CustomerSignal app
2. **Refresh the page**
3. You should now be able to access the dashboard!

## 🔧 Alternative: Simplified Manual Creation

If the above is too complex, run this **single query** (replace the values):

```sql
-- One-step tenant and profile creation
WITH new_tenant AS (
    INSERT INTO tenants (name) 
    VALUES ('Your Company Name') 
    RETURNING id
)
INSERT INTO user_profiles (id, tenant_id, email, name, role)
SELECT 
    'YOUR_USER_ID',  -- Replace with your user ID
    new_tenant.id,
    'your-email@example.com',  -- Replace with your email
    'Your Name',  -- Replace with your name
    'owner'
FROM new_tenant;
```

## 🎯 Why This Works

1. **Database is ready** ✅ - Tables exist and are configured
2. **Manual creation bypasses API** ✅ - Avoids the 405 error
3. **Same result as normal flow** ✅ - Creates tenant and associates user

## 📞 After Manual Creation

Once you've manually created your tenant:
1. **Refresh your browser**
2. **Go to the dashboard** - should work now
3. **Start using CustomerSignal** - all features should be available

## 🔄 Long-term Fix

I'll continue investigating the 405 API error and deploy a proper fix, but this manual approach will get you up and running immediately.

---

**This is a one-time manual setup** - once done, everything will work normally!