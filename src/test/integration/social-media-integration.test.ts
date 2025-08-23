import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { MonitoringService } from '../../../supabase/functions/_shared/monitoring-service'

// Test configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'test-key'

// Mock environment variables for testing
vi.mock('process', () => ({
  env: {
    LINKEDIN_ACCESS_TOKEN: 'test-linkedin-token',
    YOUTUBE_API_KEY: 'test-youtube-key',
    INSTAGRAM_ACCESS_TOKEN: 'test-instagram-token',
    TIKTOK_ACCESS_TOKEN: 'test-tiktok-token',
    TIKTOK_CLIENT_KEY: 'test-tiktok-client-key'
  }
}))

describe('Social Media Integration Tests', () => {
  let supabase: any
  let monitoringService: MonitoringService
  let testTenantId: string
  let testKeywordId: string

  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(supabaseUrl, supabaseKey)
    monitoringService = new MonitoringService(supabase)

    // Create test tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: 'Social Media Test Tenant',
        subscription: 'premium'
      })
      .select()
      .single()

    if (tenantError) throw tenantError
    testTenantId = tenant.id

    // Create test keyword
    const { data: keyword, error: keywordError } = await supabase
      .from('keywords')
      .insert({
        tenant_id: testTenantId,
        term: 'social media test',
        platforms: ['linkedin', 'youtube', 'instagram', 'tiktok'],
        is_active: true,
        monitoring_frequency: 'hourly'
      })
      .select()
      .single()

    if (keywordError) throw keywordError
    testKeywordId = keyword.id
  })

  afterAll(async () => {
    // Clean up test data
    if (testKeywordId) {
      await supabase
        .from('conversations')
        .delete()
        .eq('keyword_id', testKeywordId)

      await supabase
        .from('keywords')
        .delete()
        .eq('id', testKeywordId)
    }

    if (testTenantId) {
      await supabase
        .from('tenants')
        .delete()
        .eq('id', testTenantId)
    }
  })

  describe('LinkedIn Integration', () => {
    it('should integrate LinkedIn adapter with monitoring service', async () => {
      // Mock LinkedIn API response
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          elements: [
            {
              id: 'linkedin_test_123',
              text: { text: 'Professional discussion about social media test' },
              author: 'LinkedIn Professional',
              created: { time: Date.now() }
            }
          ]
        })
      })
      global.fetch = mockFetch

      const results = await monitoringService.scanKeyword(
        testKeywordId,
        testTenantId,
        ['linkedin']
      )

      expect(results).toHaveLength(1)
      expect(results[0].platform).toBe('linkedin')
      expect(results[0].errors).toHaveLength(0)
    })
  })

  describe('YouTube Integration', () => {
    it('should integrate YouTube adapter with monitoring service', async () => {
      // Mock YouTube API responses
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            items: [
              {
                id: { videoId: 'youtube_test_123' },
                snippet: {
                  title: 'Social Media Test Video',
                  description: 'Testing social media monitoring',
                  channelTitle: 'Test Channel',
                  publishedAt: new Date().toISOString()
                }
              }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            items: [
              {
                id: 'youtube_test_123',
                snippet: {
                  title: 'Social Media Test Video',
                  description: 'Testing social media monitoring',
                  channelTitle: 'Test Channel',
                  publishedAt: new Date().toISOString()
                },
                statistics: {
                  viewCount: '1000',
                  likeCount: '50'
                }
              }
            ]
          })
        })
      global.fetch = mockFetch

      const results = await monitoringService.scanKeyword(
        testKeywordId,
        testTenantId,
        ['youtube']
      )

      expect(results).toHaveLength(1)
      expect(results[0].platform).toBe('youtube')
      expect(results[0].mentions.length).toBeGreaterThan(0)
    })
  })

  describe('Instagram Integration', () => {
    it('should integrate Instagram adapter with monitoring service', async () => {
      // Mock Instagram API responses
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'test_user_123' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            data: [
              {
                id: 'instagram_test_123',
                caption: 'Instagram post about social media test',
                username: 'test_user',
                timestamp: new Date().toISOString(),
                media_type: 'IMAGE'
              }
            ]
          })
        })
      global.fetch = mockFetch

      const results = await monitoringService.scanKeyword(
        testKeywordId,
        testTenantId,
        ['instagram']
      )

      expect(results).toHaveLength(1)
      expect(results[0].platform).toBe('instagram')
    })
  })

  describe('TikTok Integration', () => {
    it('should integrate TikTok adapter with monitoring service', async () => {
      // Mock TikTok API response
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            videos: [
              {
                id: 'tiktok_test_123',
                video_description: 'TikTok video about social media test',
                username: 'tiktok_user',
                create_time: Math.floor(Date.now() / 1000),
                like_count: 100,
                view_count: 5000
              }
            ]
          }
        })
      })
      global.fetch = mockFetch

      const results = await monitoringService.scanKeyword(
        testKeywordId,
        testTenantId,
        ['tiktok']
      )

      expect(results).toHaveLength(1)
      expect(results[0].platform).toBe('tiktok')
    })
  })

  describe('Multi-Platform Monitoring', () => {
    it('should monitor all social media platforms simultaneously', async () => {
      // Mock responses for all platforms
      const mockFetch = vi.fn()
        // LinkedIn response
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            elements: [
              {
                id: 'linkedin_multi_123',
                text: { text: 'LinkedIn multi-platform test' },
                author: 'LinkedIn User'
              }
            ]
          })
        })
        // YouTube search response
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            items: [
              {
                id: { videoId: 'youtube_multi_123' },
                snippet: {
                  title: 'YouTube multi-platform test',
                  channelTitle: 'YouTube Channel'
                }
              }
            ]
          })
        })
        // YouTube details response
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            items: [
              {
                id: 'youtube_multi_123',
                snippet: { title: 'YouTube multi-platform test' },
                statistics: { viewCount: '500' }
              }
            ]
          })
        })
        // Instagram user ID response
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'instagram_user_123' })
        })
        // Instagram media response
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            data: [
              {
                id: 'instagram_multi_123',
                caption: 'Instagram multi-platform test',
                username: 'instagram_user'
              }
            ]
          })
        })
        // TikTok response
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            data: {
              videos: [
                {
                  id: 'tiktok_multi_123',
                  video_description: 'TikTok multi-platform test',
                  username: 'tiktok_user'
                }
              ]
            }
          })
        })

      global.fetch = mockFetch

      const results = await monitoringService.scanKeyword(
        testKeywordId,
        testTenantId,
        ['linkedin', 'youtube', 'instagram', 'tiktok']
      )

      expect(results).toHaveLength(4)
      expect(results.map(r => r.platform)).toEqual(
        expect.arrayContaining(['linkedin', 'youtube', 'instagram', 'tiktok'])
      )

      // Verify each platform returned results
      results.forEach(result => {
        expect(result.errors).toHaveLength(0)
      })
    })

    it('should handle mixed success and failure scenarios', async () => {
      // Mock mixed responses - some succeed, some fail
      const mockFetch = vi.fn()
        // LinkedIn success
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ elements: [] })
        })
        // YouTube failure
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: 'Quota Exceeded'
        })
        // Instagram success
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'user123' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [] })
        })
        // TikTok failure
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Rate Limited'
        })

      global.fetch = mockFetch

      const results = await monitoringService.scanKeyword(
        testKeywordId,
        testTenantId,
        ['linkedin', 'youtube', 'instagram', 'tiktok']
      )

      expect(results).toHaveLength(4)

      // Check that some succeeded and some failed
      const successfulResults = results.filter(r => r.errors.length === 0)
      const failedResults = results.filter(r => r.errors.length > 0)

      expect(successfulResults.length).toBeGreaterThan(0)
      expect(failedResults.length).toBeGreaterThan(0)
    })
  })

  describe('Data Storage Integration', () => {
    it('should store social media conversations in database', async () => {
      // Mock successful API responses
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          elements: [
            {
              id: 'storage_test_123',
              text: { text: 'Test conversation for storage' },
              author: 'Test Author',
              created: { time: Date.now() }
            }
          ]
        })
      })
      global.fetch = mockFetch

      await monitoringService.scanKeyword(
        testKeywordId,
        testTenantId,
        ['linkedin']
      )

      // Verify data was stored
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('keyword_id', testKeywordId)
        .eq('platform', 'linkedin')

      expect(error).toBeNull()
      expect(conversations).toBeDefined()
      expect(conversations.length).toBeGreaterThan(0)

      const conversation = conversations[0]
      expect(conversation.content).toContain('Test conversation')
      expect(conversation.author).toBe('Test Author')
      expect(conversation.platform).toBe('linkedin')
    })
  })

  describe('Rate Limiting Integration', () => {
    it('should respect rate limits across social media platforms', async () => {
      // This test would verify that the rate limiter is working
      // In a real scenario, this would test actual rate limiting behavior
      const startTime = Date.now()

      // Mock rate limited response
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Rate Limited'
      })
      global.fetch = mockFetch

      const results = await monitoringService.scanKeyword(
        testKeywordId,
        testTenantId,
        ['linkedin', 'youtube', 'instagram', 'tiktok']
      )

      const endTime = Date.now()
      const duration = endTime - startTime

      // Verify all platforms returned rate limit errors
      results.forEach(result => {
        expect(result.errors.length).toBeGreaterThan(0)
        expect(result.errors[0]).toContain('Rate limit exceeded')
      })

      // Verify the operation completed quickly (no unnecessary delays)
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })
  })
})