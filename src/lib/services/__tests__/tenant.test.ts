import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TenantService } from '../tenant'

// Mock the Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
      })),
      order: vi.fn(() => ({})),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(),
    })),
  })),
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

describe('TenantService', () => {
  let tenantService: TenantService
  
  beforeEach(() => {
    vi.clearAllMocks()
    tenantService = new TenantService()
  })

  describe('createTenant', () => {
    it('should create a tenant and user profile successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' }
      }
      
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Company',
        subscription: 'free',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const mockProfile = {
        id: 'user-123',
        tenant_id: 'tenant-123',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'owner',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      
      const mockTenantInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockTenant, error: null })
        })
      })
      
      const mockProfileInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
        })
      })

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'tenants') {
          return { insert: mockTenantInsert }
        }
        if (table === 'user_profiles') {
          return { insert: mockProfileInsert }
        }
        return {}
      })

      const result = await tenantService.createTenant({ name: 'Test Company' })

      expect(result.tenant).toEqual(mockTenant)
      expect(result.profile).toEqual(mockProfile)
      expect(mockTenantInsert).toHaveBeenCalledWith({
        name: 'Test Company',
        subscription: 'free'
      })
      expect(mockProfileInsert).toHaveBeenCalledWith({
        id: 'user-123',
        tenant_id: 'tenant-123',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'owner'
      })
    })

    it('should throw error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      await expect(tenantService.createTenant({ name: 'Test Company' }))
        .rejects.toThrow('User not authenticated')
    })
  })

  describe('getCurrentUserProfile', () => {
    it('should return user profile when user is authenticated', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockProfile = {
        id: 'user-123',
        tenant_id: 'tenant-123',
        email: 'test@example.com',
        role: 'owner'
      }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
        })
      })

      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await tenantService.getCurrentUserProfile()

      expect(result).toEqual(mockProfile)
      expect(mockSelect).toHaveBeenCalledWith('*')
    })

    it('should return null when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const result = await tenantService.getCurrentUserProfile()

      expect(result).toBeNull()
    })
  })

  describe('inviteUser', () => {
    it('should create invitation when user has admin permissions', async () => {
      const mockProfile = {
        id: 'user-123',
        tenant_id: 'tenant-123',
        role: 'admin'
      }
      
      const mockInvitation = {
        id: 'invitation-123',
        tenant_id: 'tenant-123',
        email: 'newuser@example.com',
        role: 'member',
        invited_by: 'user-123'
      }

      // Mock getCurrentUserProfile
      vi.spyOn(tenantService, 'getCurrentUserProfile').mockResolvedValue(mockProfile)

      // Mock existing user check
      const mockUserSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
          })
        })
      })

      // Mock invitation insert
      const mockInvitationInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockInvitation, error: null })
        })
      })

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'user_profiles') {
          return { select: mockUserSelect }
        }
        if (table === 'tenant_invitations') {
          return { insert: mockInvitationInsert }
        }
        return {}
      })

      const result = await tenantService.inviteUser({
        email: 'newuser@example.com',
        role: 'member'
      })

      expect(result).toEqual(mockInvitation)
      expect(mockInvitationInsert).toHaveBeenCalled()
    })

    it('should throw error when user lacks permissions', async () => {
      const mockProfile = {
        id: 'user-123',
        tenant_id: 'tenant-123',
        role: 'member'
      }

      vi.spyOn(tenantService, 'getCurrentUserProfile').mockResolvedValue(mockProfile)

      await expect(tenantService.inviteUser({
        email: 'newuser@example.com',
        role: 'member'
      })).rejects.toThrow('Insufficient permissions to invite users')
    })
  })

  describe('updateUserRole', () => {
    it('should update user role when current user is admin', async () => {
      const mockCurrentProfile = {
        id: 'admin-123',
        tenant_id: 'tenant-123',
        role: 'admin'
      }
      
      const mockTargetUser = { role: 'member' }
      const mockUpdatedProfile = {
        id: 'user-123',
        role: 'admin'
      }

      vi.spyOn(tenantService, 'getCurrentUserProfile').mockResolvedValue(mockCurrentProfile)

      const mockTargetSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockTargetUser, error: null })
        })
      })

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockUpdatedProfile, error: null })
          })
        })
      })

      mockSupabase.from.mockReturnValue({
        select: mockTargetSelect,
        update: mockUpdate
      })

      const result = await tenantService.updateUserRole('user-123', 'admin')

      expect(result).toEqual(mockUpdatedProfile)
      expect(mockUpdate).toHaveBeenCalledWith({ role: 'admin' })
    })

    it('should throw error when trying to change owner role', async () => {
      const mockCurrentProfile = {
        id: 'admin-123',
        tenant_id: 'tenant-123',
        role: 'admin'
      }
      
      const mockTargetUser = { role: 'owner' }

      vi.spyOn(tenantService, 'getCurrentUserProfile').mockResolvedValue(mockCurrentProfile)

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockTargetUser, error: null })
        })
      })

      mockSupabase.from.mockReturnValue({ select: mockSelect })

      await expect(tenantService.updateUserRole('user-123', 'admin'))
        .rejects.toThrow('Cannot change owner role')
    })
  })
})