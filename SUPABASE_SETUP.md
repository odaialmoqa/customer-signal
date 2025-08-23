# Supabase Setup Guide

This guide will help you set up Supabase CLI access and deploy the multi-tenant database schema.

## Current Status ✅

- **Supabase CLI**: Installed and authenticated
- **Project Linked**: mentionScout (hwwhvqcxhtrtslirulji)
- **Environment Variables**: Configured in `.env.local`
- **Migrations**: Ready to deploy

## Next Steps

### 1. Get Database Password

1. Go to your Supabase dashboard: [Database Settings](https://supabase.com/dashboard/project/hwwhvqcxhtrtslirulji/settings/database)
2. Scroll down to the "Database password" section
3. Either use your existing password or click "Generate new password"
4. Copy the password for the next step

### 2. Deploy Database Schema

Run the following command to deploy all migrations:

```bash
./supabase-cli db push
```

When prompted, enter your database password from step 1.

This will create:
- Multi-tenant tables (tenants, user_profiles, etc.)
- Row Level Security (RLS) policies
- Indexes and triggers
- Invitation system

### 3. Verify Setup

After successful deployment, you can:

```bash
# Check migration status
./supabase-cli migration list

# Start local development
npm run dev
```

## Project Configuration

### Environment Variables (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://hwwhvqcxhtrtslirulji.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Database Schema Overview

The multi-tenant architecture includes:

1. **tenants** - Organization/company data
2. **user_profiles** - User accounts with roles (owner/admin/member)
3. **tenant_invitations** - User invitation system
4. **keywords** - Monitoring keywords per tenant
5. **conversations** - Captured mentions and discussions
6. **integrations** - External service connections
7. **alerts** - Notification system
8. **reports** - Generated reports

All tables have Row Level Security (RLS) enabled for complete data isolation between tenants.

## Available Commands

```bash
# List projects
./supabase-cli projects list

# Deploy migrations
./supabase-cli db push

# Pull remote schema
./supabase-cli db pull

# Check migration status
./supabase-cli migration list

# Start local Supabase (optional)
./supabase-cli start

# Stop local Supabase
./supabase-cli stop
```

## Troubleshooting

### Connection Issues
- Ensure your database password is correct
- Check that your IP is allowed in Supabase dashboard
- Verify the project reference ID is correct

### Migration Issues
- Check migration files in `supabase/migrations/`
- Ensure proper SQL syntax
- Verify RLS policies don't conflict

### Authentication Issues
- Run `./supabase-cli login` to re-authenticate
- Check that you have proper project permissions

## Testing

After setup, you can run the test suite:

```bash
# Unit tests
npm test

# Integration tests (requires database connection)
npm run test:integration
```

## Support

If you encounter issues:
1. Check the [Supabase documentation](https://supabase.com/docs)
2. Review the migration files for any syntax errors
3. Ensure your database password is correct
4. Check the Supabase dashboard for any error messages