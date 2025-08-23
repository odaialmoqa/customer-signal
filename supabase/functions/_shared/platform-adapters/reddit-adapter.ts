import { PlatformAdapter, SearchOptions, RawContent } from './base-adapter.ts'

export class RedditAdapter extends PlatformAdapter {
  readonly platformName = 'reddit'
  readonly rateLimitPerHour = 600 // Reddit API allows 600 requests per 10 minutes
  readonly requiresAuth = false // Using public API endpoints

  private readonly baseUrl = 'https://www.reddit.com'

  async search(keyword: string, options: SearchOptions = {}): Promise<RawContent[]> {
    try {
      const sanitizedKeyword = this.sanitizeKeyword(keyword)
      const query = this.buildSearchQuery(sanitizedKeyword, options)
      
      const url = `${this.baseUrl}/search.json?${query}`
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CustomerSignal/1.0 (Web Monitoring Service)',
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
    try {
      const url = `${this.baseUrl}/comments/${id}.json`
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CustomerSignal/1.0 (Web Monitoring Service)',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw this.handleError({ status: response.status, message: response.statusText }, 'getContent')
      }

      const data = await response.json()
      return this.parsePostData(data[0]?.data?.children?.[0]?.data)
    } catch (error) {
      throw this.handleError(error, 'getContent')
    }
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      // Test with a simple request to Reddit's API
      const response = await fetch(`${this.baseUrl}/r/test.json?limit=1`, {
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
    
    params.set('q', keyword)
    params.set('type', 'link')
    params.set('limit', (options.limit || 25).toString())
    
    if (options.sortBy === 'date') {
      params.set('sort', 'new')
    } else {
      params.set('sort', 'relevance')
    }
    
    if (options.since) {
      // Reddit doesn't support exact date filtering, but we can use time-based sorting
      params.set('t', 'week') // Search within the last week
    }
    
    return params.toString()
  }

  private parseSearchResults(data: any): RawContent[] {
    if (!data?.data?.children) {
      return []
    }

    return data.data.children
      .map((child: any) => this.parsePostData(child.data))
      .filter((post: RawContent | null) => post !== null) as RawContent[]
  }

  private parsePostData(postData: any): RawContent | null {
    if (!postData) {
      return null
    }

    try {
      return {
        id: `reddit_${postData.id}`,
        content: postData.title + (postData.selftext ? `\n\n${postData.selftext}` : ''),
        author: postData.author || 'unknown',
        url: `https://reddit.com${postData.permalink}`,
        timestamp: new Date(postData.created_utc * 1000).toISOString(),
        engagement: {
          likes: postData.ups || 0,
          comments: postData.num_comments || 0,
          shares: 0, // Reddit doesn't track shares directly
        },
        metadata: {
          subreddit: postData.subreddit,
          score: postData.score,
          upvote_ratio: postData.upvote_ratio,
          is_self: postData.is_self,
          domain: postData.domain,
          flair: postData.link_flair_text,
        }
      }
    } catch (error) {
      console.error('Error parsing Reddit post data:', error)
      return null
    }
  }
}