# Multi-Tenant Architecture Implementation

This document describes the multi-tenant architecture implementation for CustomerSignal using Supabase Row Level Security (RLS).

## Overview

The multi-tenant architecture ensures complete data isolation between different organizations (tenants) while providing role-based access control within each tenant.

## Database Schema

### Core Tables

1. **tenants** - Organizations/companies
2. **user_profiles** - User accounts linked to tenants with roles
3. **tenant_invitations** - Invitation system for adding users to tenants
4. **keywords, conversations, integrations, alerts, reports** - All tenant-scoped data

### Row Level Security (RLS)

All tables have RLS enabled with policies that:
- Automatically filter data by the current user's tenant
- Enforce role-based permissions for administrative actions
- Prevent cross-tenant data access

## Key Components

### 1. TenantService (`src/lib/services/tenant.ts`)

Handles all tenant-related operations:
- Creating new tenants
- Managing user profiles and roles
- Invitation system
- Role-based access control

### 2. useTenant Hook (`src/lib/hooks/useTenant.ts`)

React hook providing:
- Current tenant and user profile data
- Role checking utilities
- Tenant creation and invitation acceptance

### 3. Authentication Flow

1. **Sign Up**: User creates account
2. **Onboarding**: User either creates a new tenant or accepts an invitation
3. **Dashboard**: User accesses tenant-scoped data

## User Roles

- **Owner**: Full control over tenant, cannot be removed
- **Admin**: Can manage users and invite new members
- **Member**: Can view and interact with tenant data

## Security Features

### Data Isolation
- RLS policies ensure users only see their tenant's data
- Helper function `get_user_tenant_id()` automatically filters queries
- Cross-tenant access attempts return empty results

### Role-Based Access
- Invitation creation requires admin or owner role
- User role changes require admin permissions
- Owner role cannot be changed or removed

### Invitation System
- Time-limited invitations (7 days expiry)
- Email-based invitation acceptance
- Prevents duplicate invitations

## Testing

### Unit Tests
- TenantService methods
- useTenant hook functionality
- Role checking logic

### Integration Tests
- RLS policy enforcement
- Cross-tenant data isolation
- Role-based access control

Run tests with:
```bash
npm test                    # Unit tests
npm run test:integration   # Integration tests (requires Supabase)
```

## Database Migrations

The implementation includes several migrations:

1. `20240101000001_initial_schema.sql` - Core tables and types
2. `20240101000002_rls_policies.sql` - RLS policies
3. `20240101000003_indexes_and_triggers.sql` - Performance optimizations
4. `20240101000004_tenant_invitations.sql` - Invitation system

## Usage Examples

### Creating a Tenant
```typescript
const tenantService = new TenantService()
const result = await tenantService.createTenant({ name: 'My Company' })
```

### Inviting Users
```typescript
await tenantService.inviteUser({
  email: 'user@example.com',
  role: 'member'
})
```

### Role Checking
```typescript
const { hasRole, canManageUsers } = useTenant()

if (hasRole('admin')) {
  // Admin-only functionality
}

if (canManageUsers()) {
  // Show user management UI
}
```

## Security Considerations

1. **RLS Policies**: All data access is filtered by tenant automatically
2. **Role Validation**: Server-side role checking prevents privilege escalation
3. **Invitation Security**: Time-limited invitations with email verification
4. **Owner Protection**: Owner role cannot be changed or removed

## Performance Optimizations

- Indexes on tenant_id columns for fast filtering
- Efficient RLS policies using helper functions
- Connection pooling for database access
- Caching for frequently accessed tenant data

## Monitoring and Maintenance

- RLS policies are automatically enforced by PostgreSQL
- Regular testing ensures data isolation
- Audit logs track user management actions
- Performance monitoring for query optimization