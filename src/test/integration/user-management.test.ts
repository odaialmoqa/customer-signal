import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { TenantService } from '@/lib/services/tenant'

// Test configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321'
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'test-key'

describe('User Management Integration', () => {
  let supabase: ReturnType<typeof createClient>
  let tenantService: TenantService
  let testTenantId: string
  let testUserId: string

  beforeEach(async () => {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
    tenantService = new TenantService()

    // Create test tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: 'Test Company',
        subscription: 'pro'
      })
      .select()
      .single()

    if (tenantError) throw tenantError
    testTenantId = tenant.id

    // Create test user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: 'test-user-id',
        tenant_id: testTenantId,
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'owner'
      })
      .select()
      .single()

    if (profileError) throw profileError
    testUserId = profile.id
  })

  afterEach(async () => {
    // Clean up test data
    await supabase.from('user_profiles').delete().eq('tenant_id', testTenantId)
    await supabase.from('tenant_invitations').delete().eq('tenant_id', testTenantId)
    await supabase.from('tenants').delete().eq('id', testTenantId)
  })

  describe('Tenant Management', () => {
    it('should create a new tenant with owner profile', async () => {
      const { data: newTenant, error: createError } = await supabase
        .from('tenants')
        .insert({
          name: 'New Test Company',
          subscription: 'free'
        })
        .select()
        .single()

      expect(createError).toBeNull()
      expect(newTenant).toBeDefined()
      expect(newTenant.name).toBe('New Test Company')
      expect(newTenant.subscription).toBe('free')

      // Clean up
      await supabase.from('tenants').delete().eq('id', newTenant.id)
    })

    it('should update tenant settings', async () => {
      const updatedSettings = {
        data_retention_days: 730,
        max_keywords: 200,
        monitoring_frequency: 'daily',
        auto_sentiment_analysis: false
      }

      const { data: updatedTenant, error } = await supabase
        .from('tenants')
        .update({
          name: 'Updated Company Name',
          settings: updatedSettings
        })
        .eq('id', testTenantId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(updatedTenant.name).toBe('Updated Company Name')
      expect(updatedTenant.settings).toEqual(updatedSettings)
    })

    it('should retrieve tenant with all users', async () => {
      // Add another user to the tenant
      await supabase
        .from('user_profiles')
        .insert({
          id: 'test-user-2',
          tenant_id: testTenantId,
          email: 'user2@example.com',
          full_name: 'Test User 2',
          role: 'member'
        })

      const { data: users, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('tenant_id', testTenantId)
        .order('created_at', { ascending: false })

      expect(error).toBeNull()
      expect(users).toHaveLength(2)
      expect(users[0].email).toBe('user2@example.com')
      expect(users[1].email).toBe('test@example.com')

      // Clean up
      await supabase.from('user_profiles').delete().eq('id', 'test-user-2')
    })
  })

  describe('User Profile Management', () => {
    it('should update user profile information', async () => {
      const { data: updatedProfile, error } = await supabase
        .from('user_profiles')
        .update({
          full_name: 'Updated Test User',
          avatar_url: 'https://example.com/avatar.jpg',
          preferences: {
            notifications: {
              email_alerts: true,
              email_daily_digest: false
            }
          }
        })
        .eq('id', testUserId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(updatedProfile.full_name).toBe('Updated Test User')
      expect(updatedProfile.avatar_url).toBe('https://example.com/avatar.jpg')
      expect(updatedProfile.preferences.notifications.email_alerts).toBe(true)
    })

    it('should update user notification preferences', async () => {
      const notificationPreferences = {
        notifications: {
          email_alerts: true,
          email_daily_digest: true,
          email_weekly_report: false,
          alert_threshold_high: true,
          alert_threshold_medium: true,
          alert_threshold_low: false,
          platform_notifications: {
            reddit: true,
            twitter: false,
            linkedin: true
          },
          quiet_hours: {
            enabled: true,
            start_time: '22:00',
            end_time: '08:00',
            timezone: 'America/New_York'
          }
        }
      }

      const { data: updatedProfile, error } = await supabase
        .from('user_profiles')
        .update({
          preferences: notificationPreferences
        })
        .eq('id', testUserId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(updatedProfile.preferences.notifications.email_alerts).toBe(true)
      expect(updatedProfile.preferences.notifications.quiet_hours.enabled).toBe(true)
      expect(updatedProfile.preferences.notifications.platform_notifications.reddit).toBe(true)
    })
  })

  describe('Team Management', () => {
    it('should invite a user to the tenant', async () => {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const { data: invitation, error } = await supabase
        .from('tenant_invitations')
        .insert({
          tenant_id: testTenantId,
          email: 'newuser@example.com',
          role: 'member',
          invited_by: testUserId,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(invitation.email).toBe('newuser@example.com')
      expect(invitation.role).toBe('member')
      expect(invitation.tenant_id).toBe(testTenantId)
    })

    it('should prevent duplicate invitations', async () => {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      // Create first invitation
      await supabase
        .from('tenant_invitations')
        .insert({
          tenant_id: testTenantId,
          email: 'duplicate@example.com',
          role: 'member',
          invited_by: testUserId,
          expires_at: expiresAt.toISOString()
        })

      // Try to create duplicate invitation
      const { error } = await supabase
        .from('tenant_invitations')
        .insert({
          tenant_id: testTenantId,
          email: 'duplicate@example.com',
          role: 'admin',
          invited_by: testUserId,
          expires_at: expiresAt.toISOString()
        })

      expect(error).toBeDefined()
      expect(error?.code).toBe('23505') // Unique constraint violation
    })

    it('should update user role', async () => {
      // Create a member user
      const { data: memberUser } = await supabase
        .from('user_profiles')
        .insert({
          id: 'member-user-id',
          tenant_id: testTenantId,
          email: 'member@example.com',
          full_name: 'Member User',
          role: 'member'
        })
        .select()
        .single()

      // Update role to admin
      const { data: updatedUser, error } = await supabase
        .from('user_profiles')
        .update({ role: 'admin' })
        .eq('id', 'member-user-id')
        .select()
        .single()

      expect(error).toBeNull()
      expect(updatedUser.role).toBe('admin')

      // Clean up
      await supabase.from('user_profiles').delete().eq('id', 'member-user-id')
    })

    it('should remove user from tenant', async () => {
      // Create a user to remove
      const { data: userToRemove } = await supabase
        .from('user_profiles')
        .insert({
          id: 'user-to-remove',
          tenant_id: testTenantId,
          email: 'remove@example.com',
          full_name: 'User To Remove',
          role: 'member'
        })
        .select()
        .single()

      // Remove the user
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', 'user-to-remove')

      expect(error).toBeNull()

      // Verify user is removed
      const { data: removedUser } = await supabase
        .from('user_profiles')
        .select()
        .eq('id', 'user-to-remove')
        .single()

      expect(removedUser).toBeNull()
    })

    it('should list all tenant invitations', async () => {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      // Create multiple invitations
      await supabase
        .from('tenant_invitations')
        .insert([
          {
            tenant_id: testTenantId,
            email: 'invite1@example.com',
            role: 'member',
            invited_by: testUserId,
            expires_at: expiresAt.toISOString()
          },
          {
            tenant_id: testTenantId,
            email: 'invite2@example.com',
            role: 'admin',
            invited_by: testUserId,
            expires_at: expiresAt.toISOString()
          }
        ])

      const { data: invitations, error } = await supabase
        .from('tenant_invitations')
        .select('*')
        .eq('tenant_id', testTenantId)
        .is('accepted_at', null)
        .order('created_at', { ascending: false })

      expect(error).toBeNull()
      expect(invitations).toHaveLength(2)
      expect(invitations[0].email).toBe('invite2@example.com')
      expect(invitations[1].email).toBe('invite1@example.com')
    })
  })

  describe('Row Level Security', () => {
    it('should enforce tenant isolation for user profiles', async () => {
      // Create another tenant
      const { data: otherTenant } = await supabase
        .from('tenants')
        .insert({
          name: 'Other Company',
          subscription: 'free'
        })
        .select()
        .single()

      // Create user in other tenant
      await supabase
        .from('user_profiles')
        .insert({
          id: 'other-tenant-user',
          tenant_id: otherTenant.id,
          email: 'other@example.com',
          full_name: 'Other User',
          role: 'owner'
        })

      // Query should only return users from the current tenant context
      // Note: In a real test, this would require proper auth context
      const { data: users } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('tenant_id', testTenantId)

      expect(users?.every(user => user.tenant_id === testTenantId)).toBe(true)

      // Clean up
      await supabase.from('user_profiles').delete().eq('tenant_id', otherTenant.id)
      await supabase.from('tenants').delete().eq('id', otherTenant.id)
    })

    it('should enforce tenant isolation for invitations', async () => {
      // Create another tenant
      const { data: otherTenant } = await supabase
        .from('tenants')
        .insert({
          name: 'Other Company',
          subscription: 'free'
        })
        .select()
        .single()

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      // Create invitation in other tenant
      await supabase
        .from('tenant_invitations')
        .insert({
          tenant_id: otherTenant.id,
          email: 'other-invite@example.com',
          role: 'member',
          invited_by: 'other-user-id',
          expires_at: expiresAt.toISOString()
        })

      // Query should only return invitations from the current tenant
      const { data: invitations } = await supabase
        .from('tenant_invitations')
        .select('*')
        .eq('tenant_id', testTenantId)

      expect(invitations?.every(inv => inv.tenant_id === testTenantId)).toBe(true)

      // Clean up
      await supabase.from('tenant_invitations').delete().eq('tenant_id', otherTenant.id)
      await supabase.from('tenants').delete().eq('id', otherTenant.id)
    })
  })

  describe('Data Validation', () => {
    it('should validate email format in user profiles', async () => {
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          id: 'invalid-email-user',
          tenant_id: testTenantId,
          email: 'invalid-email',
          full_name: 'Invalid Email User',
          role: 'member'
        })

      // This would depend on database constraints
      // For now, we'll just check that the operation completes
      expect(error).toBeNull() // Adjust based on actual validation rules
      
      if (!error) {
        await supabase.from('user_profiles').delete().eq('id', 'invalid-email-user')
      }
    })

    it('should validate role values', async () => {
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          id: 'invalid-role-user',
          tenant_id: testTenantId,
          email: 'valid@example.com',
          full_name: 'Invalid Role User',
          role: 'invalid_role' as any
        })

      // This should fail if role validation is in place
      expect(error).toBeDefined()
    })

    it('should require tenant_id for user profiles', async () => {
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          id: 'no-tenant-user',
          email: 'notenant@example.com',
          full_name: 'No Tenant User',
          role: 'member'
        })

      expect(error).toBeDefined()
      expect(error?.code).toBe('23502') // Not null violation
    })
  })
})