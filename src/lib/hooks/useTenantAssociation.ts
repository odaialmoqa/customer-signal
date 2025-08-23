'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ensureUserTenantAssociation } from '@/lib/services/tenant-auto-creation'

interface TenantAssociationState {
  loading: boolean
  tenant: {
    id: string
    name: string
    owner_id: string
  } | null
  error: string | null
  needsOnboarding: boolean
}

interface UserProfile {
  id: string
  user_id: string
  tenant_id: string | null
  name: string | null
  email: string
  onboarding_completed: boolean
}

export function useTenantAssociation() {
  const [state, setState] = useState<TenantAssociationState>({
    loading: true,
    tenant: null,
    error: null,
    needsOnboarding: false
  })

  const supabase = createClient()

  useEffect(() => {
    checkTenantAssociation()
  }, [])

  const checkTenantAssociation = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        setState({
          loading: false,
          tenant: null,
          error: 'User not authenticated',
          needsOnboarding: false
        })
        return
      }

      // Check if user has tenant association
      const result = await ensureUserTenantAssociation(user.id)
      
      if (!result.success) {
        setState({
          loading: false,
          tenant: null,
          error: result.error || 'Failed to ensure tenant association',
          needsOnboarding: false
        })
        return
      }

      // Get user profile to check onboarding status
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      const needsOnboarding = !profile?.onboarding_completed

      setState({
        loading: false,
        tenant: result.tenant || null,
        error: null,
        needsOnboarding
      })

    } catch (error) {
      console.error('Tenant association check error:', error)
      setState({
        loading: false,
        tenant: null,
        error: 'An unexpected error occurred',
        needsOnboarding: false
      })
    }
  }

  const createTenant = async (tenantName?: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('User not authenticated')
      }

      // Create tenant
      const finalTenantName = tenantName || `${user.email?.split('@')[0] || 'User'}'s Organization`
      
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: finalTenantName,
          owner_id: user.id,
          settings: {
            created_via: 'manual_creation',
            onboarding_completed: false
          }
        })
        .select()
        .single()

      if (tenantError) {
        throw new Error(`Failed to create tenant: ${tenantError.message}`)
      }

      // Update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          email: user.email!,
          name: user.user_metadata?.name || user.email!.split('@')[0],
          tenant_id: tenant.id,
          onboarding_completed: false
        })

      if (profileError) {
        throw new Error(`Failed to update profile: ${profileError.message}`)
      }

      setState({
        loading: false,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          owner_id: tenant.owner_id
        },
        error: null,
        needsOnboarding: true
      })

      return { success: true, tenant }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create tenant'
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
      return { success: false, error: errorMessage }
    }
  }

  const completeOnboarding = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('User not authenticated')
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ onboarding_completed: true })
        .eq('user_id', user.id)

      if (error) {
        throw new Error(`Failed to complete onboarding: ${error.message}`)
      }

      setState(prev => ({
        ...prev,
        needsOnboarding: false
      }))

      return { success: true }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete onboarding'
      setState(prev => ({
        ...prev,
        error: errorMessage
      }))
      return { success: false, error: errorMessage }
    }
  }

  const retry = () => {
    checkTenantAssociation()
  }

  return {
    ...state,
    createTenant,
    completeOnboarding,
    retry,
    refresh: checkTenantAssociation
  }
}

// Helper hook for components that need to ensure tenant association
export function useRequireTenant() {
  const tenantAssociation = useTenantAssociation()
  
  return {
    ...tenantAssociation,
    isReady: !tenantAssociation.loading && tenantAssociation.tenant && !tenantAssociation.error,
    hasError: !!tenantAssociation.error,
    needsSetup: !tenantAssociation.loading && !tenantAssociation.tenant && !tenantAssociation.error
  }
}