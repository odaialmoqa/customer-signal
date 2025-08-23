import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/types/database'

type ConversationInsert = Database['public']['Tables']['conversations']['Insert']

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const testTenantId = 'test-tenant-trend-analysis'
const testUserId = 'test-user-trend-analysis'

describe('Trend Analysis Integration Tests', () => {
  let supabase: ReturnType<typeof createClient<Database>>
  let testConversations: string[] = []

  beforeEach(async () => {
    supabase = createClient<Database>(supabaseUrl, supabaseKey)
    
    // Clean up any existing test data
    await cleanup()
    
    // Create test tenant
    await supabase.from('tenants').insert({
      id: testTenantId,
      name: 'Test Tenant for Trend Analysis',
      subscription: 'pro'
    })

    // Create test user profile
    await supabase.from('user_profiles').insert({
      id: testUserId,
      tenant_id: testTenantId,
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'admin'
    })

    // Insert test conversations for trend analysis
    const conversations: ConversationInsert[] = [
      {
        tenant_id: testTenantId,
        content: 'Amazing customer service experience, very helpful staff',
        author: 'user1',
        platform: 'twitter',
        url: 'https://twitter.com/user1/status/1',
        external_id: 'tweet-1',
        timestamp: '2024-01-15T10:00:00Z',
        sentiment: 'positive',
        sentiment_confidence: 0.9,
        keywords: ['customer service', 'helpful', 'staff'],
        tags: ['support', 'positive'],
        engagement_metrics: { likes: 15, shares: 8, comments: 3 }
      },
      {
        tenant_id: testTenantId,
        content: 'Customer service team resolved my issue quickly',
        author: 'user2',
        platform: 'reddit',
        url: 'https://reddit.com/r/support/comments/2',
        external_id: 'reddit-2',
        timestamp: '2024-01-16T14:30:00Z',
        sentiment: 'positive',
        sentiment_confidence: 0.85,
        keywords: ['customer service', 'resolved', 'quickly'],
        tags: ['support', 'resolution'],
        engagement_metrics: { likes: 12, shares: 4, comments: 6 }
      },
      {
        tenant_id: testTenantId,
        content: 'Product quality has improved significantly this year',
        author: 'user3',
        platform: 'linkedin',
        url: 'https://linkedin.com/posts/user3/3',
        external_id: 'linkedin-3',
        timestamp: '2024-01-17T09:15:00Z',
        sentiment: 'positive',
        sentiment_confidence: 0.8,
        keywords: ['product', 'quality', 'improved'],
        tags: ['product', 'quality'],
        engagement_metrics: { likes: 25, shares: 12, comments: 8 }
      },
      {
        tenant_id: testTenantId,
        content: 'New feature announcement looks very promising',
        author: 'user4',
        platform: 'twitter',
        url: 'https://twitter.com/user4/status/4',
        external_id: 'tweet-4',
        timestamp: '2024-01-18T16:45:00Z',
        sentiment: 'positive',
        sentiment_confidence: 0.75,
        keywords: ['feature', 'announcement', 'promising'],
        tags: ['feature', 'announcement'],
        engagement_metrics: { likes: 30, shares: 15, comments: 10 }
      },
      {
        tenant_id: testTenantId,
        content: 'Pricing seems too high for the value provided',
        author: 'user5',
        platform: 'reddit',
        url: 'https://reddit.com/r/pricing/comments/5',
        external_id: 'reddit-5',
        timestamp: '2024-01-19T11:20:00Z',
        sentiment: 'negative',
        sentiment_confidence: 0.7,
        keywords: ['pricing', 'high', 'value'],
        tags: ['pricing', 'feedback'],
        engagement_metrics: { likes: 8, shares: 3, comments: 15 }
      },
      {
        tenant_id: testTenantId,
        content: 'Customer service response time has gotten worse',
        author: 'user6',
        platform: 'twitter',
        url: 'https://twitter.com/user6/status/6',
        external_id: 'tweet-6',
        timestamp: '2024-01-20T13:10:00Z',
        sentiment: 'negative',
        sentiment_confidence: 0.8,
        keywords: ['customer service', 'response time', 'worse'],
        tags: ['support', 'complaint'],
        engagement_metrics: { likes: 5, shares: 2, comments: 8 }
      },
      {
        tenant_id: testTenantId,
        content: 'Product documentation needs improvement',
        author: 'user7',
        platform: 'linkedin',
        url: 'https://linkedin.com/posts/user7/7',
        external_id: 'linkedin-7',
        timestamp: '2024-01-21T08:30:00Z',
        sentiment: 'neutral',
        sentiment_confidence: 0.6,
        keywords: ['product', 'documentation', 'improvement'],
        tags: ['documentation', 'feedback'],
        engagement_metrics: { likes: 10, shares: 5, comments: 12 }
      },
      {
        tenant_id: testTenantId,
        content: 'Feature request: better mobile app experience',
        author: 'user8',
        platform: 'reddit',
        url: 'https://reddit.com/r/features/comments/8',
        external_id: 'reddit-8',
        timestamp: '2024-01-22T15:45:00Z',
        sentiment: 'neutral',
        sentiment_confidence: 0.65,
        keywords: ['feature', 'mobile app', 'experience'],
        tags: ['feature request', 'mobile'],
        engagement_metrics: { likes: 18, shares: 7, comments: 20 }
      }
    ]

    const { data: insertedConversations, error } = await supabase
      .from('conversations')
      .insert(conversations)
      .select('id')

    if (error) {
      throw new Error(`Failed to insert test conversations: ${error.message}`)
    }

    testConversations = insertedConversations?.map(c => c.id) || []
  })

  afterEach(async () => {
    await cleanup()
  })

  async function cleanup() {
    // Clean up test data
    await supabase.from('conversations').delete().eq('tenant_id', testTenantId)
    await supabase.from('user_profiles').delete().eq('id', testUserId)
    await supabase.from('tenants').delete().eq('id', testTenantId)
  }

  describe('GET /api/trends', () => {
    it('should return comprehensive trend analysis', async () => {
      // Mock authentication
      const mockUser = { id: testUserId }
      vi.mock('@/lib/supabase/server', () => ({
        createClient: () => ({
          auth: {
            getUser: () => Promise.resolve({ data: { user: mockUser }, error: null })
          },
          from: (table: string) => {
            if (table === 'user_profiles') {
              return {
                select: () => ({
                  eq: () => ({
                    single: () => Promise.resolve({
                      data: { tenant_id: testTenantId },
                      error: null
                    })
                  })
                })
              }
            }
            return supabase.from(table)
          }
        })
      }))

      const response = await fetch('/api/trends?minConversationCount=2&minRelevanceScore=0.1', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data).toHaveProperty('trendingTopics')
      expect(data).toHaveProperty('storyClusters')
      expect(data).toHaveProperty('emergingThemes')
      expect(data).toHaveProperty('decliningSentiments')
      expect(data).toHaveProperty('crossPlatformInsights')

      expect(Array.isArray(data.trendingTopics)).toBe(true)
      expect(Array.isArray(data.storyClusters)).toBe(true)
      expect(Array.isArray(data.emergingThemes)).toBe(true)
    })

    it('should filter trends by time range', async () => {
      const startDate = '2024-01-18T00:00:00Z'
      const endDate = '2024-01-22T23:59:59Z'

      const response = await fetch(
        `/api/trends?start=${startDate}&end=${endDate}&minConversationCount=1`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      expect(response.status).toBe(200)
      const data = await response.json()

      // Should only include trends from the specified time range
      data.trendingTopics.forEach((topic: any) => {
        expect(new Date(topic.timeRange.start)).toBeGreaterThanOrEqual(new Date(startDate))
        expect(new Date(topic.timeRange.end)).toBeLessThanOrEqual(new Date(endDate))
      })
    })

    it('should filter trends by platforms', async () => {
      const platforms = 'twitter,reddit'

      const response = await fetch(
        `/api/trends?platforms=${platforms}&minConversationCount=1`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      expect(response.status).toBe(200)
      const data = await response.json()

      // Should only include trends from specified platforms
      data.trendingTopics.forEach((topic: any) => {
        const topicPlatforms = topic.platforms
        expect(topicPlatforms.some((p: string) => ['twitter', 'reddit'].includes(p))).toBe(true)
      })
    })

    it('should filter trends by keywords', async () => {
      const keywords = 'customer service,product'

      const response = await fetch(
        `/api/trends?keywords=${keywords}&minConversationCount=1`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      expect(response.status).toBe(200)
      const data = await response.json()

      // Should only include trends related to specified keywords
      data.trendingTopics.forEach((topic: any) => {
        const hasKeyword = topic.keywords.some((k: string) => 
          ['customer service', 'product'].includes(k)
        )
        expect(hasKeyword).toBe(true)
      })
    })
  })

  describe('GET /api/trends/topics', () => {
    it('should return trending topics with proper structure', async () => {
      const response = await fetch('/api/trends/topics?minConversationCount=2', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data).toHaveProperty('trendingTopics')
      expect(Array.isArray(data.trendingTopics)).toBe(true)

      if (data.trendingTopics.length > 0) {
        const topic = data.trendingTopics[0]
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

        // Validate sentiment distribution
        const { positive, negative, neutral } = topic.sentimentDistribution
        expect(typeof positive).toBe('number')
        expect(typeof negative).toBe('number')
        expect(typeof neutral).toBe('number')
      }
    })

    it('should sort topics by relevance score', async () => {
      const response = await fetch('/api/trends/topics?minConversationCount=1', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      const topics = data.trendingTopics
      for (let i = 1; i < topics.length; i++) {
        expect(topics[i - 1].relevanceScore).toBeGreaterThanOrEqual(topics[i].relevanceScore)
      }
    })
  })

  describe('GET /api/trends/stories', () => {
    it('should return story clusters with proper structure', async () => {
      const response = await fetch('/api/trends/stories?minConversationCount=2', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data).toHaveProperty('storyClusters')
      expect(Array.isArray(data.storyClusters)).toBe(true)

      if (data.storyClusters.length > 0) {
        const cluster = data.storyClusters[0]
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

        // Validate arrays
        expect(Array.isArray(cluster.subThemes)).toBe(true)
        expect(Array.isArray(cluster.conversationIds)).toBe(true)
        expect(Array.isArray(cluster.platforms)).toBe(true)
        expect(Array.isArray(cluster.sentimentEvolution)).toBe(true)
        expect(Array.isArray(cluster.keyPhrases)).toBe(true)
        expect(Array.isArray(cluster.crossPlatformLinks)).toBe(true)
      }
    })

    it('should group related conversations correctly', async () => {
      const response = await fetch('/api/trends/stories?minConversationCount=1', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      data.storyClusters.forEach((cluster: any) => {
        expect(cluster.conversationIds.length).toBeGreaterThan(0)
        expect(cluster.platforms.length).toBeGreaterThan(0)
        
        // Validate time span
        expect(cluster.timeSpan).toHaveProperty('start')
        expect(cluster.timeSpan).toHaveProperty('end')
        expect(new Date(cluster.timeSpan.start)).toBeInstanceOf(Date)
        expect(new Date(cluster.timeSpan.end)).toBeInstanceOf(Date)
      })
    })
  })

  describe('GET /api/trends/[id]/related', () => {
    it('should return related conversations for a trend', async () => {
      const trendId = 'test-trend-id'
      
      const response = await fetch(`/api/trends/${trendId}/related?limit=10`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data).toHaveProperty('conversations')
      expect(Array.isArray(data.conversations)).toBe(true)
      expect(data.conversations.length).toBeLessThanOrEqual(10)
    })

    it('should respect the limit parameter', async () => {
      const trendId = 'test-trend-id'
      const limit = 5
      
      const response = await fetch(`/api/trends/${trendId}/related?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.conversations.length).toBeLessThanOrEqual(limit)
    })
  })

  describe('Cross-platform analysis', () => {
    it('should identify cross-platform trends', async () => {
      const response = await fetch('/api/trends?minConversationCount=1&minRelevanceScore=0.1', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      // Should find cross-platform insights
      expect(Array.isArray(data.crossPlatformInsights)).toBe(true)
      
      data.crossPlatformInsights.forEach((insight: any) => {
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
      const response = await fetch('/api/trends/stories?minConversationCount=1', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      data.storyClusters.forEach((cluster: any) => {
        cluster.crossPlatformLinks.forEach((link: any) => {
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

  describe('Sentiment analysis', () => {
    it('should track sentiment changes over time', async () => {
      const response = await fetch('/api/trends?minConversationCount=1', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(Array.isArray(data.decliningSentiments)).toBe(true)
      
      data.decliningSentiments.forEach((sentiment: any) => {
        expect(sentiment).toHaveProperty('theme')
        expect(sentiment).toHaveProperty('sentimentChange')
        expect(sentiment).toHaveProperty('timeframe')
        expect(typeof sentiment.sentimentChange).toBe('number')
        expect(Math.abs(sentiment.sentimentChange)).toBeGreaterThan(0.1)
      })
    })

    it('should calculate sentiment evolution in story clusters', async () => {
      const response = await fetch('/api/trends/stories?minConversationCount=1', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      data.storyClusters.forEach((cluster: any) => {
        cluster.sentimentEvolution.forEach((evolution: any) => {
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

  describe('Error handling', () => {
    it('should return 401 for unauthorized requests', async () => {
      // Mock unauthorized user
      vi.mock('@/lib/supabase/server', () => ({
        createClient: () => ({
          auth: {
            getUser: () => Promise.resolve({ data: { user: null }, error: { message: 'Unauthorized' } })
          }
        })
      }))

      const response = await fetch('/api/trends', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should handle invalid parameters gracefully', async () => {
      const response = await fetch('/api/trends?minConversationCount=invalid&minRelevanceScore=invalid', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Should still return 200 with default values
      expect(response.status).toBe(200)
    })
  })

  describe('Performance', () => {
    it('should complete trend analysis within reasonable time', async () => {
      const startTime = Date.now()
      
      const response = await fetch('/api/trends?minConversationCount=1&maxResults=5', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(10000) // Should complete within 10 seconds
    })

    it('should respect maxResults parameter', async () => {
      const maxResults = 3
      
      const response = await fetch(`/api/trends?minConversationCount=1&maxResults=${maxResults}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.trendingTopics.length).toBeLessThanOrEqual(maxResults)
      expect(data.storyClusters.length).toBeLessThanOrEqual(maxResults)
    })
  })
})