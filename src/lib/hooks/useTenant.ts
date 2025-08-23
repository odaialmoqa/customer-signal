'use client'

import { useState, useEffect } from 'react'
import { TenantService } from '@/lib/services/tenant'
import type { Tenant, UserProfile } from '@/lib/types/tenant'

export function useTenant() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const tenantService = new TenantService()

  const loadTenantData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [tenantData, profileData] = await Promise.all([
        tenantService.getCurrentTenant(),
        tenantService.getCurrentUserProfile()
      ])
      
      setTenant(tenantData)
      setProfile(profileData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tenant data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTenantData()
  }, [])

  const createTenant = async (name: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await tenantService.createTenant({ name })
      setTenant(result.tenant)
      setProfile(result.profile)
      
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create tenant'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const acceptInvitation = async (invitationId: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const profileData = await tenantService.acceptInvitation(invitationId)
      setProfile(profileData)
      
      // Reload tenant data
      await loadTenantData()
      
      return profileData
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept invitation'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const hasRole = (requiredRole: 'owner' | 'admin' | 'member'): boolean => {
    if (!profile) return false
    
    const roleHierarchy = { owner: 3, admin: 2, member: 1 }
    return roleHierarchy[profile.role as keyof typeof roleHierarchy] >= roleHierarchy[requiredRole]
  }

  const canManageUsers = (): boolean => {
    return hasRole('admin')
  }

  const canManageTenant = (): boolean => {
    return hasRole('owner')
  }

  return {
    tenant,
    profile,
    loading,
    error,
    createTenant,
    acceptInvitation,
    refreshData: loadTenantData,
    hasRole,
    canManageUsers,
    canManageTenant,
    isOwner: profile?.role === 'owner',
    isAdmin: profile?.role === 'admin' || profile?.role === 'owner',
    isMember: !!profile
  }
}