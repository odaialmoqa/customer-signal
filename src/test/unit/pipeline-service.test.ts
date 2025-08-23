import { describe, it, expect, beforeEach, vi } from 'vitest'
import { pipelineHelpers } from '@/lib/services/pipeline'

// Mock the entire pipeline service module
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null })
    })),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null })
    },
    rpc: vi.fn().mockResolvedValue({ data: [], error: null })
  }))
}))

describe('PipelineHelpers', () => {
  describe('calculateMetrics', () => {
    it('should calculate processing metrics correctly', () => {
      const jobs = [
        {
          id: 'job-1',
          status: 'pending' as const,
          processing_time_ms: null,
          created_at: '2024-01-01T10:00:00Z'
        },
        {
          id: 'job-2',
          status: 'completed' as const,
          processing_time_ms: 100,
          created_at: '2024-01-01T11:00:00Z'
        },
        {
          id: 'job-3',
          status: 'completed' as const,
          processing_time_ms: 200,
          created_at: '2024-01-01T12:00:00Z'
        },
        {
          id: 'job-4',
          status: 'failed' as const,
          processing_time_ms: null,
          created_at: '2024-01-01T09:00:00Z'
        }
      ] as any[]

      const metrics = pipelineHelpers.calculateMetrics(jobs)

      expect(metrics).toEqual({
        total: 4,
        pending: 1,
        processing: 0,
        completed: 2,
        failed: 1,
        avgProcessingTime: 150, // (100 + 200) / 2
        oldestPending: new Date('2024-01-01T10:00:00Z')
      })
    })

    it('should handle empty jobs array', () => {
      const metrics = pipelineHelpers.calculateMetrics([])

      expect(metrics).toEqual({
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        avgProcessingTime: 0,
        oldestPending: null
      })
    })

    it('should handle jobs with no processing times', () => {
      const jobs = [
        {
          id: 'job-1',
          status: 'pending' as const,
          processing_time_ms: null,
          created_at: '2024-01-01T10:00:00Z'
        },
        {
          id: 'job-2',
          status: 'failed' as const,
          processing_time_ms: null,
          created_at: '2024-01-01T11:00:00Z'
        }
      ] as any[]

      const metrics = pipelineHelpers.calculateMetrics(jobs)

      expect(metrics.avgProcessingTime).toBe(0)
      expect(metrics.total).toBe(2)
      expect(metrics.pending).toBe(1)
      expect(metrics.failed).toBe(1)
    })

    it('should find oldest pending job correctly', () => {
      const jobs = [
        {
          id: 'job-1',
          status: 'completed' as const,
          processing_time_ms: 100,
          created_at: '2024-01-01T08:00:00Z'
        },
        {
          id: 'job-2',
          status: 'pending' as const,
          processing_time_ms: null,
          created_at: '2024-01-01T10:00:00Z'
        },
        {
          id: 'job-3',
          status: 'pending' as const,
          processing_time_ms: null,
          created_at: '2024-01-01T09:00:00Z' // This should be the oldest pending
        }
      ] as any[]

      const metrics = pipelineHelpers.calculateMetrics(jobs)

      expect(metrics.oldestPending).toEqual(new Date('2024-01-01T09:00:00Z'))
      expect(metrics.pending).toBe(2)
    })

    it('should calculate average processing time correctly with mixed jobs', () => {
      const jobs = [
        {
          id: 'job-1',
          status: 'completed' as const,
          processing_time_ms: 50,
          created_at: '2024-01-01T10:00:00Z'
        },
        {
          id: 'job-2',
          status: 'completed' as const,
          processing_time_ms: 150,
          created_at: '2024-01-01T11:00:00Z'
        },
        {
          id: 'job-3',
          status: 'completed' as const,
          processing_time_ms: 100,
          created_at: '2024-01-01T12:00:00Z'
        },
        {
          id: 'job-4',
          status: 'pending' as const,
          processing_time_ms: null,
          created_at: '2024-01-01T13:00:00Z'
        },
        {
          id: 'job-5',
          status: 'failed' as const,
          processing_time_ms: null,
          created_at: '2024-01-01T14:00:00Z'
        }
      ] as any[]

      const metrics = pipelineHelpers.calculateMetrics(jobs)

      expect(metrics.avgProcessingTime).toBe(100) // (50 + 150 + 100) / 3
      expect(metrics.total).toBe(5)
      expect(metrics.completed).toBe(3)
      expect(metrics.pending).toBe(1)
      expect(metrics.failed).toBe(1)
    })
  })

  describe('Job Status Counting', () => {
    it('should count all job statuses correctly', () => {
      const jobs = [
        { id: '1', status: 'pending' as const, processing_time_ms: null, created_at: '2024-01-01T10:00:00Z' },
        { id: '2', status: 'pending' as const, processing_time_ms: null, created_at: '2024-01-01T11:00:00Z' },
        { id: '3', status: 'processing' as const, processing_time_ms: null, created_at: '2024-01-01T12:00:00Z' },
        { id: '4', status: 'completed' as const, processing_time_ms: 100, created_at: '2024-01-01T13:00:00Z' },
        { id: '5', status: 'completed' as const, processing_time_ms: 200, created_at: '2024-01-01T14:00:00Z' },
        { id: '6', status: 'completed' as const, processing_time_ms: 150, created_at: '2024-01-01T15:00:00Z' },
        { id: '7', status: 'failed' as const, processing_time_ms: null, created_at: '2024-01-01T16:00:00Z' }
      ] as any[]

      const metrics = pipelineHelpers.calculateMetrics(jobs)

      expect(metrics.total).toBe(7)
      expect(metrics.pending).toBe(2)
      expect(metrics.processing).toBe(1)
      expect(metrics.completed).toBe(3)
      expect(metrics.failed).toBe(1)
      expect(metrics.avgProcessingTime).toBe(150) // (100 + 200 + 150) / 3
    })
  })
})