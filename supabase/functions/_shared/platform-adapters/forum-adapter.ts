import { PlatformAdapter, SearchOptions, RawContent } from './base-adapter.ts'
import { WebScraper } from '../web-scraper.ts'

export interface ForumSite {
  name: string
  baseUrl: string
  searchPath: string
  postSelector: string
  titleSelector?: string
  authorSelector?: string
  dateSelector?: string
  contentSelector?: string
  engagementSelector?: string
}

export class ForumAdapter extends PlatformAdapter {
  readonly platformName = 'forum'
  readonly rateLimitPerHour = 300 // Conservative rate limit for web scraping
  readonly requiresAuth = false

  private webScraper: WebScraper
  private readonly forumSites: ForumSite[] = [
    {
      name: 'stackoverflow',
      baseUrl: 'https://stackoverflow.com',
      searchPath: '/search?q=',
      postSelector: '.question-summary',
      titleSelector: '.question-hyperlink',
      authorSelector: '.user-details a',
      dateSelector: '.relativetime',
      contentSelector: '.excerpt',
      engagementSelector: '.vote-count-post'
    },
    {
      name: 'quora',
      baseUrl: 'https://www.quora.com',
      searchPath: '/search?q=',
      postSelector: '.question',
      titleSelector: '.question_text',
      authorSelector: '.author_name',
      dateSelector: '.datetime',
      contentSelector: '.answer_text'
    },
    {
      name: 'hackernews',
      baseUrl: 'https://hn.algolia.com/api/v1',
      searchPath: '/search?query=',
      postSelector: '.story',
      titleSelector: '.story-title',
      authorSelector: '.story-author',
      dateSelector: '.story-date',
      contentSelector: '.story-text'
    },
    {
      name: 'discourse',
      baseUrl: 'https://meta.discourse.org',
      searchPath: '/search?q=',
      postSelector: '.topic-list-item',
      titleSelector: '.topic-title',
      authorSelector: '.topic-author',
      dateSelector: '.topic-date',
      contentSelector: '.topic-excerpt'
    }
  ]

  constructor() {
    super()
    this.webScraper = new WebScraper()
  }

  async search(keyword: string, options: SearchOptions = {}): Promise<RawContent[]> {
    try {
      const sanitizedKeyword = this.sanitizeKeyword(keyword)
      const allResults: RawContent[] = []

      // Search each forum site
      for (const forumSite of this.forumSites) {
        try {
          const siteResults = await this.searchForumSite(forumSite, sanitizedKeyword, options)
          allResults.push(...siteResults)
        } catch (error) {
          console.warn(`Failed to search ${forumSite.name}:`, error.message)
        }
      }

      // Also search using generic forum search
      try {
        const genericResults = await this.searchGenericForums(sanitizedKeyword, options)
        allResults.push(...genericResults)
      } catch (error) {
        console.warn('Failed to search generic forums:', error.message)
      }

      // Sort by date and apply limit
      const sortedResults = allResults.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      return sortedResults.slice(0, options.limit || 50)
    } catch (error) {
      throw this.handleError(error, 'search')
    }
  }

  async getContent(id: string): Promise<RawContent | null> {
    // For forums, we would need to scrape the specific URL
    // This is a simplified implementation
    try {
      const url = id.replace('forum_', '')
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CustomerSignal/1.0 (Web Monitoring Service)',
        },
      })

      if (!response.ok) {
        return null
      }

      const html = await response.text()
      return this.parseForumContent(html, url)
    } catch (error) {
      console.error('Error fetching forum content:', error)
      return null
    }
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      // Test with a simple HTTP request
      const response = await fetch('https://httpbin.org/get', {
        headers: {
          'User-Agent': 'CustomerSignal/1.0 (Web Monitoring Service)',
        },
      })
      return response.ok
    } catch {
      return false
    }
  }

  protected buildSearchQuery(keyword: string, options: SearchOptions = {}): string {
    const params = new URLSearchParams()
    
    let query = `"${keyword}"`
    
    // Add time-based filters if supported
    if (options.since) {
      const sinceDate = new Date(options.since)
      const year = sinceDate.getFullYear()
      query += ` after:${year}`
    }
    
    params.set('q', query)
    params.set('num', (options.limit || 10).toString())
    
    return params.toString()
  }

  private async searchForumSite(forumSite: ForumSite, keyword: string, options: SearchOptions): Promise<RawContent[]> {
    const searchUrl = `${forumSite.baseUrl}${forumSite.searchPath}${encodeURIComponent(keyword)}`
    
    try {
      // Special handling for API-based forums like Hacker News
      if (forumSite.name === 'hackernews') {
        return this.searchHackerNews(keyword, options)
      }

      const html = await this.webScraper.scrapeUrl(searchUrl, {
        respectRobotsTxt: true,
        delay: 2000, // Be respectful with forum sites
        maxRetries: 2
      })

      return this.parseForumResults(html, forumSite, searchUrl)
    } catch (error) {
      throw new Error(`Failed to search ${forumSite.name}: ${error.message}`)
    }
  }

  private async searchHackerNews(keyword: string, options: SearchOptions): Promise<RawContent[]> {
    const apiUrl = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(keyword)}&tags=story&hitsPerPage=${options.limit || 10}`
    
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'CustomerSignal/1.0',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return this.parseHackerNewsResults(data)
    } catch (error) {
      throw new Error(`Failed to search Hacker News API: ${error.message}`)
    }
  }

  private async searchGenericForums(keyword: string, options: SearchOptions): Promise<RawContent[]> {
    const results: RawContent[] = []
    
    // Search for forum discussions using Google with site-specific queries
    const forumQueries = [
      `"${keyword}" site:reddit.com/r/`,
      `"${keyword}" inurl:forum`,
      `"${keyword}" inurl:discussion`,
      `"${keyword}" inurl:community`,
      `"${keyword}" "forum" OR "discussion" OR "community"`
    ]

    for (const query of forumQueries.slice(0, 2)) { // Limit to avoid rate limits
      try {
        const searchResults = await this.searchWithGoogle(query, options)
        results.push(...searchResults)
      } catch (error) {
        console.warn(`Failed generic forum search for "${query}":`, error.message)
      }
    }

    return results
  }

  private async searchWithGoogle(query: string, options: SearchOptions): Promise<RawContent[]> {
    // This is a simplified Google search implementation
    // In production, you'd want to use the Google Custom Search API or similar
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10`
    
    try {
      const html = await this.webScraper.scrapeUrl(searchUrl, {
        respectRobotsTxt: true,
        delay: 3000, // Be very respectful with Google
        maxRetries: 1
      })

      return this.parseGoogleSearchResults(html, query)
    } catch (error) {
      console.warn('Google search failed:', error.message)
      return []
    }
  }

  private parseForumResults(html: string, forumSite: ForumSite, sourceUrl: string): RawContent[] {
    const results: RawContent[] = []
    
    try {
      // Extract post elements using the forum's post selector
      const postElements = this.extractElementsBySelector(html, forumSite.postSelector)
      
      for (let i = 0; i < postElements.length; i++) {
        const postHtml = postElements[i]
        const result = this.parseForumPost(postHtml, forumSite, sourceUrl, i)
        if (result) {
          results.push(result)
        }
      }
    } catch (error) {
      console.error(`Error parsing ${forumSite.name} results:`, error)
    }

    return results
  }

  private parseForumPost(postHtml: string, forumSite: ForumSite, sourceUrl: string, index: number): RawContent | null {
    try {
      const title = forumSite.titleSelector ? 
        this.extractTextBySelector(postHtml, forumSite.titleSelector) : ''
      
      const author = forumSite.authorSelector ? 
        this.extractTextBySelector(postHtml, forumSite.authorSelector) : 'Anonymous'
      
      const content = forumSite.contentSelector ? 
        this.extractTextBySelector(postHtml, forumSite.contentSelector) : postHtml
      
      const dateStr = forumSite.dateSelector ? 
        this.extractTextBySelector(postHtml, forumSite.dateSelector) : ''
      
      const engagement = forumSite.engagementSelector ? 
        this.extractEngagement(postHtml, forumSite.engagementSelector) : { likes: 0, shares: 0, comments: 0 }

      // Extract URL from the post
      const urlMatch = postHtml.match(/href=["']([^"']+)["']/i)
      const postUrl = urlMatch ? this.resolveUrl(urlMatch[1], forumSite.baseUrl) : sourceUrl

      const id = this.generatePostId(forumSite.name, postUrl, index)
      const timestamp = this.parseDate(dateStr) || new Date().toISOString()
      const fullContent = title ? `${title}\n\n${content}` : content

      return {
        id: `forum_${id}`,
        content: this.cleanText(fullContent),
        author: this.cleanText(author),
        url: postUrl,
        timestamp,
        engagement,
        metadata: {
          platform: forumSite.name,
          forum_site: forumSite.name,
          original_date: dateStr,
          post_index: index,
        }
      }
    } catch (error) {
      console.error('Error parsing forum post:', error)
      return null
    }
  }

  private parseHackerNewsResults(data: any): RawContent[] {
    if (!data?.hits) {
      return []
    }

    return data.hits
      .map((hit: any) => this.parseHackerNewsHit(hit))
      .filter((hit: RawContent | null) => hit !== null) as RawContent[]
  }

  private parseHackerNewsHit(hit: any): RawContent | null {
    try {
      const id = `hackernews_${hit.objectID}`
      const url = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`
      
      return {
        id: `forum_${id}`,
        content: hit.title || '',
        author: hit.author || 'Anonymous',
        url,
        timestamp: hit.created_at || new Date().toISOString(),
        engagement: {
          likes: hit.points || 0,
          shares: 0,
          comments: hit.num_comments || 0,
        },
        metadata: {
          platform: 'hackernews',
          story_id: hit.objectID,
          story_text: hit.story_text,
          tags: hit._tags,
        }
      }
    } catch (error) {
      console.error('Error parsing Hacker News hit:', error)
      return null
    }
  }

  private parseGoogleSearchResults(html: string, query: string): RawContent[] {
    const results: RawContent[] = []
    
    try {
      // Look for search result containers
      const resultRegex = /<div[^>]*class="[^"]*g[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
      let match
      let index = 0
      
      while ((match = resultRegex.exec(html)) !== null && index < 5) {
        const resultHtml = match[1]
        const result = this.parseGoogleResult(resultHtml, query, index)
        if (result) {
          results.push(result)
        }
        index++
      }
    } catch (error) {
      console.error('Error parsing Google search results:', error)
    }

    return results
  }

  private parseGoogleResult(resultHtml: string, query: string, index: number): RawContent | null {
    try {
      const titleMatch = resultHtml.match(/<h3[^>]*>([^<]+)<\/h3>/i)
      const title = titleMatch ? this.cleanText(titleMatch[1]) : ''
      
      const linkMatch = resultHtml.match(/<a[^>]*href="([^"]+)"[^>]*>/i)
      const url = linkMatch ? this.cleanGoogleUrl(linkMatch[1]) : ''
      
      const snippetMatch = resultHtml.match(/<span[^>]*>([^<]+)<\/span>/i)
      const snippet = snippetMatch ? this.cleanText(snippetMatch[1]) : ''
      
      if (!title || !url) return null

      const id = this.generatePostId('google_forum', url, index)
      const content = snippet ? `${title}\n\n${snippet}` : title

      return {
        id: `forum_${id}`,
        content,
        author: 'Forum User',
        url,
        timestamp: new Date().toISOString(),
        engagement: {
          likes: 0,
          shares: 0,
          comments: 0,
        },
        metadata: {
          platform: 'google_forum_search',
          search_query: query,
          result_index: index,
          snippet,
        }
      }
    } catch (error) {
      console.error('Error parsing Google result:', error)
      return null
    }
  }

  private parseForumContent(html: string, url: string): RawContent | null {
    try {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      const title = titleMatch ? titleMatch[1].trim() : 'Forum Discussion'
      
      const textContent = this.webScraper.extractTextContent(html).substring(0, 500)

      return {
        id: `forum_${this.generateUrlId(url)}`,
        content: `${title}\n\n${textContent}`,
        author: 'forum_user',
        url: url,
        timestamp: new Date().toISOString(),
        engagement: {
          likes: 0,
          comments: 0,
          shares: 0,
        },
        metadata: {
          platform: 'forum',
          scraped: true,
          content_length: textContent.length,
        }
      }
    } catch (error) {
      console.error('Error parsing forum content:', error)
      return null
    }
  }

  // Helper methods
  private extractElementsBySelector(html: string, selector: string): string[] {
    const elements: string[] = []
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
    
    return match ? this.cleanText(match[1]) : ''
  }

  private extractEngagement(html: string, selector: string): { likes: number; shares: number; comments: number } {
    const engagementText = this.extractTextBySelector(html, selector)
    const numberMatch = engagementText.match(/(\d+)/)
    const likes = numberMatch ? parseInt(numberMatch[1], 10) : 0
    
    return { likes, shares: 0, comments: 0 }
  }

  private cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
  }

  private cleanGoogleUrl(url: string): string {
    if (url.startsWith('/url?q=')) {
      const urlMatch = url.match(/\/url\?q=([^&]+)/)
      if (urlMatch) {
        return decodeURIComponent(urlMatch[1])
      }
    }
    return url.startsWith('http') ? url : `https://www.google.com${url}`
  }

  private resolveUrl(url: string, baseUrl: string): string {
    try {
      return new URL(url, baseUrl).href
    } catch {
      return url
    }
  }

  private parseDate(dateStr: string): string | null {
    if (!dateStr) return null
    
    try {
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return date.toISOString()
      }
    } catch {
      // Ignore parsing errors
    }
    
    return null
  }

  private generatePostId(platform: string, url: string, index: number): string {
    const input = `${platform}_${url}_${index}`
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  private generateUrlId(url: string): string {
    // Generate a consistent ID from URL
    let hash = 0
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }
}