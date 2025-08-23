import { PlatformAdapter, SearchOptions, RawContent } from './base-adapter.ts'

export interface RSSFeed {
  url: string
  title?: string
  description?: string
  lastUpdated?: string
}

export interface RSSItem {
  title: string
  description?: string
  link: string
  pubDate?: string
  author?: string
  guid?: string
  categories?: string[]
}

export class RSSAdapter extends PlatformAdapter {
  readonly platformName = 'rss'
  readonly rateLimitPerHour = 500 // Conservative limit for RSS feeds
  readonly requiresAuth = false

  private readonly commonRSSFeeds: RSSFeed[] = [
    { url: 'https://feeds.feedburner.com/TechCrunch', title: 'TechCrunch' },
    { url: 'https://rss.cnn.com/rss/edition.rss', title: 'CNN' },
    { url: 'https://feeds.bbci.co.uk/news/rss.xml', title: 'BBC News' },
    { url: 'https://www.reddit.com/.rss', title: 'Reddit Front Page' },
    { url: 'https://hnrss.org/frontpage', title: 'Hacker News' },
  ]

  async search(keyword: string, options: SearchOptions = {}): Promise<RawContent[]> {
    const sanitizedKeyword = this.sanitizeKeyword(keyword)
    const allContent: RawContent[] = []

    // Search through common RSS feeds
    for (const feed of this.commonRSSFeeds) {
      try {
        const feedContent = await this.searchRSSFeed(feed, sanitizedKeyword, options)
        allContent.push(...feedContent)
      } catch (error) {
        console.error(`Error searching RSS feed ${feed.url}:`, error)
      }
    }

    // Sort by date and apply limit
    const sortedContent = allContent.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    return sortedContent.slice(0, options.limit || 20)
  }

  async searchRSSFeed(feed: RSSFeed, keyword: string, options: SearchOptions = {}): Promise<RawContent[]> {
    try {
      const response = await fetch(feed.url, {
        headers: {
          'User-Agent': 'CustomerSignal RSS Reader/1.0',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
        signal: AbortSignal.timeout(10000)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const xmlText = await response.text()
      const items = this.parseRSSFeed(xmlText)
      
      // Filter items by keyword
      const matchingItems = items.filter(item => 
        this.itemMatchesKeyword(item, keyword)
      )

      // Apply date filters
      const filteredItems = this.applyDateFilters(matchingItems, options)

      return filteredItems.map(item => this.convertRSSItemToRawContent(item, feed))
    } catch (error) {
      throw new Error(`Failed to fetch RSS feed ${feed.url}: ${error.message}`)
    }
  }

  async getContent(id: string): Promise<RawContent | null> {
    // RSS items are typically accessed by their original URL
    // This would require storing the mapping between our ID and the original URL
    return null
  }

  async validateConfiguration(): Promise<boolean> {
    // Test with a simple RSS feed
    try {
      const response = await fetch('https://hnrss.org/frontpage?count=1', {
        headers: { 'User-Agent': 'CustomerSignal RSS Reader/1.0' },
        signal: AbortSignal.timeout(5000)
      })
      return response.ok
    } catch {
      return false
    }
  }

  protected buildSearchQuery(keyword: string, options?: SearchOptions): string {
    // RSS feeds don't typically support search queries
    // The search is done client-side after fetching the feed
    return keyword
  }

  private parseRSSFeed(xmlText: string): RSSItem[] {
    const items: RSSItem[] = []
    
    try {
      // Simple XML parsing - in production, you'd want a proper XML parser
      const itemMatches = xmlText.match(/<item[^>]*>([\s\S]*?)<\/item>/gi)
      
      if (!itemMatches) return items

      for (const itemXml of itemMatches) {
        const item = this.parseRSSItem(itemXml)
        if (item) {
          items.push(item)
        }
      }
    } catch (error) {
      console.error('Error parsing RSS feed:', error)
    }

    return items
  }

  private parseRSSItem(itemXml: string): RSSItem | null {
    try {
      const item: RSSItem = {
        title: this.extractXMLValue(itemXml, 'title') || '',
        description: this.extractXMLValue(itemXml, 'description'),
        link: this.extractXMLValue(itemXml, 'link') || '',
        pubDate: this.extractXMLValue(itemXml, 'pubDate'),
        author: this.extractXMLValue(itemXml, 'author') || this.extractXMLValue(itemXml, 'dc:creator'),
        guid: this.extractXMLValue(itemXml, 'guid'),
        categories: this.extractXMLValues(itemXml, 'category')
      }

      // Validate required fields
      if (!item.title || !item.link) {
        return null
      }

      return item
    } catch (error) {
      console.error('Error parsing RSS item:', error)
      return null
    }
  }

  private extractXMLValue(xml: string, tagName: string): string | undefined {
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i')
    const match = xml.match(regex)
    return match ? this.cleanXMLContent(match[1]) : undefined
  }

  private extractXMLValues(xml: string, tagName: string): string[] {
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi')
    const matches = xml.match(regex) || []
    return matches.map(match => {
      const valueMatch = match.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'))
      return valueMatch ? this.cleanXMLContent(valueMatch[1]) : ''
    }).filter(Boolean)
  }

  private cleanXMLContent(content: string): string {
    return content
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()
  }

  private itemMatchesKeyword(item: RSSItem, keyword: string): boolean {
    const searchText = [
      item.title,
      item.description || '',
      ...(item.categories || [])
    ].join(' ').toLowerCase()

    const keywordLower = keyword.toLowerCase()
    
    // Support both exact matches and word boundaries
    return searchText.includes(keywordLower) ||
           new RegExp(`\\b${keywordLower}\\b`, 'i').test(searchText)
  }

  private applyDateFilters(items: RSSItem[], options: SearchOptions): RSSItem[] {
    if (!options.since && !options.until) {
      return items
    }

    return items.filter(item => {
      if (!item.pubDate) return true // Include items without dates

      const itemDate = new Date(item.pubDate)
      
      if (options.since && itemDate < new Date(options.since)) {
        return false
      }
      
      if (options.until && itemDate > new Date(options.until)) {
        return false
      }
      
      return true
    })
  }

  private convertRSSItemToRawContent(item: RSSItem, feed: RSSFeed): RawContent {
    const id = this.generateItemId(item.guid || item.link)
    
    return {
      id: `rss_${id}`,
      content: `${item.title}\n\n${item.description || ''}`,
      author: item.author || feed.title || 'RSS Feed',
      url: item.link,
      timestamp: item.pubDate || new Date().toISOString(),
      engagement: {
        likes: 0, // RSS feeds don't provide engagement metrics
        shares: 0,
        comments: 0,
      },
      metadata: {
        feed_url: feed.url,
        feed_title: feed.title,
        categories: item.categories,
        guid: item.guid,
      }
    }
  }

  private generateItemId(input: string): string {
    // Simple hash function to generate consistent IDs
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Add a custom RSS feed to monitor
   */
  async addCustomFeed(feedUrl: string): Promise<boolean> {
    try {
      const response = await fetch(feedUrl, {
        headers: { 'User-Agent': 'CustomerSignal RSS Reader/1.0' },
        signal: AbortSignal.timeout(5000)
      })
      
      if (!response.ok) return false
      
      const xmlText = await response.text()
      const items = this.parseRSSFeed(xmlText)
      
      if (items.length > 0) {
        this.commonRSSFeeds.push({ url: feedUrl })
        return true
      }
      
      return false
    } catch {
      return false
    }
  }

  /**
   * Discover RSS feeds from a website
   */
  async discoverRSSFeeds(websiteUrl: string): Promise<string[]> {
    try {
      const response = await fetch(websiteUrl, {
        headers: { 'User-Agent': 'CustomerSignal RSS Reader/1.0' },
        signal: AbortSignal.timeout(10000)
      })
      
      if (!response.ok) return []
      
      const html = await response.text()
      const feeds: string[] = []
      
      // Look for RSS/Atom feed links in HTML
      const linkRegex = /<link[^>]+(?:type=["']application\/(?:rss\+xml|atom\+xml)["'][^>]+href=["']([^"']+)["']|href=["']([^"']+)["'][^>]+type=["']application\/(?:rss\+xml|atom\+xml)["'])[^>]*>/gi
      let match
      
      while ((match = linkRegex.exec(html)) !== null) {
        const feedUrl = match[1] || match[2]
        if (feedUrl) {
          try {
            const absoluteUrl = new URL(feedUrl, websiteUrl).href
            feeds.push(absoluteUrl)
          } catch {
            // Invalid URL, skip
          }
        }
      }
      
      return [...new Set(feeds)] // Remove duplicates
    } catch {
      return []
    }
  }
}