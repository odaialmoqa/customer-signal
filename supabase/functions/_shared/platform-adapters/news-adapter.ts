import { PlatformAdapter, SearchOptions, RawContent } from './base-adapter.ts'

export class NewsAdapter extends PlatformAdapter {
  readonly platformName = 'news'
  readonly rateLimitPerHour = 1000 // NewsAPI allows 1000 requests per day for free tier
  readonly requiresAuth = true

  private readonly baseUrl = 'https://newsapi.org/v2'
  private readonly apiKey = Deno.env.get('NEWS_API_KEY')

  async search(keyword: string, options: SearchOptions = {}): Promise<RawContent[]> {
    if (!this.apiKey) {
      throw new Error('News API key not configured')
    }

    try {
      const sanitizedKeyword = this.sanitizeKeyword(keyword)
      const query = this.buildSearchQuery(sanitizedKeyword, options)
      
      const url = `${this.baseUrl}/everything?${query}`
      
      const response = await fetch(url, {
        headers: {
          'X-API-Key': this.apiKey,
          'User-Agent': 'CustomerSignal/1.0',
        },
      })

      if (!response.ok) {
        throw this.handleError({ status: response.status, message: response.statusText }, 'search')
      }

      const data = await response.json()
      return this.parseSearchResults(data)
    } catch (error) {
      throw this.handleError(error, 'search')
    }
  }

  async getContent(id: string): Promise<RawContent | null> {
    // NewsAPI doesn't support getting individual articles by ID
    // This would need to be implemented with a different approach
    // For now, return null
    return null
  }

  async validateConfiguration(): Promise<boolean> {
    if (!this.apiKey) {
      return false
    }

    try {
      // Test with a simple request to NewsAPI
      const response = await fetch(`${this.baseUrl}/everything?q=test&pageSize=1`, {
        headers: {
          'X-API-Key': this.apiKey,
          'User-Agent': 'CustomerSignal/1.0',
        },
      })
      return response.ok
    } catch {
      return false
    }
  }

  protected buildSearchQuery(keyword: string, options: SearchOptions = {}): string {
    const params = new URLSearchParams()
    
    params.set('q', keyword)
    params.set('pageSize', Math.min(options.limit || 20, 100).toString())
    params.set('language', 'en')
    
    if (options.sortBy === 'date') {
      params.set('sortBy', 'publishedAt')
    } else {
      params.set('sortBy', 'relevancy')
    }
    
    if (options.since) {
      params.set('from', options.since.split('T')[0]) // NewsAPI expects YYYY-MM-DD format
    }
    
    if (options.until) {
      params.set('to', options.until.split('T')[0])
    }
    
    // Exclude articles without content
    params.set('excludeDomains', 'removed.com')
    
    return params.toString()
  }

  private parseSearchResults(data: any): RawContent[] {
    if (!data?.articles) {
      return []
    }

    return data.articles
      .map((article: any) => this.parseArticleData(article))
      .filter((article: RawContent | null) => article !== null) as RawContent[]
  }

  private parseArticleData(articleData: any): RawContent | null {
    if (!articleData || articleData.title === '[Removed]') {
      return null
    }

    try {
      // Generate a unique ID based on URL or title
      const id = this.generateArticleId(articleData.url || articleData.title)

      return {
        id: `news_${id}`,
        content: `${articleData.title}\n\n${articleData.description || ''}`,
        author: articleData.author || articleData.source?.name || 'Unknown',
        url: articleData.url,
        timestamp: articleData.publishedAt || new Date().toISOString(),
        engagement: {
          likes: 0, // NewsAPI doesn't provide engagement metrics
          shares: 0,
          comments: 0,
        },
        metadata: {
          source: articleData.source?.name,
          source_id: articleData.source?.id,
          url_to_image: articleData.urlToImage,
          content_preview: articleData.content?.substring(0, 200),
        }
      }
    } catch (error) {
      console.error('Error parsing news article data:', error)
      return null
    }
  }

  private generateArticleId(input: string): string {
    // Simple hash function to generate consistent IDs
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }
}