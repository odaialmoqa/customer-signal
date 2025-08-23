import { PlatformAdapter, SearchOptions, RawContent } from './base-adapter.ts'

export class InstagramAdapter extends PlatformAdapter {
  readonly platformName = 'instagram'
  readonly rateLimitPerHour = 200 // Instagram Basic Display API rate limits
  readonly requiresAuth = true

  private readonly baseUrl = 'https://graph.instagram.com'
  private readonly accessToken = Deno.env.get('INSTAGRAM_ACCESS_TOKEN')

  async search(keyword: string, options: SearchOptions = {}): Promise<RawContent[]> {
    if (!this.accessToken) {
      throw new Error('Instagram Access Token not configured')
    }

    try {
      // Instagram Basic Display API doesn't support public search
      // We can only search through hashtags or user's own media
      const sanitizedKeyword = this.sanitizeKeyword(keyword)
      
      // Try hashtag search first
      const hashtagResults = await this.searchHashtag(sanitizedKeyword, options)
      
      return hashtagResults
    } catch (error) {
      throw this.handleError(error, 'search')
    }
  }

  async getContent(id: string): Promise<RawContent | null> {
    if (!this.accessToken) {
      throw new Error('Instagram Access Token not configured')
    }

    try {
      const mediaId = id.replace('instagram_', '')
      const url = `${this.baseUrl}/${mediaId}?fields=id,caption,media_type,media_url,permalink,timestamp,username&access_token=${this.accessToken}`
      
      const response = await fetch(url, {
        headers: {
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
      return this.parseMediaData(data)
    } catch (error) {
      throw this.handleError(error, 'getContent')
    }
  }

  async validateConfiguration(): Promise<boolean> {
    if (!this.accessToken) {
      return false
    }

    try {
      // Test with a simple request to Instagram's API
      const response = await fetch(`${this.baseUrl}/me?fields=id,username&access_token=${this.accessToken}`)
      return response.ok
    } catch {
      return false
    }
  }

  protected buildSearchQuery(keyword: string, options: SearchOptions = {}): string {
    const params = new URLSearchParams()
    
    params.set('access_token', this.accessToken!)
    params.set('fields', 'id,caption,media_type,media_url,permalink,timestamp,username')
    
    if (options.limit) {
      params.set('limit', Math.min(options.limit, 25).toString())
    }
    
    return params.toString()
  }

  /**
   * Search Instagram hashtags for mentions
   * Note: This requires Instagram Business API which has different permissions
   */
  private async searchHashtag(hashtag: string, options: SearchOptions = {}): Promise<RawContent[]> {
    try {
      // Remove # if present
      const cleanHashtag = hashtag.replace('#', '')
      
      // First, get the hashtag ID
      const hashtagSearchUrl = `${this.baseUrl}/ig_hashtag_search?user_id=${await this.getUserId()}&q=${cleanHashtag}&access_token=${this.accessToken}`
      
      const hashtagResponse = await fetch(hashtagSearchUrl)
      
      if (!hashtagResponse.ok) {
        // Fallback to user media search if hashtag search fails
        return await this.searchUserMedia(hashtag, options)
      }

      const hashtagData = await hashtagResponse.json()
      
      if (!hashtagData.data || hashtagData.data.length === 0) {
        return []
      }

      const hashtagId = hashtagData.data[0].id

      // Get recent media for this hashtag
      const mediaUrl = `${this.baseUrl}/${hashtagId}/recent_media?user_id=${await this.getUserId()}&fields=id,caption,media_type,media_url,permalink,timestamp,username&limit=${options.limit || 25}&access_token=${this.accessToken}`
      
      const mediaResponse = await fetch(mediaUrl)
      
      if (!mediaResponse.ok) {
        return []
      }

      const mediaData = await mediaResponse.json()
      
      return mediaData.data
        ?.map((media: any) => this.parseMediaData(media))
        .filter((media: RawContent | null) => media !== null) as RawContent[] || []
    } catch (error) {
      console.error('Error searching Instagram hashtag:', error)
      throw this.handleError(error, 'searchHashtag')
    }
  }

  /**
   * Search through user's own media (fallback method)
   */
  private async searchUserMedia(keyword: string, options: SearchOptions = {}): Promise<RawContent[]> {
    try {
      const url = `${this.baseUrl}/me/media?fields=id,caption,media_type,media_url,permalink,timestamp,username&limit=${options.limit || 25}&access_token=${this.accessToken}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw this.handleError({ status: response.status, message: response.statusText }, 'searchUserMedia')
      }

      const data = await response.json()
      
      return data.data
        ?.map((media: any) => this.parseMediaData(media))
        .filter((media: RawContent | null) => {
          return media && media.content.toLowerCase().includes(keyword.toLowerCase())
        }) as RawContent[] || []
    } catch (error) {
      console.error('Error searching user media:', error)
      throw this.handleError(error, 'searchUserMedia')
    }
  }

  private async getUserId(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/me?fields=id&access_token=${this.accessToken}`)
    const data = await response.json()
    return data.id
  }

  private parseMediaData(mediaData: any): RawContent | null {
    if (!mediaData) {
      return null
    }

    try {
      return {
        id: `instagram_${mediaData.id}`,
        content: mediaData.caption || '',
        author: mediaData.username || 'Instagram User',
        url: mediaData.permalink || `https://www.instagram.com/p/${mediaData.id}/`,
        timestamp: mediaData.timestamp || new Date().toISOString(),
        engagement: {
          likes: 0, // Instagram Basic Display API doesn't provide engagement metrics
          comments: 0,
          shares: 0,
        },
        metadata: {
          mediaType: mediaData.media_type,
          mediaUrl: mediaData.media_url,
          mediaId: mediaData.id,
        }
      }
    } catch (error) {
      console.error('Error parsing Instagram media data:', error)
      return null
    }
  }

  /**
   * Search Instagram Business accounts (requires different API access)
   * This method would be used with Instagram Graph API for business accounts
   */
  async searchBusinessAccount(accountId: string, keyword: string, options: SearchOptions = {}): Promise<RawContent[]> {
    if (!this.accessToken) {
      throw new Error('Instagram Access Token not configured')
    }

    try {
      const url = `${this.baseUrl}/${accountId}/media?fields=id,caption,media_type,media_url,permalink,timestamp,username,like_count,comments_count&access_token=${this.accessToken}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw this.handleError({ status: response.status, message: response.statusText }, 'searchBusinessAccount')
      }

      const data = await response.json()
      
      return data.data
        ?.map((media: any) => this.parseBusinessMediaData(media))
        .filter((media: RawContent | null) => {
          return media && media.content.toLowerCase().includes(keyword.toLowerCase())
        }) as RawContent[] || []
    } catch (error) {
      throw this.handleError(error, 'searchBusinessAccount')
    }
  }

  private parseBusinessMediaData(mediaData: any): RawContent | null {
    if (!mediaData) {
      return null
    }

    try {
      return {
        id: `instagram_${mediaData.id}`,
        content: mediaData.caption || '',
        author: mediaData.username || 'Instagram Business',
        url: mediaData.permalink || `https://www.instagram.com/p/${mediaData.id}/`,
        timestamp: mediaData.timestamp || new Date().toISOString(),
        engagement: {
          likes: mediaData.like_count || 0,
          comments: mediaData.comments_count || 0,
          shares: 0,
        },
        metadata: {
          mediaType: mediaData.media_type,
          mediaUrl: mediaData.media_url,
          mediaId: mediaData.id,
        }
      }
    } catch (error) {
      console.error('Error parsing Instagram business media data:', error)
      return null
    }
  }
}