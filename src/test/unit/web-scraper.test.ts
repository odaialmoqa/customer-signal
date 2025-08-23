import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebScraper } from '../../../supabase/functions/_shared/web-scraper'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('WebScraper', () => {
  let webScraper: WebScraper

  beforeEach(() => {
    webScraper = new WebScraper()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('scrapeUrl', () => {
    it('should successfully scrape a URL', async () => {
      const mockHtml = '<html><body><h1>Test Content</h1></body></html>'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      })

      const result = await webScraper.scrapeUrl('https://example.com')
      
      expect(result).toBe(mockHtml)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'CustomerSignal-Bot/1.0 (+https://customersignal.com/bot)'
          })
        })
      )
    })

    it('should respect robots.txt when enabled', async () => {
      // Mock robots.txt response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('User-agent: *\nDisallow: /private\nAllow: /public')
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<html><body>Content</body></html>')
        })

      const result = await webScraper.scrapeUrl('https://example.com/public/page', {
        respectRobotsTxt: true
      })
      
      expect(result).toBe('<html><body>Content</body></html>')
      expect(mockFetch).toHaveBeenCalledTimes(2) // robots.txt + actual page
    })

    it('should throw error when robots.txt disallows scraping', async () => {
      // Mock robots.txt response that disallows the path
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('User-agent: *\nDisallow: /private')
      })

      await expect(
        webScraper.scrapeUrl('https://example.com/private/page', {
          respectRobotsTxt: true
        })
      ).rejects.toThrow('Scraping not allowed by robots.txt')
    })

    it('should retry on failure', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<html><body>Success</body></html>')
        })

      const result = await webScraper.scrapeUrl('https://example.com', {
        maxRetries: 2,
        delay: 0 // No delay for testing
      })
      
      expect(result).toBe('<html><body>Success</body></html>')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should throw error after max retries', async () => {
      mockFetch.mockRejectedValue(new Error('Persistent error'))

      await expect(
        webScraper.scrapeUrl('https://example.com', {
          maxRetries: 2,
          delay: 0
        })
      ).rejects.toThrow('Persistent error')
      
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('scrapeMultipleUrls', () => {
    it('should scrape multiple URLs successfully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<html>Content 1</html>')
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<html>Content 2</html>')
        })

      const urls = ['https://example1.com', 'https://example2.com']
      const results = await webScraper.scrapeMultipleUrls(urls, { delay: 0 })
      
      expect(results.size).toBe(2)
      expect(results.get('https://example1.com')).toBe('<html>Content 1</html>')
      expect(results.get('https://example2.com')).toBe('<html>Content 2</html>')
    })

    it('should handle failures gracefully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<html>Success</html>')
        })
        .mockRejectedValueOnce(new Error('Failed'))

      const urls = ['https://success.com', 'https://fail.com']
      const results = await webScraper.scrapeMultipleUrls(urls, { delay: 0 })
      
      expect(results.size).toBe(2)
      expect(results.get('https://success.com')).toBe('<html>Success</html>')
      expect(results.get('https://fail.com')).toBe('')
    })
  })

  describe('extractTextContent', () => {
    it('should extract text from HTML', () => {
      const html = `
        <html>
          <head><title>Test</title></head>
          <body>
            <script>console.log('remove me')</script>
            <style>body { color: red; }</style>
            <h1>Main Title</h1>
            <p>This is a paragraph with <strong>bold</strong> text.</p>
          </body>
        </html>
      `
      
      const result = webScraper.extractTextContent(html)
      
      expect(result).toBe('Main Title This is a paragraph with bold text.')
      expect(result).not.toContain('console.log')
      expect(result).not.toContain('color: red')
    })
  })

  describe('extractLinks', () => {
    it('should extract links from HTML', () => {
      const html = `
        <html>
          <body>
            <a href="https://example.com">External Link</a>
            <a href="/relative">Relative Link</a>
            <a href="mailto:test@example.com">Email Link</a>
          </body>
        </html>
      `
      
      const links = webScraper.extractLinks(html, 'https://base.com')
      
      expect(links).toContain('https://example.com')
      expect(links).toContain('https://base.com/relative')
      expect(links).toContain('mailto:test@example.com')
    })

    it('should remove duplicate links', () => {
      const html = `
        <a href="https://example.com">Link 1</a>
        <a href="https://example.com">Link 2</a>
      `
      
      const links = webScraper.extractLinks(html, 'https://base.com')
      
      expect(links).toHaveLength(1)
      expect(links[0]).toBe('https://example.com')
    })
  })

  describe('extractMetadata', () => {
    it('should extract title and meta tags', () => {
      const html = `
        <html>
          <head>
            <title>Page Title</title>
            <meta name="description" content="Page description">
            <meta property="og:title" content="Social Title">
            <meta name="keywords" content="test, scraping">
          </head>
        </html>
      `
      
      const metadata = webScraper.extractMetadata(html)
      
      expect(metadata.title).toBe('Page Title')
      expect(metadata.description).toBe('Page description')
      expect(metadata['og:title']).toBe('Social Title')
      expect(metadata.keywords).toBe('test, scraping')
    })
  })

  describe('robots.txt parsing', () => {
    it('should parse robots.txt correctly', async () => {
      const robotsTxt = `
        User-agent: *
        Disallow: /private
        Allow: /public
        Crawl-delay: 2
        Sitemap: https://example.com/sitemap.xml
      `
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(robotsTxt)
      })

      // Test allowed path
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<html>Public content</html>')
      })

      const result = await webScraper.scrapeUrl('https://example.com/public/page', {
        respectRobotsTxt: true,
        delay: 0 // Override crawl delay for testing
      })
      
      expect(result).toBe('<html>Public content</html>')
    })
  })
})