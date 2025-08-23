import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NewsAdapter } from '../../../supabase/functions/_shared/platform-adapters/news-adapter'
import { BingNewsAdapter } from '../../../supabase/functions/_shared/platform-adapters/bing-news-adapter'
import { RSSAdapter } from '../../../supabase/functions/_shared/platform-adapters/rss-adapter'
import { ReviewAdapter } from '../../../supabase/functions/_shared/platform-adapters/review-adapter'
import { GoogleAlertsAdapter } from '../../../supabase/functions/_shared/platform-adapters/google-alerts-adapter'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock Deno environment
global.Deno = {
  env: {
    get: vi.fn((key: string) => {
      const envVars: Record<string, string> = {
        'NEWS_API_KEY': 'test-news-api-key',
        'BING_NEWS_API_KEY': 'test-bing-api-key'
      }
      return envVars[key]
    })
  }
} as any

describe('Platform Adapters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('NewsAdapter', () => {
    let newsAdapter: NewsAdapter

    beforeEach(() => {
      newsAdapter = new NewsAdapter()
    })

    it('should search for news articles', async () => {
      const mockResponse = {
        articles: [
          {
            title: 'Test Article',
            description: 'Test description',
            author: 'Test Author',
            url: 'https://example.com/article',
            publishedAt: '2024-01-01T00:00:00Z',
            source: { name: 'Test Source' }
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const results = await newsAdapter.search('test keyword')
      
      expect(results).toHaveLength(1)
      expect(results[0].content).toContain('Test Article')
      expect(results[0].author).toBe('Test Author')
      expect(results[0].url).toBe('https://example.com/article')
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      })

      await expect(newsAdapter.search('test')).rejects.toThrow('Rate limit exceeded')
    })

    it('should validate configuration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ articles: [] })
      })

      const isValid = await newsAdapter.validateConfiguration()
      expect(isValid).toBe(true)
    })
  })

  describe('BingNewsAdapter', () => {
    let bingAdapter: BingNewsAdapter

    beforeEach(() => {
      bingAdapter = new BingNewsAdapter()
    })

    it('should search Bing News API', async () => {
      const mockResponse = {
        value: [
          {
            name: 'Bing Test Article',
            description: 'Bing test description',
            url: 'https://example.com/bing-article',
            datePublished: '2024-01-01T00:00:00Z',
            provider: [{ name: 'Bing Source' }]
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const results = await bingAdapter.search('test keyword')
      
      expect(results).toHaveLength(1)
      expect(results[0].content).toContain('Bing Test Article')
      expect(results[0].author).toBe('Bing Source')
    })

    it('should get trending topics', async () => {
      const mockResponse = {
        value: [
          {
            name: 'Trending Topic',
            webSearchUrl: 'https://bing.com/search?q=trending',
            query: { text: 'trending topic' }
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const results = await bingAdapter.getTrendingTopics()
      
      expect(results).toHaveLength(1)
      expect(results[0].content).toBe('Trending Topic')
      expect(results[0].metadata.is_trending).toBe(true)
    })
  })

  describe('RSSAdapter', () => {
    let rssAdapter: RSSAdapter

    beforeEach(() => {
      rssAdapter = new RSSAdapter()
    })

    it('should parse RSS feed and search for keywords', async () => {
      const mockRSSXML = `
        <?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Test Feed</title>
            <item>
              <title>Test Article with keyword</title>
              <description>This article contains the test keyword</description>
              <link>https://example.com/rss-article</link>
              <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
              <author>RSS Author</author>
            </item>
          </channel>
        </rss>
      `

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockRSSXML)
      })

      const results = await rssAdapter.search('keyword')
      
      expect(results.length).toBeGreaterThan(0)
      const result = results.find(r => r.content.includes('keyword'))
      expect(result).toBeDefined()
      expect(result?.author).toContain('RSS')
    })

    it('should discover RSS feeds from website', async () => {
      const mockHTML = `
        <html>
          <head>
            <link rel="alternate" type="application/rss+xml" href="/feed.xml" title="RSS Feed">
            <link rel="alternate" type="application/atom+xml" href="/atom.xml" title="Atom Feed">
          </head>
        </html>
      `

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHTML)
      })

      const feeds = await rssAdapter.discoverRSSFeeds('https://example.com')
      
      expect(feeds).toContain('https://example.com/feed.xml')
      expect(feeds).toContain('https://example.com/atom.xml')
    })
  })

  describe('ReviewAdapter', () => {
    let reviewAdapter: ReviewAdapter

    beforeEach(() => {
      reviewAdapter = new ReviewAdapter()
    })

    it('should scrape review platforms', async () => {
      const mockHTML = `
        <div class="review-card">
          <div class="review-content__title">Great Product</div>
          <div class="consumer-information__name">John Doe</div>
          <div class="review-content__date">2024-01-01</div>
          <div class="review-content__text">This product is amazing!</div>
          <div class="star-rating">5</div>
        </div>
      `

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHTML)
      })

      // Mock the web scraper
      const mockWebScraper = {
        scrapeUrl: vi.fn().mockResolvedValue(mockHTML)
      }
      
      // Replace the web scraper instance
      ;(reviewAdapter as any).webScraper = mockWebScraper

      const results = await reviewAdapter.search('test product')
      
      expect(mockWebScraper.scrapeUrl).toHaveBeenCalled()
      // Note: The actual parsing would depend on the HTML structure
      // This test verifies the scraping mechanism is called
    })

    it('should get available platforms', () => {
      const platforms = reviewAdapter.getAvailablePlatforms()
      
      expect(platforms).toContain('trustpilot')
      expect(platforms).toContain('g2')
      expect(platforms).toContain('capterra')
    })
  })

  describe('GoogleAlertsAdapter', () => {
    let googleAdapter: GoogleAlertsAdapter

    beforeEach(() => {
      googleAdapter = new GoogleAlertsAdapter()
    })

    it('should simulate Google Alerts functionality', async () => {
      const mockHTML = `
        <div class="g">
          <h3>Test Search Result</h3>
          <a href="https://example.com/result">Link</a>
          <span>This is a test search result snippet</span>
        </div>
      `

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHTML)
      })

      // Mock the web scraper
      const mockWebScraper = {
        scrapeUrl: vi.fn().mockResolvedValue(mockHTML)
      }
      
      ;(googleAdapter as any).webScraper = mockWebScraper

      const results = await googleAdapter.search('test keyword')
      
      expect(mockWebScraper.scrapeUrl).toHaveBeenCalled()
    })

    it('should generate RSS feed URLs', () => {
      const feeds = googleAdapter.getGoogleRSSFeeds('test keyword')
      
      expect(feeds).toHaveLength(2)
      expect(feeds[0]).toContain('news.google.com/rss')
      expect(feeds[0]).toContain('test%20keyword')
    })

    it('should simulate creating alerts', async () => {
      const alertId = await googleAdapter.simulateCreateAlert({
        query: 'test query',
        frequency: 'daily'
      })
      
      expect(alertId).toMatch(/^alert_\d+_[a-z0-9]+$/)
    })
  })

  describe('Error Handling', () => {
    it('should handle network timeouts', async () => {
      const adapter = new NewsAdapter()
      
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'))

      await expect(adapter.search('test')).rejects.toThrow()
    })

    it('should handle invalid JSON responses', async () => {
      const adapter = new NewsAdapter()
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      })

      await expect(adapter.search('test')).rejects.toThrow()
    })

    it('should handle rate limiting', async () => {
      const adapter = new BingNewsAdapter()
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      })

      await expect(adapter.search('test')).rejects.toThrow('Rate limit exceeded')
    })
  })
})