import { PlatformAdapter, SearchOptions, RawContent } from './base-adapter.ts'
import { WebScraper } from '../web-scraper.ts'

export interface ReviewPlatform {
  name: string
  baseUrl: string
  searchPath: string
  reviewSelector: string
  titleSelector?: string
  authorSelector?: string
  dateSelector?: string
  ratingSelector?: string
  contentSelector?: string
}

export class ReviewAdapter extends PlatformAdapter {
  readonly platformName = 'reviews'
  readonly rateLimitPerHour = 200 // Conservative limit for web scraping
  readonly requiresAuth = false

  private webScraper: WebScraper
  private readonly platforms: ReviewPlatform[] = [
    {
      name: 'trustpilot',
      baseUrl: 'https://www.trustpilot.com',
      searchPath: '/search?query=',
      reviewSelector: '.review-card',
      titleSelector: '.review-content__title',
      authorSelector: '.consumer-information__name',
      dateSelector: '.review-content__date',
      ratingSelector: '.star-rating',
      contentSelector: '.review-content__text'
    },
    {
      name: 'g2',
      baseUrl: 'https://www.g2.com',
      searchPath: '/search?query=',
      reviewSelector: '.review-item',
      titleSelector: '.review-title',
      authorSelector: '.reviewer-name',
      dateSelector: '.review-date',
      ratingSelector: '.rating-stars',
      contentSelector: '.review-text'
    },
    {
      name: 'capterra',
      baseUrl: 'https://www.capterra.com',
      searchPath: '/search?query=',
      reviewSelector: '.review-card',
      titleSelector: '.review-title',
      authorSelector: '.reviewer-info',
      dateSelector: '.review-date',
      ratingSelector: '.rating',
      contentSelector: '.review-content'
    }
  ]

  constructor() {
    super()
    this.webScraper = new WebScraper()
  }

  async search(keyword: string, options: SearchOptions = {}): Promise<RawContent[]> {
    const sanitizedKeyword = this.sanitizeKeyword(keyword)
    const allContent: RawContent[] = []

    for (const platform of this.platforms) {
      try {
        const platformContent = await this.searchPlatform(platform, sanitizedKeyword, options)
        allContent.push(...platformContent)
      } catch (error) {
        console.error(`Error searching ${platform.name}:`, error)
      }
    }

    // Sort by date and apply limit
    const sortedContent = allContent.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    return sortedContent.slice(0, options.limit || 20)
  }

  async searchPlatform(platform: ReviewPlatform, keyword: string, options: SearchOptions = {}): Promise<RawContent[]> {
    const searchUrl = `${platform.baseUrl}${platform.searchPath}${encodeURIComponent(keyword)}`
    
    try {
      const html = await this.webScraper.scrapeUrl(searchUrl, {
        respectRobotsTxt: true,
        delay: 2000, // Be respectful with review sites
        maxRetries: 2
      })

      return this.parseReviewsFromHTML(html, platform, searchUrl)
    } catch (error) {
      throw new Error(`Failed to scrape ${platform.name}: ${error.message}`)
    }
  }

  async getContent(id: string): Promise<RawContent | null> {
    // Extract platform and original ID from our composite ID
    const [platformPrefix, originalId] = id.split('_', 2)
    if (platformPrefix !== 'review') return null

    // This would require storing the original URL mapping
    // For now, return null
    return null
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      // Test with a simple request to one of the platforms
      const testUrl = 'https://www.trustpilot.com'
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
    return encodeURIComponent(keyword)
  }

  private parseReviewsFromHTML(html: string, platform: ReviewPlatform, sourceUrl: string): RawContent[] {
    const reviews: RawContent[] = []
    
    try {
      // This is a simplified HTML parsing approach
      // In production, you'd want to use a proper HTML parser like jsdom or cheerio
      const reviewBlocks = this.extractElementsBySelector(html, platform.reviewSelector)
      
      for (let i = 0; i < reviewBlocks.length; i++) {
        const reviewHtml = reviewBlocks[i]
        const review = this.parseReviewBlock(reviewHtml, platform, sourceUrl, i)
        if (review) {
          reviews.push(review)
        }
      }
    } catch (error) {
      console.error(`Error parsing reviews from ${platform.name}:`, error)
    }

    return reviews
  }

  private parseReviewBlock(reviewHtml: string, platform: ReviewPlatform, sourceUrl: string, index: number): RawContent | null {
    try {
      const title = platform.titleSelector ? 
        this.extractTextBySelector(reviewHtml, platform.titleSelector) : ''
      
      const author = platform.authorSelector ? 
        this.extractTextBySelector(reviewHtml, platform.authorSelector) : 'Anonymous'
      
      const content = platform.contentSelector ? 
        this.extractTextBySelector(reviewHtml, platform.contentSelector) : reviewHtml
      
      const dateStr = platform.dateSelector ? 
        this.extractTextBySelector(reviewHtml, platform.dateSelector) : ''
      
      const rating = platform.ratingSelector ? 
        this.extractRating(reviewHtml, platform.ratingSelector) : 0

      // Generate a unique ID
      const id = this.generateReviewId(platform.name, sourceUrl, index)

      // Parse date
      const timestamp = this.parseDate(dateStr) || new Date().toISOString()

      // Combine title and content
      const fullContent = title ? `${title}\n\n${content}` : content

      return {
        id: `review_${id}`,
        content: this.cleanText(fullContent),
        author: this.cleanText(author),
        url: sourceUrl,
        timestamp,
        engagement: {
          likes: rating, // Use rating as a proxy for engagement
          shares: 0,
          comments: 0,
        },
        metadata: {
          platform: platform.name,
          rating,
          review_title: title,
          original_date: dateStr,
        }
      }
    } catch (error) {
      console.error('Error parsing review block:', error)
      return null
    }
  }

  private extractElementsBySelector(html: string, selector: string): string[] {
    // Simplified selector parsing - in production use a proper HTML parser
    const elements: string[] = []
    
    // Convert CSS selector to a simple regex pattern
    const className = selector.replace('.', '').replace('#', '')
    const regex = new RegExp(`<[^>]*class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)<\/[^>]+>`, 'gi')
    
    let match
    while ((match = regex.exec(html)) !== null) {
      elements.push(match[0])
    }
    
    return elements
  }

  private extractTextBySelector(html: string, selector: string): string {
    const className = selector.replace('.', '').replace('#', '')
    const regex = new RegExp(`<[^>]*class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)<\/[^>]+>`, 'i')
    const match = html.match(regex)
    
    if (match) {
      return this.cleanText(match[1])
    }
    
    return ''
  }

  private extractRating(html: string, selector: string): number {
    const ratingText = this.extractTextBySelector(html, selector)
    
    // Try to extract numeric rating
    const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/)
    if (ratingMatch) {
      return parseFloat(ratingMatch[1])
    }
    
    // Count stars or other rating indicators
    const starCount = (ratingText.match(/★|⭐/g) || []).length
    if (starCount > 0) {
      return starCount
    }
    
    return 0
  }

  private parseDate(dateStr: string): string | null {
    if (!dateStr) return null
    
    try {
      // Try various date formats
      const cleanDateStr = dateStr.replace(/[^\w\s\-\/:.]/g, '').trim()
      
      // Common patterns
      const patterns = [
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
        /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
        /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i, // DD Mon YYYY
      ]
      
      for (const pattern of patterns) {
        const match = cleanDateStr.match(pattern)
        if (match) {
          const date = new Date(cleanDateStr)
          if (!isNaN(date.getTime())) {
            return date.toISOString()
          }
        }
      }
      
      // Fallback: try direct parsing
      const date = new Date(cleanDateStr)
      if (!isNaN(date.getTime())) {
        return date.toISOString()
      }
    } catch {
      // Ignore parsing errors
    }
    
    return null
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

  private generateReviewId(platform: string, url: string, index: number): string {
    const input = `${platform}_${url}_${index}`
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Search specific review platform by name
   */
  async searchSpecificPlatform(platformName: string, keyword: string, options: SearchOptions = {}): Promise<RawContent[]> {
    const platform = this.platforms.find(p => p.name === platformName)
    if (!platform) {
      throw new Error(`Unknown review platform: ${platformName}`)
    }

    return this.searchPlatform(platform, keyword, options)
  }

  /**
   * Get available review platforms
   */
  getAvailablePlatforms(): string[] {
    return this.platforms.map(p => p.name)
  }

  /**
   * Add a custom review platform configuration
   */
  addCustomPlatform(platform: ReviewPlatform): void {
    this.platforms.push(platform)
  }
}