import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn()
        }))
      }))
    }))
  })
}))

import { OnboardingService } from '@/lib/services/onboarding'

describe('OnboardingService', () => {
  let service: OnboardingService
  let mockSupabase: any
  const mockUserId = 'user-123'
  const mockTenantId = 'tenant-456'

  beforeEach(() => {
    service = new OnboardingService()
    mockSupabase = (service as any).supabase
    vi.clearAllMocks()
  })

  describe('getOnboardingProgress', () => {
    it('should return onboarding progress when it exists', async () => {
      const mockProgress = {
        user_id: mockUserId,
        tenant_id: mockTenantId,
        current_step: 2,
        completed_steps: ['welcome', 'keywords'],
        is_completed: false,
        started_at: '2024-01-15T10:00:00Z',
        completed_at: null
      }

      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: mockProgress,
        error: null
      })

      const result = await service.getOnboardingProgress(mockUserId, mockTenantId)

      expect(result).toEqual({
        userId: mockUserId,
        tenantId: mockTenantId,
        currentStep: 2,
        completedSteps: ['welcome', 'keywords'],
        isCompleted: false,
        startedAt: new Date('2024-01-15T10:00:00Z'),
        completedAt: undefined
      })
    })

    it('should return null when no progress exists', async () => {
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      const result = await service.getOnboardingProgress(mockUserId, mockTenantId)

      expect(result).toBeNull()
    })

    it('should throw error for database errors', async () => {
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'OTHER' }
      })

      await expect(service.getOnboardingProgress(mockUserId, mockTenantId))
        .rejects.toThrow('Failed to get onboarding progress: Database error')
    })
  })

  describe('initializeOnboarding', () => {
    it('should create new onboarding progress', async () => {
      const mockInsertedData = {
        user_id: mockUserId,
        tenant_id: mockTenantId,
        current_step: 0,
        completed_steps: [],
        is_completed: false,
        started_at: '2024-01-15T10:00:00Z'
      }

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockInsertedData,
        error: null
      })

      const result = await service.initializeOnboarding(mockUserId, mockTenantId)

      expect(result.userId).toBe(mockUserId)
      expect(result.tenantId).toBe(mockTenantId)
      expect(result.currentStep).toBe(0)
      expect(result.completedSteps).toEqual([])
      expect(result.isCompleted).toBe(false)
      expect(result.startedAt).toBeInstanceOf(Date)
    })

    it('should throw error when initialization fails', async () => {
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' }
      })

      await expect(service.initializeOnboarding(mockUserId, mockTenantId))
        .rejects.toThrow('Failed to initialize onboarding: Insert failed')
    })
  })

  describe('completeStep', () => {
    it('should complete a step and advance progress', async () => {
      const mockProgress = {
        userId: mockUserId,
        tenantId: mockTenantId,
        currentStep: 1,
        completedSteps: ['welcome'],
        isCompleted: false,
        startedAt: new Date('2024-01-15T10:00:00Z')
      }

      // Mock getOnboardingProgress
      vi.spyOn(service, 'getOnboardingProgress').mockResolvedValue(mockProgress)
      
      // Mock getOnboardingConfig
      vi.spyOn(service, 'getOnboardingConfig').mockResolvedValue({
        steps: [
          { id: 'welcome', title: 'Welcome', description: '', component: '', isCompleted: false, isRequired: true, order: 0 },
          { id: 'keywords', title: 'Keywords', description: '', component: '', isCompleted: false, isRequired: true, order: 1 },
          { id: 'platforms', title: 'Platforms', description: '', component: '', isCompleted: false, isRequired: true, order: 2 }
        ],
        skipEnabled: true,
        autoAdvance: false
      })

      mockSupabase.from().update().eq().eq.mockResolvedValue({
        error: null
      })

      await service.completeStep(mockUserId, mockTenantId, 'keywords')

      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        current_step: 2,
        completed_steps: ['welcome', 'keywords'],
        is_completed: false,
        completed_at: null
      })
    })

    it('should mark onboarding as completed when last step is finished', async () => {
      const mockProgress = {
        userId: mockUserId,
        tenantId: mockTenantId,
        currentStep: 2,
        completedSteps: ['welcome', 'keywords'],
        isCompleted: false,
        startedAt: new Date('2024-01-15T10:00:00Z')
      }

      vi.spyOn(service, 'getOnboardingProgress').mockResolvedValue(mockProgress)
      vi.spyOn(service, 'getOnboardingConfig').mockResolvedValue({
        steps: [
          { id: 'welcome', title: 'Welcome', description: '', component: '', isCompleted: false, isRequired: true, order: 0 },
          { id: 'keywords', title: 'Keywords', description: '', component: '', isCompleted: false, isRequired: true, order: 1 },
          { id: 'platforms', title: 'Platforms', description: '', component: '', isCompleted: false, isRequired: true, order: 2 }
        ],
        skipEnabled: true,
        autoAdvance: false
      })

      mockSupabase.from().update().eq().eq.mockResolvedValue({
        error: null
      })

      await service.completeStep(mockUserId, mockTenantId, 'platforms')

      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          current_step: 3,
          completed_steps: ['welcome', 'keywords', 'platforms'],
          is_completed: true,
          completed_at: expect.any(String)
        })
      )
    })

    it('should throw error when progress not found', async () => {
      vi.spyOn(service, 'getOnboardingProgress').mockResolvedValue(null)

      await expect(service.completeStep(mockUserId, mockTenantId, 'keywords'))
        .rejects.toThrow('Onboarding progress not found')
    })
  })

  describe('skipOnboarding', () => {
    it('should mark onboarding as completed', async () => {
      mockSupabase.from().update().eq().eq.mockResolvedValue({
        error: null
      })

      await service.skipOnboarding(mockUserId, mockTenantId)

      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        is_completed: true,
        completed_at: expect.any(String)
      })
    })

    it('should throw error when skip fails', async () => {
      mockSupabase.from().update().eq().eq.mockResolvedValue({
        error: { message: 'Update failed' }
      })

      await expect(service.skipOnboarding(mockUserId, mockTenantId))
        .rejects.toThrow('Failed to skip onboarding: Update failed')
    })
  })

  describe('getOnboardingConfig', () => {
    it('should return default onboarding configuration', async () => {
      const config = await service.getOnboardingConfig()

      expect(config).toHaveProperty('steps')
      expect(config).toHaveProperty('skipEnabled', true)
      expect(config).toHaveProperty('autoAdvance', false)
      expect(config.steps).toHaveLength(5)
      expect(config.steps[0]).toHaveProperty('id', 'welcome')
      expect(config.steps[1]).toHaveProperty('id', 'keywords')
    })
  })

  describe('resetOnboarding', () => {
    it('should reset onboarding progress', async () => {
      mockSupabase.from().update().eq().eq.mockResolvedValue({
        error: null
      })

      await service.resetOnboarding(mockUserId, mockTenantId)

      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        current_step: 0,
        completed_steps: [],
        is_completed: false,
        completed_at: null
      })
    })

    it('should throw error when reset fails', async () => {
      mockSupabase.from().update().eq().eq.mockResolvedValue({
        error: { message: 'Reset failed' }
      })

      await expect(service.resetOnboarding(mockUserId, mockTenantId))
        .rejects.toThrow('Failed to reset onboarding: Reset failed')
    })
  })
})