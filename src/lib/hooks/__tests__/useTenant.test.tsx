import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTenant } from '../useTenant'

// Mock the TenantService
const mockTenantService = {
  getCurrentTenant: vi.fn(),
  getCurrentUserProfile: vi.fn(),
  createTenant: vi.fn(),
  acceptInvitation: vi.fn(),
}

vi.mock('@/lib/services/tenant', () => ({
  TenantService: vi.fn(() => mockTenantService),
}))

describe('useTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should load tenant data on mount', async () => {
    const mockTenant = {
      id: 'tenant-123',
      name: 'Test Company',
      subscription: 'free'
    }
    
    const mockProfile = {
      id: 'user-123',
      tenant_id: 'tenant-123',
      role: 'owner'
    }

    mockTenantService.getCurrentTenant.mockResolvedValue(mockTenant)
    mockTenantService.getCurrentUserProfile.mockResolvedValue(mockProfile)

    const { result } = renderHook(() => useTenant())

    expect(result.current.loading).toBe(true)

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.tenant).toEqual(mockTenant)
    expect(result.current.profile).toEqual(mockProfile)
    expect(result.current.error).toBeNull()
  })

  it('should handle errors when loading tenant data', async () => {
    const errorMessage = 'Failed to load tenant data'
    mockTenantService.getCurrentTenant.mockRejectedValue(new Error(errorMessage))

    const { result } = renderHook(() => useTenant())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(errorMessage)
  })

  it('should create tenant successfully', async () => {
    const mockResult = {
      tenant: { id: 'tenant-123', name: 'New Company' },
      profile: { id: 'user-123', role: 'owner' }
    }

    mockTenantService.createTenant.mockResolvedValue(mockResult)
    mockTenantService.getCurrentTenant.mockResolvedValue(null)
    mockTenantService.getCurrentUserProfile.mockResolvedValue(null)

    const { result } = renderHook(() => useTenant())

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    await act(async () => {
      await result.current.createTenant('New Company')
    })

    expect(result.current.tenant).toEqual(mockResult.tenant)
    expect(result.current.profile).toEqual(mockResult.profile)
    expect(mockTenantService.createTenant).toHaveBeenCalledWith({ name: 'New Company' })
  })

  it('should accept invitation successfully', async () => {
    const mockProfile = {
      id: 'user-123',
      tenant_id: 'tenant-123',
      role: 'member'
    }

    const mockTenant = {
      id: 'tenant-123',
      name: 'Test Company'
    }

    mockTenantService.acceptInvitation.mockResolvedValue(mockProfile)
    mockTenantService.getCurrentTenant
      .mockResolvedValueOnce(null) // Initial load
      .mockResolvedValueOnce(mockTenant) // After accepting invitation
    mockTenantService.getCurrentUserProfile
      .mockResolvedValueOnce(null) // Initial load
      .mockResolvedValueOnce(mockProfile) // After accepting invitation

    const { result } = renderHook(() => useTenant())

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    await act(async () => {
      await result.current.acceptInvitation('invitation-123')
    })

    expect(result.current.profile).toEqual(mockProfile)
    expect(mockTenantService.acceptInvitation).toHaveBeenCalledWith('invitation-123')
  })

  describe('role checking methods', () => {
    it('should correctly identify owner permissions', async () => {
      const mockProfile = {
        id: 'user-123',
        tenant_id: 'tenant-123',
        role: 'owner'
      }

      mockTenantService.getCurrentTenant.mockResolvedValue({})
      mockTenantService.getCurrentUserProfile.mockResolvedValue(mockProfile)

      const { result } = renderHook(() => useTenant())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.hasRole('owner')).toBe(true)
      expect(result.current.hasRole('admin')).toBe(true)
      expect(result.current.hasRole('member')).toBe(true)
      expect(result.current.canManageUsers()).toBe(true)
      expect(result.current.canManageTenant()).toBe(true)
      expect(result.current.isOwner).toBe(true)
      expect(result.current.isAdmin).toBe(true)
    })

    it('should correctly identify admin permissions', async () => {
      const mockProfile = {
        id: 'user-123',
        tenant_id: 'tenant-123',
        role: 'admin'
      }

      mockTenantService.getCurrentTenant.mockResolvedValue({})
      mockTenantService.getCurrentUserProfile.mockResolvedValue(mockProfile)

      const { result } = renderHook(() => useTenant())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.hasRole('owner')).toBe(false)
      expect(result.current.hasRole('admin')).toBe(true)
      expect(result.current.hasRole('member')).toBe(true)
      expect(result.current.canManageUsers()).toBe(true)
      expect(result.current.canManageTenant()).toBe(false)
      expect(result.current.isOwner).toBe(false)
      expect(result.current.isAdmin).toBe(true)
    })

    it('should correctly identify member permissions', async () => {
      const mockProfile = {
        id: 'user-123',
        tenant_id: 'tenant-123',
        role: 'member'
      }

      mockTenantService.getCurrentTenant.mockResolvedValue({})
      mockTenantService.getCurrentUserProfile.mockResolvedValue(mockProfile)

      const { result } = renderHook(() => useTenant())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.hasRole('owner')).toBe(false)
      expect(result.current.hasRole('admin')).toBe(false)
      expect(result.current.hasRole('member')).toBe(true)
      expect(result.current.canManageUsers()).toBe(false)
      expect(result.current.canManageTenant()).toBe(false)
      expect(result.current.isOwner).toBe(false)
      expect(result.current.isAdmin).toBe(false)
    })
  })
})