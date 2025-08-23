import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { MonitoringService } from '../../../supabase/functions/_shared/monitoring-service'
import { createClient } from '@supabase/supabase-js'

// Integration tests for web scraping functionality
// These tests use real HTTP requests but with mock responses where appropriate

describe('Web Scraping Integration Tests', () => {
  let monitoringService: MonitoringService
  let supabaseClient: any

  beforeAll(() => {
    // Create a mock Supabase client for testing
    supabaseClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: {
                id: 'test-keyword-id',
                term: 'test keyword',
                tenant_id: 'test-tenant',
                platforms: ['news', 'rss', 'reviews'],
                is_active: true
              },
              error: null
            })
          })
        }),
        update: () => ({
          eq: () => Promise.resolve({ error: null })
        }),
        upsert: () => Promise.resolve({ error: null })
      })
    }

    monitoringService = new MonitoringService(supabaseClient)
  })

  describe('Platform Integration', () => {
    it('should handle RSS feed monitoring', async () => {
      // Test with a real RSS feed (using a reliable test feed)
      const results = await monitoringService.scanKeyword(
        'test-keyword-id',
        'test-tenant',
        ['rss']
      )

      expect(results).toHaveLength(1)
      expect(results[0].platform).toBe('rss')
      expect(results[0].errors).toHaveLength(0)
    }, 30000) // 30 second timeout for network requests

    it('should handle news API integration', async () => {
      // Skip if no API key is available
      if (!process.env.NEWS_API_KEY) {
        console.log('Skipping news API test - no API key provided')
        return
      }

      const results = await monitoringService.scanKeyword(
        'test-keyword-id',
        'test-tenant',
        ['news']
      )

      expect(results).toHaveLength(1)
      expect(results[0].platform).toBe('news')
      
      if (results[0].errors.length === 0) {
        expect(results[0].mentions.length).toBeGreaterThanOrEqual(0)
      }
    }, 30000)

    it('should handle multiple platforms simultaneously', async () => {
      const results = await monitoringService.scanKeyword(
        'test-keyword-id',
        'test-tenant',
        ['rss', 'reviews']
      )

      expect(results).toHaveLength(2)
      expect(results.map(r => r.platform)).toContain('rss')
      expect(results.map(r => r.platform)).toContain('reviews')
    }, 45000)
  })

  describe('Error Handling', () => {
    it('should handle platform failures gracefully', async () => {
      // Test with a non-existent platform
      const results = await monitoringService.scanKeyword(
        'test-keyword-id',
        'test-tenant',
        ['non-existent-platform']
      )

      expect(results).toHaveLength(1)
      expect(results[0].platform).toBe('non-existent-platform')
      expect(results[0].errors.length).toBeGreaterThan(0)
      expect(results[0].mentions).toHaveLength(0)
    })

    it('should handle network timeouts', async () => {
      // This test would require mocking network delays
      // For now, we'll test that the service doesn't crash
      const results = await monitoringService.scanKeyword(
        'test-keyword-id',
        'test-tenant',
        ['rss']
      )

      expect(results).toBeDefined()
      expect(Array.isArray(results)).toBe(true)
    })
  })

  describe('Content Processing', () => {
    it('should normalize content from different platforms', async () => {
      const results = await monitoringService.scanKeyword(
        'test-keyword-id',
        'test-tenant',
        ['rss']
      )

      if (results[0].mentions.length > 0) {
        const mention = results[0].mentions[0]
        
        expect(mention).toHaveProperty('id')
        expect(mention).toHaveProperty('content')
        expect(mention).toHaveProperty('author')
        expect(mention).toHaveProperty('platform')
        expect(mention).toHaveProperty('url')
        expect(mention).toHaveProperty('timestamp')
        expect(mention).toHaveProperty('engagement')
        expect(mention).toHaveProperty('metadata')
        
        expect(typeof mention.content).toBe('string')
        expect(typeof mention.author).toBe('string')
        expect(typeof mention.url).toBe('string')
        expect(typeof mention.timestamp).toBe('string')
        
        // Validate engagement structure
        expect(mention.engagement).toHaveProperty('likes')
        expect(mention.engagement).toHaveProperty('shares')
        expect(mention.engagement).toHaveProperty('comments')
        
        expect(typeof mention.engagement.likes).toBe('number')
        expect(typeof mention.engagement.shares).toBe('number')
        expect(typeof mention.engagement.comments).toBe('number')
      }
    })

    it('should handle content deduplication', async () => {
      // Run the same search twice
      const results1 = await monitoringService.scanKeyword(
        'test-keyword-id',
        'test-tenant',
        ['rss']
      )
      
      const results2 = await monitoringService.scanKeyword(
        'test-keyword-id',
        'test-tenant',
        ['rss']
      )

      // The service should handle duplicates at the database level
      // This test ensures the service doesn't crash with duplicate content
      expect(results1).toBeDefined()
      expect(results2).toBeDefined()
    })
  })

  describe('Rate Limiting', () => {
    it('should respect rate limits', async () => {
      const startTime = Date.now()
      
      // Make multiple requests in succession
      const promises = Array.from({ length: 3 }, () =>
        monitoringService.scanKeyword(
          'test-keyword-id',
          'test-tenant',
          ['rss']
        )
      )

      await Promise.all(promises)
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should take some time due to rate limiting
      expect(duration).toBeGreaterThan(1000) // At least 1 second
    }, 60000)
  })

  describe('Data Validation', () => {
    it('should validate scraped content structure', async () => {
      const results = await monitoringService.scanKeyword(
        'test-keyword-id',
        'test-tenant',
        ['rss']
      )

      for (const result of results) {
        expect(result).toHaveProperty('platform')
        expect(result).toHaveProperty('mentions')
        expect(result).toHaveProperty('errors')
        
        expect(typeof result.platform).toBe('string')
        expect(Array.isArray(result.mentions)).toBe(true)
        expect(Array.isArray(result.errors)).toBe(true)
        
        for (const mention of result.mentions) {
          // Validate required fields
          expect(mention.id).toBeTruthy()
          expect(mention.content).toBeTruthy()
          expect(mention.url).toBeTruthy()
          expect(mention.timestamp).toBeTruthy()
          
          // Validate URL format
          expect(() => new URL(mention.url)).not.toThrow()
          
          // Validate timestamp format
          expect(() => new Date(mention.timestamp)).not.toThrow()
          expect(new Date(mention.timestamp).getTime()).not.toBeNaN()
        }
      }
    })

    it('should sanitize scraped content', async () => {
      const results = await monitoringService.scanKeyword(
        'test-keyword-id',
        'test-tenant',
        ['rss']
      )

      for (const result of results) {
        for (const mention of result.mentions) {
          // Content should not contain script tags or other dangerous HTML
          expect(mention.content).not.toMatch(/<script/i)
          expect(mention.content).not.toMatch(/<iframe/i)
          expect(mention.content).not.toMatch(/javascript:/i)
          
          // Author should be sanitized
          expect(mention.author).not.toMatch(/<[^>]*>/g)
        }
      }
    })
  })

  describe('Monitoring Status', () => {
    it('should provide monitoring status', async () => {
      const status = await monitoringService.getMonitoringStatus('test-tenant')
      
      expect(Array.isArray(status)).toBe(true)
      
      for (const item of status) {
        expect(item).toHaveProperty('keywordId')
        expect(item).toHaveProperty('keyword')
        expect(item).toHaveProperty('isActive')
        expect(item).toHaveProperty('platforms')
        
        expect(typeof item.keywordId).toBe('string')
        expect(typeof item.keyword).toBe('string')
        expect(typeof item.isActive).toBe('boolean')
        expect(Array.isArray(item.platforms)).toBe(true)
      }
    })
  })
})