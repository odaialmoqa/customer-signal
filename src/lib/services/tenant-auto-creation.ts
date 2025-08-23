import { createClient } from '@/lib/supabase/client'
import { createServerClient } from '@/lib/supabase/server'

export interface TenantCreationResult {
  success: boolean
  tenant?: {
    id: string
    name: string
    owner_id: string
  }
  error?: string
}

export interface UserProfile {
  id: string
  user_id: string
  tenant_id: string | null
  name: string | null
  email: string
  onboarding_completed: boolean
}

/**
 * Auto-creates a tenant for a new user during signup
 * This solves the "User not associated with tenant" issue
 */
export async function createTenantForUser(
  userId: string, 
  userEmail: string, 
  userName?: string
): Promise<TenantCreationResult> {
  const supabase = createClient()

  try {
    // Check if user already has a tenant
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('user_id', userId)
      .single()

    if (existingProfile?.tenant_id) {
      return {
        success: true,
        error: 'User already has a tenant'
      }
    }

    // Generate tenant name
    const tenantName = userName 
      ? `${userName}'s Organization`
      : `${userEmail.split('@')[0]}'s Organization`

    // Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: tenantName,
        owner_id: userId,
        settings: {
          created_via: 'auto_signup',
          onboarding_completed: false
        }
      })
      .select()
      .single()

    if (tenantError) {
      console.error('Tenant creation error:', tenantError)
      return {
        success: false,
        error: `Failed to create tenant: ${tenantError.message}`
      }
    }

    // Create or update user profile with tenant association
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        email: userEmail,
        name: userName || userEmail.split('@')[0],
        tenant_id: tenant.id,
        onboarding_completed: false
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Try to clean up the tenant if profile creation failed
      await supabase.from('tenants').delete().eq('id', tenant.id)
      
      return {
        success: false,
        error: `Failed to create user profile: ${profileError.message}`
      }
    }

    return {
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        owner_id: tenant.owner_id
      }
    }

  } catch (error) {
    console.error('Unexpected error in createTenantForUser:', error)
    return {
      success: false,
      error: 'An unexpected error occurred during tenant creation'
    }
  }
}

/**
 * Ensures user has proper tenant association
 * Call this during login or when accessing protected routes
 */
export async function ensureUserTenantAssociation(userId: string): Promise<TenantCreationResult> {
  const supabase = createClient()

  try {
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      return {
        success: false,
        error: `Failed to fetch user profile: ${profileError.message}`
      }
    }

    // If no profile exists, get user data and create tenant
    if (!profile) {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      return await createTenantForUser(
        user.id, 
        user.email!, 
        user.user_metadata?.name
      )
    }

    // If profile exists but no tenant, create one
    if (!profile.tenant_id) {
      return await createTenantForUser(
        profile.user_id,
        profile.email,
        profile.name
      )
    }

    // Verify tenant still exists
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', profile.tenant_id)
      .single()

    if (tenantError || !tenant) {
      // Tenant was deleted, create a new one
      return await createTenantForUser(
        profile.user_id,
        profile.email,
        profile.name
      )
    }

    return {
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        owner_id: tenant.owner_id
      }
    }

  } catch (error) {
    console.error('Unexpected error in ensureUserTenantAssociation:', error)
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

/**
 * Server-side version for API routes
 */
export async function ensureUserTenantAssociationServer(userId: string): Promise<TenantCreationResult> {
  const supabase = createServerClient()

  try {
    // Similar logic but using server client
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      return {
        success: false,
        error: `Failed to fetch user profile: ${profileError.message}`
      }
    }

    if (!profile || !profile.tenant_id) {
      // Get user email from auth
      const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId)
      
      if (userError || !user) {
        return {
          success: false,
          error: 'User not found'
        }
      }

      // Create tenant using server client
      const tenantName = user.user_metadata?.name 
        ? `${user.user_metadata.name}'s Organization`
        : `${user.email!.split('@')[0]}'s Organization`

      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: tenantName,
          owner_id: userId,
          settings: {
            created_via: 'auto_login',
            onboarding_completed: false
          }
        })
        .select()
        .single()

      if (tenantError) {
        return {
          success: false,
          error: `Failed to create tenant: ${tenantError.message}`
        }
      }

      // Update or create profile
      const { error: profileUpdateError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          email: user.email!,
          name: user.user_metadata?.name || user.email!.split('@')[0],
          tenant_id: tenant.id,
          onboarding_completed: false
        })

      if (profileUpdateError) {
        return {
          success: false,
          error: `Failed to update profile: ${profileUpdateError.message}`
        }
      }

      return {
        success: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          owner_id: tenant.owner_id
        }
      }
    }

    return {
      success: true,
      tenant: {
        id: profile.tenant_id,
        name: 'Existing Tenant',
        owner_id: userId
      }
    }

  } catch (error) {
    console.error('Server-side tenant association error:', error)
    return {
      success: false,
      error: 'Server error during tenant association'
    }
  }
}