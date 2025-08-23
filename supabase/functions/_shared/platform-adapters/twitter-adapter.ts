import { PlatformAdapter, SearchOptions, RawContent } from './base-adapter.ts'

export class TwitterAdapter extends PlatformAdapter {
  readonly platformName = 'twitter'
  readonly rateLimitPerHour = 300 // Twitter API v2 basic tier
  readonly requiresAuth = true

  private readonly baseUrl = 'https://api.twitter.com/2'
  private readonly bearerToken = Deno.env.get('TWITTER_BEARER_TOKEN')

  async search(keyword: string, options: SearchOptions = {}): Promise<RawContent[]> {
    if (!this.bearerToken) {
      throw new Error('Twitter Bearer Token not configured')
    }

    try {
      const sanitizedKeyword = this.sanitizeKeyword(keyword)
      const query = this.buildSearchQuery(sanitizedKeyword, options)
      
      const url = `${this.baseUrl}/tweets/search/recent?${query}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
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
    if (!this.bearerToken) {
      throw new Error('Twitter Bearer Token not configured')
    }

    try {
      const tweetId = id.replace('twitter_', '')
      const url = `${this.baseUrl}/tweets/${tweetId}?tweet.fields=created_at,author_id,public_metrics,context_annotations&user.fields=username,name`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'User-Agent': 'CustomerSignal/1.0',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw this.handleError({ status: response.status, message: response.statusText }, 'getContent')
      }

      const data = await response.json()
      return this.parseTweetData(data.data, data.includes?.users?.[0])
    } catch (error) {
      throw this.handleError(error, 'getContent')
    }
  }

  async validateConfiguration(): Promise<boolean> {
    if (!this.bearerToken) {
      return false
    }

    try {
      // Test with a simple request to Twitter's API
      const response = await fetch(`${this.baseUrl}/tweets/search/recent?query=test&max_results=10`, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
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
    
    // Build Twitter search query
    let query = keyword
    
    // Add filters for better results
    query += ' -is:retweet' // Exclude retweets
    
    if (options.includeReplies === false) {
      query += ' -is:reply'
    }
    
    params.set('query', query)
    params.set('max_results', Math.min(options.limit || 10, 100).toString())
    params.set('tweet.fields', 'created_at,author_id,public_metrics,context_annotations,lang')
    params.set('user.fields', 'username,name,verified')
    params.set('expansions', 'author_id')
    
    if (options.since) {
      params.set('start_time', options.since)
    }
    
    if (options.until) {
      params.set('end_time', options.until)
    }
    
    return params.toString()
  }

  private parseSearchResults(data: any): RawContent[] {
    if (!data?.data) {
      return []
    }

    const users = data.includes?.users || []
    const userMap = new Map(users.map((user: any) => [user.id, user]))

    return data.data
      .map((tweet: any) => this.parseTweetData(tweet, userMap.get(tweet.author_id)))
      .filter((tweet: RawContent | null) => tweet !== null) as RawContent[]
  }

  private parseTweetData(tweetData: any, userData?: any): RawContent | null {
    if (!tweetData) {
      return null
    }

    try {
      const username = userData?.username || 'unknown'
      const displayName = userData?.name || username

      return {
        id: `twitter_${tweetData.id}`,
        content: tweetData.text,
        author: `${displayName} (@${username})`,
        url: `https://twitter.com/${username}/status/${tweetData.id}`,
        timestamp: tweetData.created_at || new Date().toISOString(),
        engagement: {
          likes: tweetData.public_metrics?.like_count || 0,
          shares: tweetData.public_metrics?.retweet_count || 0,
          comments: tweetData.public_metrics?.reply_count || 0,
          views: tweetData.public_metrics?.impression_count || 0,
        },
        metadata: {
          author_id: tweetData.author_id,
          language: tweetData.lang,
          verified: userData?.verified || false,
          context_annotations: tweetData.context_annotations || [],
          quote_count: tweetData.public_metrics?.quote_count || 0,
        }
      }
    } catch (error) {
      console.error('Error parsing Twitter data:', error)
      return null
    }
  }
}