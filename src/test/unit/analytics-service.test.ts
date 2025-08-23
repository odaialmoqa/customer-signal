import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { AnalyticsService } from '@/lib/services/analytics'

// Mock Supabase client
const mockSupabaseClient = {
  rpc: vi.fn(),
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            overlaps: vi.fn(() => ({
              in: vi.fn(() => ({
                not: vi.fn(() => mockSupabaseClient)
              }))
            }))
          }))
        }))
      }))
    }))
  }))
}

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService

  beforeEach(() => {
    vi.clearAllMocks()
    analyticsService = new AnalyticsService(mockSupabaseClient)
  })

  describe('getDashboardMetrics', () => {
    it('should return comprehensive dashboard metrics', async () => {
      const tenantId = 'test-tenant-id'
      const mockStatsData = [{
        total_conversations: 100,
        positive_count: 60,
        negative_count: 20,
        neutral_count: 20,
        platform_distribution: { twitter: 50, reddit: 30, linkedin: 20 },
        daily_counts: { '2024-01-01': 10, '2024-01-02': 15 }
      }]

      // Mock the RPC call for stats
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: mockStatsData,
        error: null
      })

      // Mock platform distribution query
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue({
                data: [
                  { platform: 'twitter', sentiment: 'positive' },
                  { platform: 'twitter', sentiment: 'negative' },
                  { platform: 'reddit', sentiment: 'neutral' }
                ],
                error: null
              })
            })
          })
        })
      })

      // Mock keyword frequency for performance
      mockSupabaseClient.rpc
        .mockResolvedValueOnce({ data: mockStatsData, error: null }) // stats
        .mockResolvedValueOnce({ // keyword frequency
          data: [
            {
              keyword: 'test-keyword',
              frequency: 10,
              platforms: ['twitter', 'reddit'],
              sentiment_distribution: { positive: 6, negative: 2, neutral: 2 },
              first_seen: '2024-01-01',
              last_seen: '2024-01-02',
              trend_direction: 'rising'
            }
          ],
          error: null
        })
        .mockResolvedValueOnce({ // sentiment trends
          data: [
            {
              keyword: 'test-keyword',
              platform: 'twitter',
              time_bucket: '2024-01-01T00:00:00Z',
              positive_count: 5,
              negative_count: 1,
              neutral_count: 2,
              total_count: 8,
              sentiment_score: 0.5
            }
          ],
          error: null
        })
        .mockResolvedValueOnce({ // emerging themes
          data: [
            {
              keyword: 'emerging-topic',
              recent_count: 15,
              previous_count: 5,
              growth_rate: 3.0,
              platforms: ['twitter', 'linkedin'],
              sentiment_trend: 0.2
            }
          ],
          error: null
        })

      const result = await analyticsService.getDashboardMetrics(tenantId)

      expect(result).toEqual({
        totalConversations: 100,
        sentimentDistribution: {
          positive: 60,
          negative: 20,
          neutral: 20
        },
        platformDistribution: expect.any(Array),
        topKeywords: expect.any(Array),
        recentTrends: expect.any(Array),
        emergingThemes: expect.any(Array),
        timeRange: expect.objectContaining({
          start: expect.any(String),
          end: expect.any(String)
        })
      })

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_conversation_stats', {
        p_tenant_id: tenantId,
        p_start_date: expect.any(String),
        p_end_date: expect.any(String)
      })
    })

    it('should handle errors gracefully', async () => {
      const tenantId = 'test-tenant-id'
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      })

      await expect(analyticsService.getDashboardMetrics(tenantId))
        .rejects.toThrow('Database error')
    })
  })

  describe('getSentimentTrends', () => {
    it('should return sentiment trends data', async () => {
      const tenantId = 'test-tenant-id'
      const mockTrendsData = [
        {
          keyword: 'test-keyword',
          platform: 'twitter',
          time_bucket: '2024-01-01T00:00:00Z',
          positive_count: 10,
          negative_count: 5,
          neutral_count: 3,
          total_count: 18,
          sentiment_score: 0.28
        }
      ]

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: mockTrendsData,
        error: null
      })

      const result = await analyticsService.getSentimentTrends(tenantId, {
        intervalType: 'day'
      })

      expect(result).toEqual([
        {
          keyword: 'test-keyword',
          platform: 'twitter',
          timeBucket: '2024-01-01T00:00:00Z',
          positiveCount: 10,
          negativeCount: 5,
          neutralCount: 3,
          totalCount: 18,
          sentimentScore: 0.28
        }
      ])

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_sentiment_trends', {
        p_tenant_id: tenantId,
        p_keywords: null,
        p_platforms: null,
        p_start_date: null,
        p_end_date: null,
        p_interval_type: 'day'
      })
    })
  })

  describe('getKeywordFrequency', () => {
    it('should return keyword frequency data', async () => {
      const tenantId = 'test-tenant-id'
      const mockFrequencyData = [
        {
          keyword: 'popular-keyword',
          frequency: 25,
          platforms: ['twitter', 'reddit', 'linkedin'],
          sentiment_distribution: { positive: 15, negative: 5, neutral: 5 },
          first_seen: '2024-01-01T00:00:00Z',
          last_seen: '2024-01-05T00:00:00Z',
          trend_direction: 'rising'
        }
      ]

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: mockFrequencyData,
        error: null
      })

      const result = await analyticsService.getKeywordFrequency(tenantId, {}, 5)

      expect(result).toEqual([
        {
          keyword: 'popular-keyword',
          frequency: 25,
          platforms: ['twitter', 'reddit', 'linkedin'],
          sentimentDistribution: { positive: 15, negative: 5, neutral: 5 },
          firstSeen: '2024-01-01T00:00:00Z',
          lastSeen: '2024-01-05T00:00:00Z',
          trendDirection: 'rising'
        }
      ])

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_keyword_frequency', {
        p_tenant_id: tenantId,
        p_start_date: null,
        p_end_date: null,
        p_platforms: null,
        p_min_frequency: 5
      })
    })
  })

  describe('getPlatformDistribution', () => {
    it('should calculate platform distribution with sentiment breakdown', async () => {
      const tenantId = 'test-tenant-id'
      const mockConversationData = [
        { platform: 'twitter', sentiment: 'positive' },
        { platform: 'twitter', sentiment: 'positive' },
        { platform: 'twitter', sentiment: 'negative' },
        { platform: 'reddit', sentiment: 'neutral' },
        { platform: 'reddit', sentiment: 'positive' },
        { platform: 'linkedin', sentiment: 'positive' }
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: mockConversationData,
            error: null
          })
        })
      })

      const result = await analyticsService.getPlatformDistribution(tenantId)

      expect(result).toEqual([
        {
          platform: 'twitter',
          count: 3,
          percentage: 50,
          sentimentBreakdown: {
            positive: 2,
            negative: 1,
            neutral: 0
          }
        },
        {
          platform: 'reddit',
          count: 2,
          percentage: expect.closeTo(33.33, 1),
          sentimentBreakdown: {
            positive: 1,
            negative: 0,
            neutral: 1
          }
        },
        {
          platform: 'linkedin',
          count: 1,
          percentage: expect.closeTo(16.67, 1),
          sentimentBreakdown: {
            positive: 1,
            negative: 0,
            neutral: 0
          }
        }
      ])
    })
  })

  describe('getKeywordPerformance', () => {
    it('should calculate keyword performance metrics', async () => {
      const tenantId = 'test-tenant-id'
      const mockFrequencyData = [
        {
          keyword: 'high-performing-keyword',
          frequency: 20,
          platforms: ['twitter', 'reddit'],
          sentiment_distribution: { positive: 15, negative: 3, neutral: 2 },
          first_seen: '2024-01-01T00:00:00Z',
          last_seen: '2024-01-05T00:00:00Z',
          trend_direction: 'rising'
        }
      ]

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: mockFrequencyData,
        error: null
      })

      const result = await analyticsService.getKeywordPerformance(tenantId)

      expect(result).toEqual([
        {
          keyword: 'high-performing-keyword',
          totalMentions: 20,
          averageSentiment: 0.6, // (15 * 1 + 3 * -1 + 2 * 0) / 20
          platforms: ['twitter', 'reddit'],
          recentTrend: 'up',
          engagementScore: 24 // 20 * (1 + (2-1) * 0.2)
        }
      ])
    })
  })

  describe('getTimeSeriesData', () => {
    it('should return time series data for conversations metric', async () => {
      const tenantId = 'test-tenant-id'
      const mockConversationData = [
        { timestamp: '2024-01-01T10:00:00Z', platform: 'twitter' },
        { timestamp: '2024-01-01T11:00:00Z', platform: 'twitter' },
        { timestamp: '2024-01-01T12:00:00Z', platform: 'reddit' },
        { timestamp: '2024-01-02T10:00:00Z', platform: 'linkedin' }
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                not: vi.fn().mockResolvedValue({
                  data: mockConversationData,
                  error: null
                })
              })
            })
          })
        })
      })

      const result = await analyticsService.getTimeSeriesData(tenantId, 'conversations')

      expect(result).toEqual([
        {
          date: '2024-01-01',
          value: 3,
          breakdown: {
            twitter: 2,
            reddit: 1
          }
        },
        {
          date: '2024-01-02',
          value: 1,
          breakdown: {
            linkedin: 1
          }
        }
      ])
    })

    it('should return time series data for sentiment metric', async () => {
      const tenantId = 'test-tenant-id'
      const mockTrendsData = [
        {
          keyword: 'test',
          platform: 'twitter',
          time_bucket: '2024-01-01T00:00:00Z',
          positive_count: 5,
          negative_count: 2,
          neutral_count: 3,
          total_count: 10,
          sentiment_score: 0.3
        }
      ]

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: mockTrendsData,
        error: null
      })

      const result = await analyticsService.getTimeSeriesData(tenantId, 'sentiment')

      expect(result).toEqual([
        {
          date: '2024-01-01',
          value: 10,
          breakdown: {
            positive: 5,
            negative: 2,
            neutral: 3
          }
        }
      ])
    })
  })

  describe('error handling', () => {
    it('should handle RPC errors properly', async () => {
      const tenantId = 'test-tenant-id'
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC function failed' }
      })

      await expect(analyticsService.getSentimentTrends(tenantId))
        .rejects.toThrow('Failed to get sentiment trends: RPC function failed')
    })

    it('should handle query errors properly', async () => {
      const tenantId = 'test-tenant-id'
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Query failed' }
          })
        })
      })

      await expect(analyticsService.getPlatformDistribution(tenantId))
        .rejects.toThrow('Failed to get platform distribution: Query failed')
    })
  })
})