import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createClient } from '../../lib/supabase/client'
import { MonitoringService } from '../../lib/services/monitoring'
import { KeywordService } from '../../lib/services/keyword'

// Integration tests for the monitoring system
// These tests require a running Supabase instance with test data

describe('Monitoring System Integration', () => {
  let supabase: ReturnType<typeof createClient>
  let monitoringService: MonitoringService
  let keywordService: KeywordService
  let testTenantId: string
  let testUserId: string
  let testKeywordId: string

  beforeEach(async () => {
    supabase = createClient()
    monitoringService = new MonitoringService()
    keywordService = new KeywordService()

    // Create test tenant and user
    testTenantId = 'test-tenant-' + Date.now()
    testUserId = 'test-user-' + Date.now()

    // Insert test tenant
    await supabase.from('tenants').insert({
      id: testTenantId,
      name: 'Test Tenant',
      subscription: 'basic'
    })

    // Insert test user-tenant relationship
    await supabase.from('user_tenants').insert({
      user_id: testUserId,
      tenant_id: testTenantId,
      role: 'admin'
    })
  })

  afterEach(async () => {
    // Clean up test data
    if (testKeywordId) {
      await supabase.from('keywords').delete().eq('id', testKeywordId)
    }
    await supabase.from('user_tenants').delete().eq('tenant_id', testTenantId)
    await supabase.from('tenants').delete().eq('id', testTenantId)
  })

  describe('Keyword Monitoring Lifecycle', () => {
    it('should create keyword and start monitoring', async () => {
      // Create a keyword
      const keyword = await keywordService.createKeyword(testTenantId, testUserId, {
        term: 'test product',
        platforms: ['reddit', 'twitter'],
        monitoring_frequency: 'hourly'
      })

      testKeywordId = keyword.id

      // Verify monitoring job was created automatically
      const { data: jobs } = await supabase
        .from('monitoring_jobs')
        .select('*')
        .eq('keyword_id', keyword.id)

      expect(jobs).toHaveLength(1)
      expect(jobs![0].is_active).toBe(true)
      expect(jobs![0].frequency).toBe('hourly')
      expect(jobs![0].platforms).toEqual(['reddit', 'twitter'])
    })

    it('should update monitoring job when keyword is updated', async () => {
      // Create a keyword
      const keyword = await keywordService.createKeyword(testTenantId, testUserId, {
        term: 'test product',
        platforms: ['reddit'],
        monitoring_frequency: 'daily'
      })

      testKeywordId = keyword.id

      // Update the keyword
      await keywordService.updateKeyword(keyword.id, testTenantId, {
        platforms: ['reddit', 'twitter', 'news'],
        monitoring_frequency: 'hourly'
      })

      // Verify monitoring job was updated
      const { data: jobs } = await supabase
        .from('monitoring_jobs')
        .select('*')
        .eq('keyword_id', keyword.id)

      expect(jobs).toHaveLength(1)
      expect(jobs![0].frequency).toBe('hourly')
      expect(jobs![0].platforms).toEqual(['reddit', 'twitter', 'news'])
    })

    it('should deactivate monitoring job when keyword is deactivated', async () => {
      // Create a keyword
      const keyword = await keywordService.createKeyword(testTenantId, testUserId, {
        term: 'test product',
        platforms: ['reddit'],
        monitoring_frequency: 'hourly'
      })

      testKeywordId = keyword.id

      // Deactivate the keyword
      await keywordService.updateKeyword(keyword.id, testTenantId, {
        is_active: false
      })

      // Verify monitoring job was deactivated
      const { data: jobs } = await supabase
        .from('monitoring_jobs')
        .select('*')
        .eq('keyword_id', keyword.id)

      expect(jobs).toHaveLength(1)
      expect(jobs![0].is_active).toBe(false)
    })
  })

  describe('Conversation Storage', () => {
    it('should store conversations with proper tenant isolation', async () => {
      // Create a keyword
      const keyword = await keywordService.createKeyword(testTenantId, testUserId, {
        term: 'test product',
        platforms: ['reddit'],
        monitoring_frequency: 'hourly'
      })

      testKeywordId = keyword.id

      // Simulate storing conversations
      const testConversations = [
        {
          id: 'reddit_test_123',
          keyword_id: keyword.id,
          tenant_id: testTenantId,
          content: 'This test product is amazing!',
          author: 'test_user_1',
          platform: 'reddit',
          url: 'https://reddit.com/r/test/123',
          timestamp: new Date().toISOString(),
          engagement_metrics: { likes: 10, shares: 2, comments: 5 },
          metadata: { subreddit: 'test' }
        },
        {
          id: 'reddit_test_456',
          keyword_id: keyword.id,
          tenant_id: testTenantId,
          content: 'Not impressed with this test product.',
          author: 'test_user_2',
          platform: 'reddit',
          url: 'https://reddit.com/r/test/456',
          timestamp: new Date().toISOString(),
          engagement_metrics: { likes: 2, shares: 0, comments: 1 },
          metadata: { subreddit: 'test' }
        }
      ]

      // Insert conversations
      const { error } = await supabase
        .from('conversations')
        .insert(testConversations)

      expect(error).toBeNull()

      // Retrieve conversations
      const result = await monitoringService.getConversations(testTenantId, {
        keywordId: keyword.id
      })

      expect(result.conversations).toHaveLength(2)
      expect(result.total).toBe(2)

      // Verify tenant isolation - try to access with different tenant
      const otherTenantResult = await monitoringService.getConversations('other-tenant')
      expect(otherTenantResult.conversations).toHaveLength(0)
    })

    it('should support full-text search on conversations', async () => {
      // Create a keyword
      const keyword = await keywordService.createKeyword(testTenantId, testUserId, {
        term: 'search test',
        platforms: ['reddit'],
        monitoring_frequency: 'hourly'
      })

      testKeywordId = keyword.id

      // Insert test conversations
      await supabase.from('conversations').insert([
        {
          id: 'search_test_1',
          keyword_id: keyword.id,
          tenant_id: testTenantId,
          content: 'This amazing product changed my life!',
          author: 'user1',
          platform: 'reddit',
          url: 'https://reddit.com/1',
          timestamp: new Date().toISOString(),
          engagement_metrics: {},
          metadata: {}
        },
        {
          id: 'search_test_2',
          keyword_id: keyword.id,
          tenant_id: testTenantId,
          content: 'Terrible experience with customer service.',
          author: 'user2',
          platform: 'reddit',
          url: 'https://reddit.com/2',
          timestamp: new Date().toISOString(),
          engagement_metrics: {},
          metadata: {}
        }
      ])

      // Search for positive content
      const positiveResults = await monitoringService.searchConversations(
        testTenantId,
        'amazing life'
      )

      expect(positiveResults).toHaveLength(1)
      expect(positiveResults[0].content).toContain('amazing product')

      // Search for negative content
      const negativeResults = await monitoringService.searchConversations(
        testTenantId,
        'terrible experience'
      )

      expect(negativeResults).toHaveLength(1)
      expect(negativeResults[0].content).toContain('Terrible experience')
    })
  })

  describe('Analytics and Reporting', () => {
    it('should generate conversation analytics', async () => {
      // Create a keyword
      const keyword = await keywordService.createKeyword(testTenantId, testUserId, {
        term: 'analytics test',
        platforms: ['reddit', 'twitter'],
        monitoring_frequency: 'hourly'
      })

      testKeywordId = keyword.id

      // Insert test conversations with different sentiments and platforms
      const testDate = new Date('2024-01-15T12:00:00Z')
      await supabase.from('conversations').insert([
        {
          id: 'analytics_1',
          keyword_id: keyword.id,
          tenant_id: testTenantId,
          content: 'Love this product!',
          author: 'user1',
          platform: 'reddit',
          url: 'https://reddit.com/1',
          timestamp: testDate.toISOString(),
          sentiment_label: 'positive',
          engagement_metrics: {},
          metadata: {}
        },
        {
          id: 'analytics_2',
          keyword_id: keyword.id,
          tenant_id: testTenantId,
          content: 'Hate this product!',
          author: 'user2',
          platform: 'twitter',
          url: 'https://twitter.com/2',
          timestamp: testDate.toISOString(),
          sentiment_label: 'negative',
          engagement_metrics: {},
          metadata: {}
        },
        {
          id: 'analytics_3',
          keyword_id: keyword.id,
          tenant_id: testTenantId,
          content: 'It is okay, nothing special.',
          author: 'user3',
          platform: 'reddit',
          url: 'https://reddit.com/3',
          timestamp: testDate.toISOString(),
          sentiment_label: 'neutral',
          engagement_metrics: {},
          metadata: {}
        }
      ])

      // Get analytics
      const analytics = await monitoringService.getConversationAnalytics(
        testTenantId,
        '2024-01-15T00:00:00Z',
        '2024-01-15T23:59:59Z'
      )

      expect(analytics.totalConversations).toBe(3)
      expect(analytics.sentimentBreakdown.positive).toBe(1)
      expect(analytics.sentimentBreakdown.negative).toBe(1)
      expect(analytics.sentimentBreakdown.neutral).toBe(1)
      expect(analytics.platformBreakdown.reddit).toBe(2)
      expect(analytics.platformBreakdown.twitter).toBe(1)
      expect(analytics.dailyVolume).toHaveLength(1)
      expect(analytics.dailyVolume[0].date).toBe('2024-01-15')
      expect(analytics.dailyVolume[0].count).toBe(3)
    })
  })

  describe('Monitoring Status', () => {
    it('should track monitoring jobs status', async () => {
      // Create multiple keywords
      const keyword1 = await keywordService.createKeyword(testTenantId, testUserId, {
        term: 'product A',
        platforms: ['reddit'],
        monitoring_frequency: 'hourly'
      })

      const keyword2 = await keywordService.createKeyword(testTenantId, testUserId, {
        term: 'product B',
        platforms: ['twitter', 'news'],
        monitoring_frequency: 'daily'
      })

      // Get monitoring jobs
      const jobs = await monitoringService.getMonitoringJobs(testTenantId)

      expect(jobs).toHaveLength(2)
      
      const job1 = jobs.find(j => j.keyword_id === keyword1.id)
      const job2 = jobs.find(j => j.keyword_id === keyword2.id)

      expect(job1).toBeDefined()
      expect(job1!.frequency).toBe('hourly')
      expect(job1!.platforms).toEqual(['reddit'])
      expect(job1!.is_active).toBe(true)

      expect(job2).toBeDefined()
      expect(job2!.frequency).toBe('daily')
      expect(job2!.platforms).toEqual(['twitter', 'news'])
      expect(job2!.is_active).toBe(true)

      // Clean up
      await supabase.from('keywords').delete().eq('id', keyword1.id)
      await supabase.from('keywords').delete().eq('id', keyword2.id)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid tenant access', async () => {
      await expect(
        monitoringService.getConversations('invalid-tenant-id')
      ).resolves.toEqual({ conversations: [], total: 0 })
    })

    it('should handle missing keyword for monitoring', async () => {
      // This would typically be handled by the Edge Function
      // For now, we test that the client service handles errors gracefully
      const jobs = await monitoringService.getMonitoringJobs('invalid-tenant')
      expect(jobs).toEqual([])
    })
  })
})