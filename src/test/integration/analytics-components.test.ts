import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AnalyticsService } from '@/lib/services/analytics'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              overlaps: vi.fn(() => ({
                in: vi.fn(() => ({
                  not: vi.fn(() => ({}))
                }))
              }))
            }))
          }))
        }))
      }))
    }))
  }))
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              overlaps: vi.fn(() => ({
                in: vi.fn(() => ({
                  not: vi.fn(() => ({}))
                }))
              }))
            }))
          }))
        }))
      }))
    }))
  }))
}))

describe('Analytics Components Integration', () => {
  let analyticsService: AnalyticsService
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = {
      rpc: vi.fn(),
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                overlaps: vi.fn(() => ({
                  in: vi.fn(() => ({
                    not: vi.fn(() => mockSupabase)
                  }))
                }))
              }))
            }))
          }))
        }))
      }))
    }
    analyticsService = new AnalyticsService(mockSupabase)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Dashboard Metrics Integration', () => {
    it('should fetch and process dashboard metrics correctly', async () => {
      // Mock the RPC response for conversation stats
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [{
          total_conversations: 1000,
          positive_count: 600,
          negative_count: 200,
          neutral_count: 200,
          platform_distribution: {
            twitter: 500,
            reddit: 300,
            linkedin: 200
          },
          daily_counts: {
            '2024-01-01': 100,
            '2024-01-02': 150
          }
        }],
        error: null
      })

      // Mock platform distribution query
      mockSupabase.from().select().eq().gte().lte().overlaps().in = vi.fn().mockResolvedValue({
        data: [
          { platform: 'twitter', sentiment: 'positive' },
          { platform: 'twitter', sentiment: 'negative' },
          { platform: 'reddit', sentiment: 'positive' }
        ],
        error: null
      })

      const tenantId = 'test-tenant-id'
      const filters = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z'
      }

      const metrics = await analyticsService.getDashboardMetrics(tenantId, filters)

      expect(metrics).toEqual(
        expect.objectContaining({
          totalConversations: 1000,
          sentimentDistribution: {
            positive: 600,
            negative: 200,
            neutral: 200
          },
          timeRange: {
            start: filters.startDate,
            end: filters.endDate
          }
        })
      )

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_conversation_stats', {
        p_tenant_id: tenantId,
        p_start_date: filters.startDate,
        p_end_date: filters.endDate
      })
    })

    it('should handle errors gracefully when fetching dashboard metrics', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' }
      })

      const tenantId = 'test-tenant-id'
      
      await expect(
        analyticsService.getDashboardMetrics(tenantId)
      ).rejects.toThrow('Failed to get conversation stats: Database connection failed')
    })
  })

  describe('Sentiment Trends Integration', () => {
    it('should fetch and process sentiment trends correctly', async () => {
      const mockTrendsData = [
        {
          keyword: 'customer service',
          platform: 'twitter',
          time_bucket: '2024-01-01T00:00:00Z',
          positive_count: 10,
          negative_count: 5,
          neutral_count: 15,
          total_count: 30,
          sentiment_score: 0.2
        },
        {
          keyword: 'customer service',
          platform: 'reddit',
          time_bucket: '2024-01-01T00:00:00Z',
          positive_count: 8,
          negative_count: 12,
          neutral_count: 10,
          total_count: 30,
          sentiment_score: -0.1
        }
      ]

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockTrendsData,
        error: null
      })

      const tenantId = 'test-tenant-id'
      const filters = {
        keywords: ['customer service'],
        platforms: ['twitter', 'reddit'],
        intervalType: 'day' as const
      }

      const trends = await analyticsService.getSentimentTrends(tenantId, filters)

      expect(trends).toHaveLength(2)
      expect(trends[0]).toEqual({
        keyword: 'customer service',
        platform: 'twitter',
        timeBucket: '2024-01-01T00:00:00Z',
        positiveCount: 10,
        negativeCount: 5,
        neutralCount: 15,
        totalCount: 30,
        sentimentScore: 0.2
      })

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_sentiment_trends', {
        p_tenant_id: tenantId,
        p_keywords: filters.keywords,
        p_platforms: filters.platforms,
        p_start_date: null,
        p_end_date: null,
        p_interval_type: filters.intervalType
      })
    })
  })

  describe('Platform Distribution Integration', () => {
    it('should calculate platform distribution with sentiment breakdown', async () => {
      const mockConversationData = [
        { platform: 'twitter', sentiment: 'positive' },
        { platform: 'twitter', sentiment: 'positive' },
        { platform: 'twitter', sentiment: 'negative' },
        { platform: 'reddit', sentiment: 'positive' },
        { platform: 'reddit', sentiment: 'neutral' },
        { platform: 'linkedin', sentiment: 'positive' }
      ]

      // Mock the query chain
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        overlaps: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: mockConversationData,
          error: null
        })
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery)
      })

      const tenantId = 'test-tenant-id'
      const filters = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z'
      }

      const distribution = await analyticsService.getPlatformDistribution(tenantId, filters)

      expect(distribution).toHaveLength(3)
      
      const twitterData = distribution.find(p => p.platform === 'twitter')
      expect(twitterData).toEqual({
        platform: 'twitter',
        count: 3,
        percentage: 50, // 3 out of 6 total
        sentimentBreakdown: {
          positive: 2,
          negative: 1,
          neutral: 0
        }
      })

      const redditData = distribution.find(p => p.platform === 'reddit')
      expect(redditData).toEqual({
        platform: 'reddit',
        count: 2,
        percentage: expect.closeTo(33.33, 1),
        sentimentBreakdown: {
          positive: 1,
          negative: 0,
          neutral: 1
        }
      })
    })
  })

  describe('Keyword Performance Integration', () => {
    it('should fetch and process keyword frequency data', async () => {
      const mockKeywordData = [
        {
          keyword: 'customer service',
          frequency: 150,
          platforms: ['twitter', 'reddit'],
          sentiment_distribution: { positive: 90, negative: 30, neutral: 30 },
          first_seen: '2024-01-01T00:00:00Z',
          last_seen: '2024-01-31T23:59:59Z',
          trend_direction: 'rising'
        },
        {
          keyword: 'product quality',
          frequency: 120,
          platforms: ['twitter', 'linkedin', 'reviews'],
          sentiment_distribution: { positive: 60, negative: 40, neutral: 20 },
          first_seen: '2024-01-01T00:00:00Z',
          last_seen: '2024-01-31T23:59:59Z',
          trend_direction: 'falling'
        }
      ]

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockKeywordData,
        error: null
      })

      const tenantId = 'test-tenant-id'
      const filters = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z'
      }

      const keywordFrequency = await analyticsService.getKeywordFrequency(tenantId, filters, 5)

      expect(keywordFrequency).toHaveLength(2)
      expect(keywordFrequency[0]).toEqual({
        keyword: 'customer service',
        frequency: 150,
        platforms: ['twitter', 'reddit'],
        sentimentDistribution: { positive: 90, negative: 30, neutral: 30 },
        firstSeen: '2024-01-01T00:00:00Z',
        lastSeen: '2024-01-31T23:59:59Z',
        trendDirection: 'rising'
      })

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_keyword_frequency', {
        p_tenant_id: tenantId,
        p_start_date: filters.startDate,
        p_end_date: filters.endDate,
        p_platforms: null,
        p_min_frequency: 5
      })
    })

    it('should calculate keyword performance metrics correctly', async () => {
      // Mock keyword frequency data
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [
          {
            keyword: 'customer service',
            frequency: 150,
            platforms: ['twitter', 'reddit'],
            sentiment_distribution: { positive: 90, negative: 30, neutral: 30 },
            first_seen: '2024-01-01T00:00:00Z',
            last_seen: '2024-01-31T23:59:59Z',
            trend_direction: 'rising'
          }
        ],
        error: null
      })

      const tenantId = 'test-tenant-id'
      const performance = await analyticsService.getKeywordPerformance(tenantId)

      expect(performance).toHaveLength(1)
      expect(performance[0]).toEqual({
        keyword: 'customer service',
        totalMentions: 150,
        averageSentiment: expect.closeTo(0.4, 1), // (90*1 + 30*(-1) + 30*0) / 150 = 0.4
        platforms: ['twitter', 'reddit'],
        recentTrend: 'up',
        engagementScore: expect.closeTo(180, 1) // 150 * (1 + (2-1) * 0.2) = 180
      })
    })
  })

  describe('Time Series Data Integration', () => {
    it('should fetch and process time series conversation data', async () => {
      const mockTimeSeriesData = [
        { timestamp: '2024-01-01T10:00:00Z', platform: 'twitter' },
        { timestamp: '2024-01-01T11:00:00Z', platform: 'twitter' },
        { timestamp: '2024-01-01T12:00:00Z', platform: 'reddit' },
        { timestamp: '2024-01-02T10:00:00Z', platform: 'twitter' },
        { timestamp: '2024-01-02T11:00:00Z', platform: 'linkedin' }
      ]

      // Mock the query chain
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        overlaps: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: mockTimeSeriesData,
          error: null
        })
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery)
      })

      const tenantId = 'test-tenant-id'
      const filters = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-02T23:59:59Z'
      }

      const timeSeriesData = await analyticsService.getTimeSeriesData(
        tenantId,
        'conversations',
        filters
      )

      expect(timeSeriesData).toHaveLength(2)
      
      const day1Data = timeSeriesData.find(d => d.date === '2024-01-01')
      expect(day1Data).toEqual({
        date: '2024-01-01',
        value: 3,
        breakdown: {
          twitter: 2,
          reddit: 1
        }
      })

      const day2Data = timeSeriesData.find(d => d.date === '2024-01-02')
      expect(day2Data).toEqual({
        date: '2024-01-02',
        value: 2,
        breakdown: {
          twitter: 1,
          linkedin: 1
        }
      })
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Connection timeout' }
      })

      const tenantId = 'test-tenant-id'
      
      await expect(
        analyticsService.getSentimentTrends(tenantId)
      ).rejects.toThrow('Failed to get sentiment trends: Connection timeout')
    })

    it('should handle empty data responses', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const tenantId = 'test-tenant-id'
      const trends = await analyticsService.getSentimentTrends(tenantId)

      expect(trends).toEqual([])
    })

    it('should handle null data responses', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: null
      })

      const tenantId = 'test-tenant-id'
      const trends = await analyticsService.getSentimentTrends(tenantId)

      expect(trends).toEqual([])
    })
  })

  describe('Caching Integration', () => {
    it('should use cached data when available', async () => {
      // First call - should hit the database
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [{ keyword: 'test', platform: 'twitter', time_bucket: '2024-01-01T00:00:00Z', positive_count: 10, negative_count: 5, neutral_count: 15, total_count: 30, sentiment_score: 0.2 }],
        error: null
      })

      const tenantId = 'test-tenant-id'
      const filters = { intervalType: 'day' as const }

      const firstResult = await analyticsService.getSentimentTrends(tenantId, filters)
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(1)

      // Second call - should use cache (mock won't be called again)
      const secondResult = await analyticsService.getSentimentTrends(tenantId, filters)
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(1) // Still 1, not 2
      
      expect(firstResult).toEqual(secondResult)
    })
  })
})