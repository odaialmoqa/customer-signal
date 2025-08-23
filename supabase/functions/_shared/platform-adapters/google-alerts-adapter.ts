import { PlatformAdapter, SearchOptions, RawContent } from './base-adapter.ts'
import { WebScraper } from '../web-scraper.ts'

export interface GoogleAlert {
  id: string
  query: string
  frequency: 'realtime' | 'daily' | 'weekly'
  sources: 'automatic' | 'news' | 'blogs' | 'web' | 'video' | 'books' | 'discussions' | 'finance'
  language: string
  region: string
}

export class GoogleAlertsAdapter extends PlatformAdapter {
  readonly platformName = 'google-alerts'
  readonly rateLimitPerHour = 100 // Very conservative for Google scraping
  readonly requiresAuth = false

  private webScraper: WebScraper

  constructor() {
    super()
    this.webScraper = new WebScraper()
  }

  async search(keyword: string, options: SearchOptions = {}): Promise<RawContent[]> {
    // Google Alerts doesn't have a public API, so we'll simulate the functionality
    // by searching Google News and other Google services
    const sanitizedKeyword = this.sanitizeKeyword(keyword)
    const allContent: RawContent[] = []

    try {
      // Search Google News
      const newsResults = await this.searchGoogleNews(sanitizedKeyword, options)
      allContent.push(...newsResults)

      // Search Google for recent results
      const webResults = await this.searchGoogleWeb(sanitizedKeyword, options)
      allContent.push(...webResults)

    } catch (error) {
      console.error('Error in Google Alerts search:', error)
    }

    // Sort by date and apply limit
    const sortedContent = allContent.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    return sortedContent.slice(0, options.limit || 20)
  }

  async getContent(id: string): Promise<RawContent | null> {
    // Google doesn't provide direct content access
    return null
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      // Test with a simple request to Google
      const testUrl = 'https://www.google.com'
      await this.webScraper.scrapeUrl(testUrl, {
        respectRobotsTxt: true,
        timeout: 5000
      })
      return true
    } catch {
      return false
    }
  }

  protected buildSearchQuery(keyword: string, options?: SearchOptions): string {
    let query = encodeURIComponent(keyword)
    
    // Add time-based filters
    if (options?.since) {
      const sinceDate = new Date(options.since)
      const now = new Date()
      const daysDiff = Math.floor((now.getTime() - sinceDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff <= 1) {
        query += '&tbs=qdr:d' // Past day
      } else if (daysDiff <= 7) {
        query += '&tbs=qdr:w' // Past week
      } else if (daysDiff <= 30) {
        query += '&tbs=qdr:m' // Past month
      } else if (daysDiff <= 365) {
        query += '&tbs=qdr:y' // Past year
      }
    }
    
    return query
  }

  private async searchGoogleNews(keyword: string, options: SearchOptions = {}): Promise<RawContent[]> {
    const query = this.buildSearchQuery(keyword, options)
    const searchUrl = `https://news.google.com/search?q=${query}&hl=en-US&gl=US&ceid=US:en`
    
    try {
      const html = await this.webScraper.scrapeUrl(searchUrl, {
        respectRobotsTxt: true,
        delay: 3000, // Be very respectful with Google
        maxRetries: 1
      })

      return this.parseGoogleNewsResults(html, keyword)
    } catch (error) {
      console.error('Error scraping Google News:', error)
      return []
    }
  }

  private async searchGoogleWeb(keyword: string, options: SearchOptions = {}): Promise<RawContent[]> {
    const query = this.buildSearchQuery(keyword, options)
    const searchUrl = `https://www.google.com/search?q=${query}&tbm=nws&num=10`
    
    try {
      const html = await this.webScraper.scrapeUrl(searchUrl, {
        respectRobotsTxt: true,
        delay: 3000, // Be very respectful with Google
        maxRetries: 1
      })

      return this.parseGoogleWebResults(html, keyword)
    } catch (error) {
      console.error('Error scraping Google Web:', error)
      return []
    }
  }

  private parseGoogleNewsResults(html: string, keyword: string): RawContent[] {
    const results: RawContent[] = []
    
    try {
      // Google News uses dynamic content, so this is a simplified approach
      // In production, you'd need a more sophisticated parser or use Google's RSS feeds
      
      // Look for article containers (this is approximate and may need adjustment)
      const articleRegex = /<article[^>]*>([\s\S]*?)<\/article>/gi
      let match
      let index = 0
      
      while ((match = articleRegex.exec(html)) !== null && index < 10) {
        const articleHtml = match[1]
        const result = this.parseGoogleNewsArticle(articleHtml, keyword, index)
        if (result) {
          results.push(result)
        }
        index++
      }
    } catch (error) {
      console.error('Error parsing Google News results:', error)
    }

    return results
  }

  private parseGoogleWebResults(html: string, keyword: string): RawContent[] {
    const results: RawContent[] = []
    
    try {
      // Look for search result containers
      const resultRegex = /<div[^>]*class="[^"]*g[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
      let match
      let index = 0
      
      while ((match = resultRegex.exec(html)) !== null && index < 10) {
        const resultHtml = match[1]
        const result = this.parseGoogleWebResult(resultHtml, keyword, index)
        if (result) {
          results.push(result)
        }
        index++
      }
    } catch (error) {
      console.error('Error parsing Google Web results:', error)
    }

    return results
  }

  private parseGoogleNewsArticle(articleHtml: string, keyword: string, index: number): RawContent | null {
    try {
      // Extract title (this is approximate)
      const titleMatch = articleHtml.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i)
      const title = titleMatch ? this.cleanText(titleMatch[1]) : ''
      
      // Extract link
      const linkMatch = articleHtml.match(/href="([^"]+)"/i)
      const url = linkMatch ? linkMatch[1] : ''
      
      // Extract source/author
      const sourceMatch = articleHtml.match(/data-source="([^"]+)"/i) || 
                         articleHtml.match(/<span[^>]*>([^<]+)<\/span>/i)
      const author = sourceMatch ? this.cleanText(sourceMatch[1]) : 'Google News'
      
      if (!title || !url) return null

      const id = this.generateResultId('news', keyword, index)

      return {
        id: `google_news_${id}`,
        content: title,
        author,
        url: this.cleanUrl(url),
        timestamp: new Date().toISOString(), // Google News doesn't always provide timestamps
        engagement: {
          likes: 0,
          shares: 0,
          comments: 0,
        },
        metadata: {
          source: 'google_news',
          search_keyword: keyword,
          result_index: index,
        }
      }
    } catch (error) {
      console.error('Error parsing Google News article:', error)
      return null
    }
  }

  private parseGoogleWebResult(resultHtml: string, keyword: string, index: number): RawContent | null {
    try {
      // Extract title
      const titleMatch = resultHtml.match(/<h3[^>]*>([^<]+)<\/h3>/i) ||
                        resultHtml.match(/<a[^>]*><h3[^>]*>([^<]+)<\/h3><\/a>/i)
      const title = titleMatch ? this.cleanText(titleMatch[1]) : ''
      
      // Extract link
      const linkMatch = resultHtml.match(/<a[^>]*href="([^"]+)"[^>]*>/i)
      const url = linkMatch ? linkMatch[1] : ''
      
      // Extract snippet
      const snippetMatch = resultHtml.match(/<span[^>]*>([^<]+)<\/span>/i)
      const snippet = snippetMatch ? this.cleanText(snippetMatch[1]) : ''
      
      if (!title || !url) return null

      const id = this.generateResultId('web', keyword, index)
      const content = snippet ? `${title}\n\n${snippet}` : title

      return {
        id: `google_web_${id}`,
        content,
        author: 'Google Search',
        url: this.cleanUrl(url),
        timestamp: new Date().toISOString(),
        engagement: {
          likes: 0,
          shares: 0,
          comments: 0,
        },
        metadata: {
          source: 'google_web',
          search_keyword: keyword,
          result_index: index,
          snippet,
        }
      }
    } catch (error) {
      console.error('Error parsing Google Web result:', error)
      return null
    }
  }

  private cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
  }

  private cleanUrl(url: string): string {
    // Google often wraps URLs in redirects
    if (url.startsWith('/url?q=')) {
      const urlMatch = url.match(/\/url\?q=([^&]+)/)
      if (urlMatch) {
        return decodeURIComponent(urlMatch[1])
      }
    }
    
    if (url.startsWith('http')) {
      return url
    }
    
    return `https://www.google.com${url}`
  }

  private generateResultId(type: string, keyword: string, index: number): string {
    const input = `${type}_${keyword}_${index}_${Date.now()}`
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Simulate creating a Google Alert (for documentation purposes)
   * Note: This doesn't actually create a Google Alert as there's no public API
   */
  async simulateCreateAlert(alert: Partial<GoogleAlert>): Promise<string> {
    // This is just for interface compatibility
    // In a real implementation, you might store these preferences
    // and use them to customize search behavior
    
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    console.log('Simulated Google Alert created:', {
      id: alertId,
      query: alert.query,
      frequency: alert.frequency || 'daily',
      sources: alert.sources || 'automatic',
    })
    
    return alertId
  }

  /**
   * Get RSS feed URLs for Google Alerts-style monitoring
   * These are publicly available RSS feeds that can be used for monitoring
   */
  getGoogleRSSFeeds(keyword: string): string[] {
    const encodedKeyword = encodeURIComponent(keyword)
    
    return [
      `https://news.google.com/rss/search?q=${encodedKeyword}&hl=en-US&gl=US&ceid=US:en`,
      `https://www.google.com/alerts/feeds/00000000000000000000/${encodedKeyword}`, // This would be a real alert feed
    ]
  }
}