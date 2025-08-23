import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MonitoringService } from '../../lib/services/monitoring'

// Create a chainable mock query object
const createMockQuery = (finalResult = { data: [], error: null, count: 0 }) => {
  const mockQuery: any = {
    eq: vi.fn(() => mockQuery),
    order: vi.fn(() => mockQuery),
    gte: vi.fn(() => mockQuery),
    lte: vi.fn(() => mockQuery),
    limit: vi.fn(() => mockQuery),
    range: vi.fn(() => Promise.resolve(finalResult)),
    textSearch: vi.fn(() => mockQuery),
    not: vi.fn(() => mockQuery)
  }
  return mockQuery
}

// Mock Supabase client
const mockSupabase = {
  functions: {
    invoke: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => createMockQuery()),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null }))
    }))
  }))
}

// Mock the createClient function
vi.mock('../../lib/supabase/client', () => ({
  createClient: () => mockSupabase
}))

describe('MonitoringService', () => {
  let monitoringService: MonitoringService

  beforeEach(() => {
    monitoringService = new MonitoringService()
    vi.clearAllMocks()
  })

  describe('startMonitoring', () => {
    it('should start monitoring successfully', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true, message: 'Monitoring started' },
        error: null
      })

      await expect(
        monitoringService.startMonitoring('keyword-123', 'tenant-456')
      ).resolves.not.toThrow()

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('monitor-keywords/start', {
        body: { keywordId: 'keyword-123', tenantId: 'tenant-456' }
      })
    })

    it('should throw error when function invocation fails', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Function error' }
      })

      await expect(
        monitoringService.startMonitoring('keyword-123', 'tenant-456')
      ).rejects.toThrow('Failed to start monitoring: Function error')
    })

    it('should throw error when function returns unsuccessful response', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: false, message: 'Keyword not found' },
        error: null
      })

      await expect(
        monitoringService.startMonitoring('keyword-123', 'tenant-456')
      ).rejects.toThrow('Keyword not found')
    })
  })

  describe('stopMonitoring', () => {
    it('should stop monitoring successfully', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true, message: 'Monitoring stopped' },
        error: null
      })

      await expect(
        monitoringService.stopMonitoring('keyword-123', 'tenant-456')
      ).resolves.not.toThrow()

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('monitor-keywords/stop', {
        body: { keywordId: 'keyword-123', tenantId: 'tenant-456' }
      })
    })
  })

  describe('scanKeyword', () => {
    it('should scan keyword successfully', async () => {
      const mockResults = [
        {
          platform: 'reddit',
          mentions: [
            {
              id: 'reddit_123',
              content: 'Great product!',
              author: 'user1',
              platform: 'reddit',
              url: 'https://reddit.com/r/test/123',
              timestamp: '2024-01-01T12:00:00Z',
              engagement: { likes: 10, shares: 2, comments: 5 },
              metadata: { subreddit: 'test' }
            }
          ],
          errors: []
        }
      ]

      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true, results: mockResults },
        error: null
      })

      const results = await monitoringService.scanKeyword('keyword-123', 'tenant-456', ['reddit'])

      expect(results).toEqual(mockResults)
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('monitor-keywords/scan', {
        body: { keywordId: 'keyword-123', tenantId: 'tenant-456', platforms: ['reddit'] }
      })
    })

    it('should handle scan errors', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: false, message: 'Scan failed' },
        error: null
      })

      await expect(
        monitoringService.scanKeyword('keyword-123', 'tenant-456')
      ).rejects.toThrow('Scan failed')
    })
  })

  describe('getMonitoringStatus', () => {
    it('should get monitoring status successfully', async () => {
      const mockStatus = [
        {
          keywordId: 'keyword-123',
          keyword: 'test keyword',
          isActive: true,
          lastScan: '2024-01-01T12:00:00Z',
          platforms: ['reddit', 'twitter'],
          nextScan: '2024-01-01T13:00:00Z'
        }
      ]

      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true, status: mockStatus },
        error: null
      })

      const status = await monitoringService.getMonitoringStatus('tenant-456')

      expect(status).toEqual(mockStatus)
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('monitor-keywords/status', {
        body: { tenant_id: 'tenant-456' }
      })
    })
  })

  describe('getConversations', () => {
    it('should call the correct Supabase methods', async () => {
      // This test focuses on verifying the service calls the right methods
      // rather than mocking the complex chain
      const result = await monitoringService.getConversations('tenant-456', {
        keywordId: 'keyword-123',
        platform: 'reddit'
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('conversations')
      expect(result).toEqual({ conversations: [], total: 0 })
    })

    it('should handle search parameters', async () => {
      const result = await monitoringService.getConversations('tenant-456', {
        keywordId: 'keyword-123',
        platform: 'reddit',
        sentiment: 'positive',
        dateFrom: '2024-01-01T00:00:00Z',
        dateTo: '2024-01-01T23:59:59Z',
        limit: 10,
        offset: 0
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('conversations')
      expect(result).toEqual({ conversations: [], total: 0 })
    })
  })

  describe('searchConversations', () => {
    it('should search conversations using full-text search', async () => {
      const mockConversations = [
        {
          id: 'reddit_123',
          content: 'This product is amazing!',
          author: 'user1',
          platform: 'reddit'
        }
      ]

      const mockQuery = {
        eq: vi.fn(() => mockQuery),
        textSearch: vi.fn(() => mockQuery),
        order: vi.fn(() => mockQuery),
        limit: vi.fn(() => Promise.resolve({ data: mockConversations, error: null }))
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => mockQuery)
      })

      const results = await monitoringService.searchConversations(
        'tenant-456',
        'amazing product',
        { platform: 'reddit', limit: 10 }
      )

      expect(results).toEqual(mockConversations)
      expect(mockQuery.textSearch).toHaveBeenCalledWith('content', 'amazing product')
    })
  })

  describe('getConversationAnalytics', () => {
    it('should get conversation analytics', async () => {
      // Mock different queries for analytics
      const mockCountQuery = Promise.resolve({ count: 100, error: null })
      const mockSentimentQuery = Promise.resolve({
        data: [
          { sentiment_label: 'positive' },
          { sentiment_label: 'positive' },
          { sentiment_label: 'negative' },
          { sentiment_label: 'neutral' }
        ],
        error: null
      })
      const mockPlatformQuery = Promise.resolve({
        data: [
          { platform: 'reddit' },
          { platform: 'reddit' },
          { platform: 'twitter' }
        ],
        error: null
      })
      const mockDailyQuery = Promise.resolve({
        data: [
          { timestamp: '2024-01-01T10:00:00Z' },
          { timestamp: '2024-01-01T14:00:00Z' },
          { timestamp: '2024-01-02T09:00:00Z' }
        ],
        error: null
      })

      // Mock the query chains
      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => mockCountQuery)
              }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  not: vi.fn(() => mockSentimentQuery)
                }))
              }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => mockPlatformQuery)
              }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => mockDailyQuery)
              }))
            }))
          }))
        })

      const analytics = await monitoringService.getConversationAnalytics(
        'tenant-456',
        '2024-01-01T00:00:00Z',
        '2024-01-02T23:59:59Z'
      )

      expect(analytics.totalConversations).toBe(100)
      expect(analytics.sentimentBreakdown.positive).toBe(2)
      expect(analytics.sentimentBreakdown.negative).toBe(1)
      expect(analytics.sentimentBreakdown.neutral).toBe(1)
      expect(analytics.platformBreakdown.reddit).toBe(2)
      expect(analytics.platformBreakdown.twitter).toBe(1)
      expect(analytics.dailyVolume).toHaveLength(2)
      expect(analytics.dailyVolume[0].date).toBe('2024-01-01')
      expect(analytics.dailyVolume[0].count).toBe(2)
    })
  })

  describe('updateConversationTags', () => {
    it('should update conversation tags', async () => {
      const mockUpdate = {
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }

      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => mockUpdate)
      })

      await expect(
        monitoringService.updateConversationTags('conversation-123', ['tag1', 'tag2'])
      ).resolves.not.toThrow()

      expect(mockSupabase.from).toHaveBeenCalledWith('conversations')
      expect(mockUpdate.eq).toHaveBeenCalledWith('id', 'conversation-123')
    })

    it('should handle update errors', async () => {
      const mockUpdate = {
        eq: vi.fn(() => Promise.resolve({ error: { message: 'Update failed' } }))
      }

      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => mockUpdate)
      })

      await expect(
        monitoringService.updateConversationTags('conversation-123', ['tag1'])
      ).rejects.toThrow('Failed to update conversation tags: Update failed')
    })
  })

  describe('getMonitoringJobs', () => {
    it('should get monitoring jobs for a tenant', async () => {
      const mockJobs = [
        {
          id: 'job-123',
          keyword_id: 'keyword-123',
          tenant_id: 'tenant-456',
          frequency: 'hourly',
          platforms: ['reddit', 'twitter'],
          is_active: true,
          keywords: {
            id: 'keyword-123',
            term: 'test keyword',
            platforms: ['reddit', 'twitter'],
            monitoring_frequency: 'hourly'
          }
        }
      ]

      const mockQuery = {
        eq: vi.fn(() => mockQuery),
        order: vi.fn(() => Promise.resolve({ data: mockJobs, error: null }))
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => mockQuery)
      })

      const jobs = await monitoringService.getMonitoringJobs('tenant-456')

      expect(jobs).toEqual(mockJobs)
      expect(mockSupabase.from).toHaveBeenCalledWith('monitoring_jobs')
    })
  })
})