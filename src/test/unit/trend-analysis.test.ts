import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { TrendAnalysisService } from '@/lib/services/trend-analysis'
import { Database } from '@/lib/types/database'

type ConversationRow = Database['public']['Tables']['conversations']['Row']

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  rpc: vi.fn()
}

// Mock conversation data for testing
const mockConversations: ConversationRow[] = [
  {
    id: '1',
    tenant_id: 'tenant-1',
    content: 'Great product experience with excellent customer service',
    author: 'user1',
    platform: 'twitter',
    url: 'https://twitter.com/user1/status/1',
    external_id: 'tweet-1',
    timestamp: '2024-01-15T10:00:00Z',
    sentiment: 'positive',
    sentiment_confidence: 0.9,
    keywords: ['product', 'customer service', 'excellent'],
    tags: ['feedback', 'positive'],
    engagement_metrics: { likes: 10, shares: 5, comments: 2 },
    parent_conversation_id: null,
    raw_data: null,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    tenant_id: 'tenant-1',
    content: 'Product quality has declined recently, very disappointed',
    author: 'user2',
    platform: 'reddit',
    url: 'https://reddit.com/r/product/comments/2',
    external_id: 'reddit-2',
    timestamp: '2024-01-16T14:30:00Z',
    sentiment: 'negative',
    sentiment_confidence: 0.8,
    keywords: ['product', 'quality', 'disappointed'],
    tags: ['feedback', 'negative'],
    engagement_metrics: { likes: 3, shares: 1, comments: 8 },
    parent_conversation_id: null,
    raw_data: null,
    created_at: '2024-01-16T14:30:00Z',
    updated_at: '2024-01-16T14:30:00Z'
  },
  {
    id: '3',
    tenant_id: 'tenant-1',
    content: 'Customer service team was very helpful with my issue',
    author: 'user3',
    platform: 'linkedin',
    url: 'https://linkedin.com/posts/user3/3',
    external_id: 'linkedin-3',
    timestamp: '2024-01-17T09:15:00Z',
    sentiment: 'positive',
    sentiment_confidence: 0.85,
    keywords: ['customer service', 'helpful', 'issue'],
    tags: ['support', 'positive'],
    engagement_metrics: { likes: 15, shares: 3, comments: 4 },
    parent_conversation_id: null,
    raw_data: null,
    created_at: '2024-01-17T09:15:00Z',
    updated_at: '2024-01-17T09:15:00Z'
  },
  {
    id: '4',
    tenant_id: 'tenant-1',
    content: 'New feature announcement looks promising for productivity',
    author: 'user4',
    platform: 'twitter',
    url: 'https://twitter.com/user4/status/4',
    external_id: 'tweet-4',
    timestamp: '2024-01-18T16:45:00Z',
    sentiment: 'positive',
    sentiment_confidence: 0.75,
    keywords: ['feature', 'productivity', 'promising'],
    tags: ['announcement', 'feature'],
    engagement_metrics: { likes: 25, shares: 12, comments: 6 },
    parent_conversation_id: null,
    raw_data: null,
    created_at: '2024-01-18T16:45:00Z',
    updated_at: '2024-01-18T16:45:00Z'
  },
  {
    id: '5',
    tenant_id: 'tenant-1',
    content: 'Product pricing seems too high for the value provided',
    author: 'user5',
    platform: 'reddit',
    url: 'https://reddit.com/r/product/comments/5',
    external_id: 'reddit-5',
    timestamp: '2024-01-19T11:20:00Z',
    sentiment: 'negative',
    sentiment_confidence: 0.7,
    keywords: ['pricing', 'value', 'high'],
    tags: ['pricing', 'feedback'],
    engagement_metrics: { likes: 8, shares: 2, comments: 12 },
    parent_conversation_id: null,
    raw_data: null,
    created_at: '2024-01-19T11:20:00Z',
    updated_at: '2024-01-19T11:20:00Z'
  }
]

describe('TrendAnalysisService', () => {
  let trendAnalysisService: TrendAnalysisService

  beforeEach(() => {
    vi.clearAllMocks()
    trendAnalysisService = new TrendAnalysisService(mockSupabaseClient)
  })

  describe('analyzeTrends', () => {
    beforeEach(() => {
      // Mock the database queries
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: mockConversations,
                  error: null
                })
              })
            })
          })
        })
      })
    })

    it('should analyze trends and return comprehensive results', async () => {
      const result = await trendAnalysisService.analyzeTrends('tenant-1', {
        minConversationCount: 2,
        minRelevanceScore: 0.1
      })

      expect(result).toHaveProperty('trendingTopics')
      expect(result).toHaveProperty('storyClusters')
      expect(result).toHaveProperty('emergingThemes')
      expect(result).toHaveProperty('decliningSentiments')
      expect(result).toHaveProperty('crossPlatformInsights')

      expect(Array.isArray(result.trendingTopics)).toBe(true)
      expect(Array.isArray(result.storyClusters)).toBe(true)
      expect(Array.isArray(result.emergingThemes)).toBe(true)
    })

    it('should filter trends by minimum conversation count', async () => {
      const result = await trendAnalysisService.analyzeTrends('tenant-1', {
        minConversationCount: 10, // High threshold
        minRelevanceScore: 0.1
      })

      // Should return fewer or no trends due to high threshold
      expect(result.trendingTopics.length).toBeLessThanOrEqual(1)
    })

    it('should filter trends by minimum relevance score', async () => {
      const result = await trendAnalysisService.analyzeTrends('tenant-1', {
        minConversationCount: 1,
        minRelevanceScore: 0.9 // Very high threshold
      })

      // Should return fewer trends due to high relevance threshold
      expect(result.trendingTopics.length).toBeLessThanOrEqual(2)
    })

    it('should limit results based on maxResults parameter', async () => {
      const result = await trendAnalysisService.analyzeTrends('tenant-1', {
        minConversationCount: 1,
        minRelevanceScore: 0.1,
        maxResults: 2
      })

      expect(result.trendingTopics.length).toBeLessThanOrEqual(2)
      expect(result.storyClusters.length).toBeLessThanOrEqual(2)
    })
  })

  describe('getTrendingTopics', () => {
    beforeEach(() => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: mockConversations,
                  error: null
                })
              })
            })
          })
        })
      })
    })

    it('should return trending topics sorted by relevance score', async () => {
      const topics = await trendAnalysisService.getTrendingTopics('tenant-1', {
        minConversationCount: 1,
        minRelevanceScore: 0.1
      })

      expect(Array.isArray(topics)).toBe(true)
      
      // Check that topics are sorted by relevance score (descending)
      for (let i = 1; i < topics.length; i++) {
        expect(topics[i - 1].relevanceScore).toBeGreaterThanOrEqual(topics[i].relevanceScore)
      }
    })

    it('should include required properties in trending topics', async () => {
      const topics = await trendAnalysisService.getTrendingTopics('tenant-1', {
        minConversationCount: 1,
        minRelevanceScore: 0.1
      })

      if (topics.length > 0) {
        const topic = topics[0]
        expect(topic).toHaveProperty('id')
        expect(topic).toHaveProperty('theme')
        expect(topic).toHaveProperty('keywords')
        expect(topic).toHaveProperty('relevanceScore')
        expect(topic).toHaveProperty('conversationCount')
        expect(topic).toHaveProperty('sentimentDistribution')
        expect(topic).toHaveProperty('platforms')
        expect(topic).toHaveProperty('timeRange')
        expect(topic).toHaveProperty('emergingTrend')
        expect(topic).toHaveProperty('trendDirection')
      }
    })

    it('should calculate sentiment distribution correctly', async () => {
      const topics = await trendAnalysisService.getTrendingTopics('tenant-1', {
        minConversationCount: 1,
        minRelevanceScore: 0.1
      })

      if (topics.length > 0) {
        const topic = topics[0]
        const { positive, negative, neutral } = topic.sentimentDistribution
        
        expect(typeof positive).toBe('number')
        expect(typeof negative).toBe('number')
        expect(typeof neutral).toBe('number')
        expect(positive + negative + neutral).toBeGreaterThan(0)
      }
    })
  })

  describe('getStoryClusters', () => {
    beforeEach(() => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: mockConversations,
                  error: null
                })
              })
            })
          })
        })
      })
    })

    it('should return story clusters with required properties', async () => {
      const clusters = await trendAnalysisService.getStoryClusters('tenant-1', {
        minConversationCount: 1,
        minRelevanceScore: 0.1
      })

      if (clusters.length > 0) {
        const cluster = clusters[0]
        expect(cluster).toHaveProperty('id')
        expect(cluster).toHaveProperty('title')
        expect(cluster).toHaveProperty('summary')
        expect(cluster).toHaveProperty('mainTheme')
        expect(cluster).toHaveProperty('subThemes')
        expect(cluster).toHaveProperty('relevanceScore')
        expect(cluster).toHaveProperty('conversationIds')
        expect(cluster).toHaveProperty('platforms')
        expect(cluster).toHaveProperty('timeSpan')
        expect(cluster).toHaveProperty('sentimentEvolution')
        expect(cluster).toHaveProperty('keyPhrases')
        expect(cluster).toHaveProperty('crossPlatformLinks')
      }
    })

    it('should group related conversations correctly', async () => {
      const clusters = await trendAnalysisService.getStoryClusters('tenant-1', {
        minConversationCount: 1,
        minRelevanceScore: 0.1
      })

      clusters.forEach(cluster => {
        expect(Array.isArray(cluster.conversationIds)).toBe(true)
        expect(cluster.conversationIds.length).toBeGreaterThan(0)
        expect(Array.isArray(cluster.platforms)).toBe(true)
        expect(cluster.platforms.length).toBeGreaterThan(0)
      })
    })
  })

  describe('relevance score calculation', () => {
    it('should calculate relevance score based on multiple factors', async () => {
      // Test the private method indirectly through getTrendingTopics
      const topics = await trendAnalysisService.getTrendingTopics('tenant-1', {
        minConversationCount: 1,
        minRelevanceScore: 0.0
      })

      topics.forEach(topic => {
        expect(topic.relevanceScore).toBeGreaterThanOrEqual(0)
        expect(topic.relevanceScore).toBeLessThanOrEqual(1)
      })
    })

    it('should give higher scores to topics with more engagement', async () => {
      // Mock conversations with different engagement levels
      const highEngagementConversations = mockConversations.map(conv => ({
        ...conv,
        engagement_metrics: { likes: 100, shares: 50, comments: 25 }
      }))

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: highEngagementConversations,
                  error: null
                })
              })
            })
          })
        })
      })

      const topics = await trendAnalysisService.getTrendingTopics('tenant-1', {
        minConversationCount: 1,
        minRelevanceScore: 0.0
      })

      // Topics with high engagement should have higher relevance scores
      topics.forEach(topic => {
        expect(topic.relevanceScore).toBeGreaterThan(0.2)
      })
    })
  })

  describe('trend direction calculation', () => {
    it('should identify rising trends correctly', async () => {
      // Mock conversations with increasing frequency over time
      const risingTrendConversations = [
        ...mockConversations.slice(0, 2).map(conv => ({
          ...conv,
          timestamp: '2024-01-15T10:00:00Z' // Older
        })),
        ...mockConversations.slice(2).map(conv => ({
          ...conv,
          timestamp: new Date().toISOString() // Recent
        }))
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: risingTrendConversations,
                  error: null
                })
              })
            })
          })
        })
      })

      const topics = await trendAnalysisService.getTrendingTopics('tenant-1', {
        minConversationCount: 1,
        minRelevanceScore: 0.0
      })

      // Should detect some rising trends
      const risingTrends = topics.filter(topic => topic.trendDirection === 'rising')
      expect(risingTrends.length).toBeGreaterThan(0)
    })

    it('should identify emerging trends correctly', async () => {
      // Mock conversations that are mostly recent
      const emergingTrendConversations = mockConversations.map(conv => ({
        ...conv,
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Last 24 hours
      }))

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: emergingTrendConversations,
                  error: null
                })
              })
            })
          })
        })
      })

      const topics = await trendAnalysisService.getTrendingTopics('tenant-1', {
        minConversationCount: 1,
        minRelevanceScore: 0.0
      })

      // Should detect emerging trends
      const emergingTrends = topics.filter(topic => topic.emergingTrend)
      expect(emergingTrends.length).toBeGreaterThan(0)
    })
  })

  describe('cross-platform analysis', () => {
    it('should identify cross-platform insights', async () => {
      const result = await trendAnalysisService.analyzeTrends('tenant-1', {
        minConversationCount: 1,
        minRelevanceScore: 0.1
      })

      expect(Array.isArray(result.crossPlatformInsights)).toBe(true)
      
      result.crossPlatformInsights.forEach(insight => {
        expect(insight).toHaveProperty('theme')
        expect(insight).toHaveProperty('platforms')
        expect(insight).toHaveProperty('correlationStrength')
        expect(Array.isArray(insight.platforms)).toBe(true)
        expect(insight.platforms.length).toBeGreaterThan(1)
        expect(insight.correlationStrength).toBeGreaterThanOrEqual(0)
        expect(insight.correlationStrength).toBeLessThanOrEqual(1)
      })
    })

    it('should find cross-platform links in story clusters', async () => {
      const clusters = await trendAnalysisService.getStoryClusters('tenant-1', {
        minConversationCount: 1,
        minRelevanceScore: 0.1
      })

      clusters.forEach(cluster => {
        expect(Array.isArray(cluster.crossPlatformLinks)).toBe(true)
        
        cluster.crossPlatformLinks.forEach(link => {
          expect(link).toHaveProperty('platform1')
          expect(link).toHaveProperty('platform2')
          expect(link).toHaveProperty('sharedKeywords')
          expect(link).toHaveProperty('linkStrength')
          expect(Array.isArray(link.sharedKeywords)).toBe(true)
          expect(link.linkStrength).toBeGreaterThanOrEqual(0)
          expect(link.linkStrength).toBeLessThanOrEqual(1)
        })
      })
    })
  })

  describe('sentiment evolution tracking', () => {
    it('should track sentiment changes over time', async () => {
      const result = await trendAnalysisService.analyzeTrends('tenant-1', {
        minConversationCount: 1,
        minRelevanceScore: 0.1
      })

      expect(Array.isArray(result.decliningSentiments)).toBe(true)
      
      result.decliningSentiments.forEach(sentiment => {
        expect(sentiment).toHaveProperty('theme')
        expect(sentiment).toHaveProperty('sentimentChange')
        expect(sentiment).toHaveProperty('timeframe')
        expect(typeof sentiment.sentimentChange).toBe('number')
        expect(Math.abs(sentiment.sentimentChange)).toBeGreaterThan(0.1)
      })
    })

    it('should calculate sentiment evolution in story clusters', async () => {
      const clusters = await trendAnalysisService.getStoryClusters('tenant-1', {
        minConversationCount: 1,
        minRelevanceScore: 0.1
      })

      clusters.forEach(cluster => {
        expect(Array.isArray(cluster.sentimentEvolution)).toBe(true)
        
        cluster.sentimentEvolution.forEach(evolution => {
          expect(evolution).toHaveProperty('timestamp')
          expect(evolution).toHaveProperty('sentiment')
          expect(evolution).toHaveProperty('count')
          expect(['positive', 'negative', 'neutral']).toContain(evolution.sentiment)
          expect(typeof evolution.count).toBe('number')
          expect(evolution.count).toBeGreaterThan(0)
        })
      })
    })
  })

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' }
                })
              })
            })
          })
        })
      })

      await expect(
        trendAnalysisService.analyzeTrends('tenant-1')
      ).rejects.toThrow('Failed to get conversations for analysis: Database error')
    })

    it('should handle empty conversation data', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          })
        })
      })

      const result = await trendAnalysisService.analyzeTrends('tenant-1')
      
      expect(result.trendingTopics).toEqual([])
      expect(result.storyClusters).toEqual([])
      expect(result.emergingThemes).toEqual([])
      expect(result.decliningSentiments).toEqual([])
      expect(result.crossPlatformInsights).toEqual([])
    })
  })

  describe('performance and scalability', () => {
    it('should handle large datasets efficiently', async () => {
      // Create a large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockConversations[i % mockConversations.length],
        id: `conversation-${i}`,
        content: `Test conversation ${i} with various keywords`,
        keywords: [`keyword-${i % 10}`, `topic-${i % 5}`]
      }))

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: largeDataset,
                  error: null
                })
              })
            })
          })
        })
      })

      const startTime = Date.now()
      const result = await trendAnalysisService.analyzeTrends('tenant-1', {
        minConversationCount: 5,
        minRelevanceScore: 0.1,
        maxResults: 10
      })
      const endTime = Date.now()

      // Should complete within reasonable time (5 seconds)
      expect(endTime - startTime).toBeLessThan(5000)
      
      // Should return limited results as requested
      expect(result.trendingTopics.length).toBeLessThanOrEqual(10)
      expect(result.storyClusters.length).toBeLessThanOrEqual(10)
    })
  })
})