import { createClient } from '@/lib/supabase/client'
import type { 
  Tenant, 
  UserProfile, 
  TenantInvitation, 
  CreateTenantRequest, 
  InviteUserRequest 
} from '@/lib/types/tenant'

export class TenantService {
  private supabase

  constructor() {
    this.supabase = createClient()
  }

  /**
   * Create a new tenant and associate the current user as owner
   */
  async createTenant(request: CreateTenantRequest): Promise<{ tenant: Tenant; profile: UserProfile }> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Start a transaction
    const { data: tenant, error: tenantError } = await this.supabase
      .from('tenants')
      .insert({
        name: request.name,
        subscription: request.subscription || 'free'
      })
      .select()
      .single()

    if (tenantError) throw tenantError

    // Create user profile as owner
    const { data: profile, error: profileError } = await this.supabase
      .from('user_profiles')
      .insert({
        id: user.id,
        tenant_id: tenant.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name,
        role: 'owner'
      })
      .select()
      .single()

    if (profileError) {
      // Rollback tenant creation if profile creation fails
      await this.supabase.from('tenants').delete().eq('id', tenant.id)
      throw profileError
    }

    return { tenant, profile }
  }

  /**
   * Get current user's tenant
   */
  async getCurrentTenant(): Promise<Tenant | null> {
    const { data: profile } = await this.getCurrentUserProfile()
    if (!profile) return null

    const { data: tenant, error } = await this.supabase
      .from('tenants')
      .select('*')
      .eq('id', profile.tenant_id)
      .single()

    if (error) throw error
    return tenant
  }

  /**
   * Get current user's profile
   */
  async getCurrentUserProfile(): Promise<UserProfile | null> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return null

    const { data: profile, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
    return profile
  }

  /**
   * Update tenant settings
   */
  async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<Tenant> {
    const { data: tenant, error } = await this.supabase
      .from('tenants')
      .update(updates)
      .eq('id', tenantId)
      .select()
      .single()

    if (error) throw error
    return tenant
  }

  /**
   * Get all users in the current tenant
   */
  async getTenantUsers(): Promise<UserProfile[]> {
    const { data: users, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return users || []
  }

  /**
   * Invite a user to the tenant
   */
  async inviteUser(request: InviteUserRequest): Promise<TenantInvitation> {
    const profile = await this.getCurrentUserProfile()
    if (!profile) throw new Error('User not authenticated')
    
    // Check if user has permission to invite (owner or admin)
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      throw new Error('Insufficient permissions to invite users')
    }

    // Check if user is already in the tenant
    const { data: existingUser } = await this.supabase
      .from('user_profiles')
      .select('id')
      .eq('email', request.email)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (existingUser) {
      throw new Error('User is already a member of this tenant')
    }

    // Create invitation
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    const { data: invitation, error } = await this.supabase
      .from('tenant_invitations')
      .insert({
        tenant_id: profile.tenant_id,
        email: request.email,
        role: request.role,
        invited_by: profile.id,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (error) throw error

    // TODO: Send invitation email
    // This would typically integrate with an email service
    console.log(`Invitation sent to ${request.email}`)

    return invitation
  }

  /**
   * Accept a tenant invitation
   */
  async acceptInvitation(invitationId: string): Promise<UserProfile> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get the invitation
    const { data: invitation, error: invitationError } = await this.supabase
      .from('tenant_invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('email', user.email!)
      .is('accepted_at', null)
      .single()

    if (invitationError) throw new Error('Invalid or expired invitation')

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error('Invitation has expired')
    }

    // Create user profile
    const { data: profile, error: profileError } = await this.supabase
      .from('user_profiles')
      .insert({
        id: user.id,
        tenant_id: invitation.tenant_id,
        email: user.email!,
        full_name: user.user_metadata?.full_name,
        role: invitation.role
      })
      .select()
      .single()

    if (profileError) throw profileError

    // Mark invitation as accepted
    await this.supabase
      .from('tenant_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitationId)

    return profile
  }

  /**
   * Update user role (owner/admin only)
   */
  async updateUserRole(userId: string, newRole: 'admin' | 'member'): Promise<UserProfile> {
    const currentProfile = await this.getCurrentUserProfile()
    if (!currentProfile) throw new Error('User not authenticated')
    
    // Check permissions
    if (currentProfile.role !== 'owner' && currentProfile.role !== 'admin') {
      throw new Error('Insufficient permissions to update user roles')
    }

    // Prevent changing owner role
    const { data: targetUser } = await this.supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (targetUser?.role === 'owner') {
      throw new Error('Cannot change owner role')
    }

    const { data: profile, error } = await this.supabase
      .from('user_profiles')
      .update({ role: newRole })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return profile
  }

  /**
   * Remove user from tenant (owner/admin only)
   */
  async removeUser(userId: string): Promise<void> {
    const currentProfile = await this.getCurrentUserProfile()
    if (!currentProfile) throw new Error('User not authenticated')
    
    // Check permissions
    if (currentProfile.role !== 'owner' && currentProfile.role !== 'admin') {
      throw new Error('Insufficient permissions to remove users')
    }

    // Prevent removing owner
    const { data: targetUser } = await this.supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (targetUser?.role === 'owner') {
      throw new Error('Cannot remove owner from tenant')
    }

    const { error } = await this.supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId)

    if (error) throw error
  }
}