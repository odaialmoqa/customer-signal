import { PlatformAdapter, SearchOptions, RawContent } from './base-adapter.ts'

export class BingNewsAdapter extends PlatformAdapter {
  readonly platformName = 'bing-news'
  readonly rateLimitPerHour = 3000 // Bing News API allows 3000 calls per month for free tier
  readonly requiresAuth = true

  private readonly baseUrl = 'https://api.bing.microsoft.com/v7.0/news'
  private readonly apiKey = Deno.env.get('BING_NEWS_API_KEY')

  async search(keyword: string, options: SearchOptions = {}): Promise<RawContent[]> {
    if (!this.apiKey) {
      throw new Error('Bing News API key not configured')
    }

    try {
      const sanitizedKeyword = this.sanitizeKeyword(keyword)
      const query = this.buildSearchQuery(sanitizedKeyword, options)
      
      const url = `${this.baseUrl}/search?${query}`
      
      const response = await fetch(url, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'User-Agent': 'CustomerSignal/1.0',
          'Accept': 'application/json',
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
    // Bing News API doesn't support getting individual articles by ID
    // This would need to be implemented with a different approach
    return null
  }

  async validateConfiguration(): Promise<boolean> {
    if (!this.apiKey) {
      return false
    }

    try {
      // Test with a simple request to Bing News API
      const response = await fetch(`${this.baseUrl}/search?q=test&count=1`, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
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
    params.set('count', Math.min(options.limit || 20, 100).toString())
    params.set('mkt', 'en-US') // Market
    params.set('safeSearch', 'Moderate')
    
    if (options.sortBy === 'date') {
      params.set('sortBy', 'Date')
    } else {
      params.set('sortBy', 'Relevance')
    }
    
    // Bing News API doesn't support date range filters in the same way
    // We'll filter results after fetching
    
    return params.toString()
  }

  private parseSearchResults(data: any): RawContent[] {
    if (!data?.value) {
      return []
    }

    return data.value
      .map((article: any) => this.parseArticleData(article))
      .filter((article: RawContent | null) => article !== null) as RawContent[]
  }

  private parseArticleData(articleData: any): RawContent | null {
    if (!articleData) {
      return null
    }

    try {
      // Generate a unique ID based on URL or name
      const id = this.generateArticleId(articleData.url || articleData.name)

      // Extract provider information
      const provider = articleData.provider?.[0]?.name || 'Unknown'
      
      // Build content from available fields
      let content = articleData.name || ''
      if (articleData.description) {
        content += `\n\n${articleData.description}`
      }

      return {
        id: `bing_news_${id}`,
        content,
        author: provider,
        url: articleData.url,
        timestamp: articleData.datePublished || new Date().toISOString(),
        engagement: {
          likes: 0, // Bing News API doesn't provide engagement metrics
          shares: 0,
          comments: 0,
        },
        metadata: {
          provider: provider,
          category: articleData.category,
          about: articleData.about?.map((item: any) => item.name),
          mentions: articleData.mentions?.map((item: any) => item.name),
          image_url: articleData.image?.thumbnail?.contentUrl,
          video_url: articleData.video?.thumbnail?.contentUrl,
          word_count: articleData.wordCount,
          clustered_articles: articleData.clusteredArticles?.length || 0,
        }
      }
    } catch (error) {
      console.error('Error parsing Bing news article data:', error)
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

  /**
   * Search for trending news topics
   */
  async getTrendingTopics(options: { category?: string, market?: string } = {}): Promise<RawContent[]> {
    if (!this.apiKey) {
      throw new Error('Bing News API key not configured')
    }

    try {
      const params = new URLSearchParams()
      params.set('mkt', options.market || 'en-US')
      
      if (options.category) {
        params.set('category', options.category)
      }

      const url = `${this.baseUrl}/trendingtopics?${params.toString()}`
      
      const response = await fetch(url, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'User-Agent': 'CustomerSignal/1.0',
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw this.handleError({ status: response.status, message: response.statusText }, 'getTrendingTopics')
      }

      const data = await response.json()
      return this.parseTrendingTopics(data)
    } catch (error) {
      throw this.handleError(error, 'getTrendingTopics')
    }
  }

  private parseTrendingTopics(data: any): RawContent[] {
    if (!data?.value) {
      return []
    }

    return data.value
      .map((topic: any) => this.parseTrendingTopic(topic))
      .filter((topic: RawContent | null) => topic !== null) as RawContent[]
  }

  private parseTrendingTopic(topicData: any): RawContent | null {
    if (!topicData) {
      return null
    }

    try {
      const id = this.generateArticleId(topicData.name || topicData.webSearchUrl)

      return {
        id: `bing_trending_${id}`,
        content: topicData.name || '',
        author: 'Bing Trending Topics',
        url: topicData.webSearchUrl,
        timestamp: new Date().toISOString(),
        engagement: {
          likes: 0,
          shares: 0,
          comments: 0,
        },
        metadata: {
          is_trending: true,
          query: topicData.query?.text,
          image_url: topicData.image?.url,
          news_search_url: topicData.newsSearchUrl,
        }
      }
    } catch (error) {
      console.error('Error parsing trending topic data:', error)
      return null
    }
  }

  /**
   * Search news by category
   */
  async searchByCategory(category: string, options: SearchOptions = {}): Promise<RawContent[]> {
    if (!this.apiKey) {
      throw new Error('Bing News API key not configured')
    }

    try {
      const params = new URLSearchParams()
      params.set('category', category)
      params.set('count', Math.min(options.limit || 20, 100).toString())
      params.set('mkt', 'en-US')
      params.set('safeSearch', 'Moderate')
      
      if (options.sortBy === 'date') {
        params.set('sortBy', 'Date')
      }

      const url = `${this.baseUrl}?${params.toString()}`
      
      const response = await fetch(url, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'User-Agent': 'CustomerSignal/1.0',
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw this.handleError({ status: response.status, message: response.statusText }, 'searchByCategory')
      }

      const data = await response.json()
      return this.parseSearchResults(data)
    } catch (error) {
      throw this.handleError(error, 'searchByCategory')
    }
  }

  /**
   * Get available news categories
   */
  getAvailableCategories(): string[] {
    return [
      'Business',
      'Entertainment',
      'Health',
      'Politics',
      'Products',
      'ScienceAndTechnology',
      'Sports',
      'US',
      'World',
      'US_Business',
      'US_Entertainment',
      'US_Health',
      'US_Politics',
      'US_ScienceAndTechnology',
      'US_Sports',
      'US_World'
    ]
  }
}