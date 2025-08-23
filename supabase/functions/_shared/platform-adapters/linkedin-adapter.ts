import { PlatformAdapter, SearchOptions, RawContent } from './base-adapter.ts'

export class LinkedInAdapter extends PlatformAdapter {
  readonly platformName = 'linkedin'
  readonly rateLimitPerHour = 500 // LinkedIn API rate limits
  readonly requiresAuth = true

  private readonly baseUrl = 'https://api.linkedin.com/v2'
  private readonly accessToken = Deno.env.get('LINKEDIN_ACCESS_TOKEN')

  async search(keyword: string, options: SearchOptions = {}): Promise<RawContent[]> {
    if (!this.accessToken) {
      throw new Error('LinkedIn Access Token not configured')
    }

    try {
      const sanitizedKeyword = this.sanitizeKeyword(keyword)
      const query = this.buildSearchQuery(sanitizedKeyword, options)
      
      // LinkedIn doesn't have a public search API for posts, so we'll use organization posts
      // This is a limitation of LinkedIn's API - full search requires special permissions
      const url = `${this.baseUrl}/shares?${query}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'User-Agent': 'CustomerSignal/1.0',
        },
      })

      if (!response.ok) {
        throw this.handleError({ status: response.status, message: response.statusText }, 'search')
      }

      const data = await response.json()
      return this.parseSearchResults(data, keyword)
    } catch (error) {
      throw this.handleError(error, 'search')
    }
  }

  async getContent(id: string): Promise<RawContent | null> {
    if (!this.accessToken) {
      throw new Error('LinkedIn Access Token not configured')
    }

    try {
      const shareId = id.replace('linkedin_', '')
      const url = `${this.baseUrl}/shares/${shareId}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
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
      return this.parseShareData(data)
    } catch (error) {
      throw this.handleError(error, 'getContent')
    }
  }

  async validateConfiguration(): Promise<boolean> {
    if (!this.accessToken) {
      return false
    }

    try {
      // Test with a simple request to LinkedIn's API
      const response = await fetch(`${this.baseUrl}/people/~`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
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
    
    // LinkedIn API limitations - we can only get organization shares
    params.set('count', Math.min(options.limit || 20, 50).toString())
    
    if (options.since) {
      // Convert to LinkedIn's timestamp format (milliseconds since epoch)
      const sinceTimestamp = new Date(options.since).getTime()
      params.set('start', sinceTimestamp.toString())
    }
    
    return params.toString()
  }

  private parseSearchResults(data: any, keyword: string): RawContent[] {
    if (!data?.elements) {
      return []
    }

    return data.elements
      .map((share: any) => this.parseShareData(share))
      .filter((share: RawContent | null) => {
        // Filter by keyword since LinkedIn API doesn't support text search
        return share && share.content.toLowerCase().includes(keyword.toLowerCase())
      }) as RawContent[]
  }

  private parseShareData(shareData: any): RawContent | null {
    if (!shareData) {
      return null
    }

    try {
      const text = shareData.text?.text || ''
      const author = shareData.author || 'LinkedIn User'
      const shareId = shareData.id || 'unknown'

      return {
        id: `linkedin_${shareId}`,
        content: text,
        author: author,
        url: `https://www.linkedin.com/feed/update/${shareId}`,
        timestamp: new Date(shareData.created?.time || Date.now()).toISOString(),
        engagement: {
          likes: shareData.totalSocialActivityCounts?.numLikes || 0,
          shares: shareData.totalSocialActivityCounts?.numShares || 0,
          comments: shareData.totalSocialActivityCounts?.numComments || 0,
        },
        metadata: {
          shareId: shareId,
          visibility: shareData.visibility?.code || 'unknown',
          contentType: shareData.content?.contentEntities?.[0]?.entityLocation || 'text',
        }
      }
    } catch (error) {
      console.error('Error parsing LinkedIn share data:', error)
      return null
    }
  }

  /**
   * Search LinkedIn company pages for mentions
   * This is an alternative approach when full search API is not available
   */
  async searchCompanyPosts(companyId: string, keyword: string, options: SearchOptions = {}): Promise<RawContent[]> {
    if (!this.accessToken) {
      throw new Error('LinkedIn Access Token not configured')
    }

    try {
      const url = `${this.baseUrl}/shares?q=owners&owners=urn:li:organization:${companyId}&count=${options.limit || 20}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'User-Agent': 'CustomerSignal/1.0',
        },
      })

      if (!response.ok) {
        throw this.handleError({ status: response.status, message: response.statusText }, 'searchCompanyPosts')
      }

      const data = await response.json()
      return this.parseSearchResults(data, keyword)
    } catch (error) {
      throw this.handleError(error, 'searchCompanyPosts')
    }
  }
}