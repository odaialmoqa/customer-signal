import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { GET as getDashboard } from '@/app/api/analytics/dashboard/route'
import { GET as getTrends } from '@/app/api/analytics/trends/route'
import { GET as getKeywords } from '@/app/api/analytics/keywords/route'
import { GET as getPlatforms } from '@/app/api/analytics/platforms/route'
import { GET as getClusters } from '@/app/api/analytics/clusters/route'
import { GET as getThemes } from '@/app/api/analytics/themes/route'
import { GET as getTimeSeries } from '@/app/api/analytics/timeseries/route'

const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  })),
  rpc: vi.fn()
}

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase)
}))

describe('Analytics API Integration Tests', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com'
  }

  const mockProfile = {
    tenant_id: 'test-tenant-id'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful authentication
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    // Mock profile lookup
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
      })
    })
  })

  describe('Dashboard Analytics API', () => {
    it('should return dashboard metrics successfully', async () => {
      const mockStatsData = [{
        total_conversations: 150,
        positive_count: 90,
        negative_count: 30,
        neutral_count: 30,
        platform_distribution: { twitter: 75, reddit: 45, linkedin: 30 },
        daily_counts: { '2024-01-01': 20, '2024-01-02': 25 }
      }]

      // Mock the RPC calls
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: mockStatsData, error: null }) // stats
        .mockResolvedValueOnce({ // keyword frequency
          data: [
            {
              keyword: 'product-feedback',
              frequency: 25,
              platforms: ['twitter', 'reddit'],
              sentiment_distribution: { positive: 15, negative: 5, neutral: 5 },
              first_seen: '2024-01-01',
              last_seen: '2024-01-05',
              trend_direction: 'rising'
            }
          ],
          error: null
        })
        .mockResolvedValueOnce({ // sentiment trends
          data: [
            {
              keyword: 'product-feedback',
              platform: 'twitter',
              time_bucket: '2024-01-01T00:00:00Z',
              positive_count: 8,
              negative_count: 2,
              neutral_count: 3,
              total_count: 13,
              sentiment_score: 0.46
            }
          ],
          error: null
        })
        .mockResolvedValueOnce({ // emerging themes
          data: [
            {
              keyword: 'new-feature',
              recent_count: 20,
              previous_count: 5,
              growth_rate: 4.0,
              platforms: ['twitter', 'linkedin'],
              sentiment_trend: 0.3
            }
          ],
          error: null
        })

      // Mock platform distribution query
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            data: [
              { platform: 'twitter', sentiment: 'positive' },
              { platform: 'twitter', sentiment: 'positive' },
              { platform: 'reddit', sentiment: 'neutral' }
            ],
            error: null
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/dashboard?start_date=2024-01-01&end_date=2024-01-31')
      const response = await getDashboard(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        totalConversations: 150,
        sentimentDistribution: {
          positive: 90,
          negative: 30,
          neutral: 30
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
    })

    it('should handle unauthorized requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/dashboard')
      const response = await getDashboard(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle missing tenant', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/dashboard')
      const response = await getDashboard(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Tenant not found')
    })
  })

  describe('Sentiment Trends API', () => {
    it('should return sentiment trends data', async () => {
      const mockTrendsData = [
        {
          keyword: 'customer-service',
          platform: 'twitter',
          time_bucket: '2024-01-01T00:00:00Z',
          positive_count: 12,
          negative_count: 3,
          neutral_count: 5,
          total_count: 20,
          sentiment_score: 0.45
        },
        {
          keyword: 'customer-service',
          platform: 'reddit',
          time_bucket: '2024-01-01T00:00:00Z',
          positive_count: 8,
          negative_count: 7,
          neutral_count: 5,
          total_count: 20,
          sentiment_score: 0.05
        }
      ]

      mockSupabase.rpc.mockResolvedValue({
        data: mockTrendsData,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/trends?interval_type=day&keywords=customer-service')
      const response = await getTrends(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data[0]).toMatchObject({
        keyword: 'customer-service',
        platform: 'twitter',
        timeBucket: '2024-01-01T00:00:00Z',
        positiveCount: 12,
        negativeCount: 3,
        neutralCount: 5,
        totalCount: 20,
        sentimentScore: 0.45
      })
    })
  })

  describe('Keywords API', () => {
    it('should return keyword frequency data', async () => {
      const mockFrequencyData = [
        {
          keyword: 'bug-report',
          frequency: 35,
          platforms: ['twitter', 'reddit', 'github'],
          sentiment_distribution: { positive: 5, negative: 25, neutral: 5 },
          first_seen: '2024-01-01T00:00:00Z',
          last_seen: '2024-01-05T00:00:00Z',
          trend_direction: 'rising'
        }
      ]

      mockSupabase.rpc.mockResolvedValue({
        data: mockFrequencyData,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/keywords?type=frequency&min_frequency=10')
      const response = await getKeywords(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0]).toMatchObject({
        keyword: 'bug-report',
        frequency: 35,
        platforms: ['twitter', 'reddit', 'github'],
        sentimentDistribution: { positive: 5, negative: 25, neutral: 5 },
        trendDirection: 'rising'
      })
    })

    it('should return keyword performance data', async () => {
      const mockFrequencyData = [
        {
          keyword: 'feature-request',
          frequency: 20,
          platforms: ['twitter', 'reddit'],
          sentiment_distribution: { positive: 15, negative: 2, neutral: 3 },
          first_seen: '2024-01-01T00:00:00Z',
          last_seen: '2024-01-05T00:00:00Z',
          trend_direction: 'stable'
        }
      ]

      mockSupabase.rpc.mockResolvedValue({
        data: mockFrequencyData,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/keywords?type=performance')
      const response = await getKeywords(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0]).toMatchObject({
        keyword: 'feature-request',
        totalMentions: 20,
        averageSentiment: expect.any(Number),
        platforms: ['twitter', 'reddit'],
        recentTrend: 'stable',
        engagementScore: expect.any(Number)
      })
    })
  })

  describe('Platforms API', () => {
    it('should return platform distribution data', async () => {
      const mockConversationData = [
        { platform: 'twitter', sentiment: 'positive' },
        { platform: 'twitter', sentiment: 'negative' },
        { platform: 'reddit', sentiment: 'neutral' },
        { platform: 'linkedin', sentiment: 'positive' }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: mockConversationData,
            error: null
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/platforms?type=distribution')
      const response = await getPlatforms(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(3)
      expect(data[0]).toMatchObject({
        platform: 'twitter',
        count: 2,
        percentage: 50,
        sentimentBreakdown: {
          positive: 1,
          negative: 1,
          neutral: 0
        }
      })
    })

    it('should return cross-platform patterns', async () => {
      const mockPatternsData = [
        {
          keyword: 'product-launch',
          platform1: 'twitter',
          platform2: 'linkedin',
          shared_conversations: 15,
          correlation_strength: 0.75,
          temporal_overlap: 0.8
        }
      ]

      mockSupabase.rpc.mockResolvedValue({
        data: mockPatternsData,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/platforms?type=patterns&min_correlation=0.5')
      const response = await getPlatforms(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0]).toMatchObject({
        keyword: 'product-launch',
        platform1: 'twitter',
        platform2: 'linkedin',
        sharedConversations: 15,
        correlationStrength: 0.75,
        temporalOverlap: 0.8
      })
    })
  })

  describe('Clusters API', () => {
    it('should return conversation clusters', async () => {
      const mockClustersData = [
        {
          cluster_id: 'cluster_1',
          conversation_ids: ['conv1', 'conv2', 'conv3'],
          shared_keywords: ['support', 'issue'],
          platforms: ['twitter', 'reddit'],
          sentiment_distribution: { positive: 1, negative: 2, neutral: 0 },
          time_span: { start: '2024-01-01T00:00:00Z', end: '2024-01-02T00:00:00Z' },
          conversation_count: 3
        }
      ]

      mockSupabase.rpc.mockResolvedValue({
        data: mockClustersData,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/clusters?min_cluster_size=3&similarity_threshold=0.4')
      const response = await getClusters(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0]).toMatchObject({
        clusterId: 'cluster_1',
        conversationIds: ['conv1', 'conv2', 'conv3'],
        sharedKeywords: ['support', 'issue'],
        platforms: ['twitter', 'reddit'],
        sentimentDistribution: { positive: 1, negative: 2, neutral: 0 },
        conversationCount: 3
      })
    })
  })

  describe('Themes API', () => {
    it('should return emerging themes', async () => {
      const mockThemesData = [
        {
          keyword: 'ai-integration',
          recent_count: 30,
          previous_count: 8,
          growth_rate: 3.75,
          platforms: ['twitter', 'linkedin', 'reddit'],
          sentiment_trend: 0.4
        }
      ]

      mockSupabase.rpc.mockResolvedValue({
        data: mockThemesData,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/themes?lookback_days=7&min_growth_rate=3.0')
      const response = await getThemes(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0]).toMatchObject({
        keyword: 'ai-integration',
        recentCount: 30,
        previousCount: 8,
        growthRate: 3.75,
        platforms: ['twitter', 'linkedin', 'reddit'],
        sentimentTrend: 0.4
      })
    })
  })

  describe('Time Series API', () => {
    it('should return time series data for conversations', async () => {
      const mockConversationData = [
        { timestamp: '2024-01-01T10:00:00Z', platform: 'twitter' },
        { timestamp: '2024-01-01T11:00:00Z', platform: 'twitter' },
        { timestamp: '2024-01-02T10:00:00Z', platform: 'reddit' }
      ]

      mockSupabase.from.mockReturnValue({
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

      const request = new NextRequest('http://localhost:3000/api/analytics/timeseries?metric=conversations&interval_type=day')
      const response = await getTimeSeries(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data[0]).toMatchObject({
        date: '2024-01-01',
        value: 2,
        breakdown: {
          twitter: 2
        }
      })
      expect(data[1]).toMatchObject({
        date: '2024-01-02',
        value: 1,
        breakdown: {
          reddit: 1
        }
      })
    })

    it('should return time series data for sentiment', async () => {
      const mockTrendsData = [
        {
          keyword: 'test',
          platform: 'twitter',
          time_bucket: '2024-01-01T00:00:00Z',
          positive_count: 10,
          negative_count: 3,
          neutral_count: 2,
          total_count: 15,
          sentiment_score: 0.47
        }
      ]

      mockSupabase.rpc.mockResolvedValue({
        data: mockTrendsData,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/timeseries?metric=sentiment')
      const response = await getTimeSeries(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0]).toMatchObject({
        date: '2024-01-01',
        value: 15,
        breakdown: {
          positive: 10,
          negative: 3,
          neutral: 2
        }
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/dashboard')
      const response = await getDashboard(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to get dashboard metrics')
    })

    it('should validate query parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/trends?interval_type=invalid')
      const response = await getTrends(request)

      // The API should still work but use default interval
      expect(response.status).toBe(200)
    })
  })
})