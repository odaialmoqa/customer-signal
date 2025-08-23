import { PlatformAdapter, SearchOptions, RawContent } from './base-adapter.ts'

export class TikTokAdapter extends PlatformAdapter {
  readonly platformName = 'tiktok'
  readonly rateLimitPerHour = 1000 // TikTok API rate limits
  readonly requiresAuth = true

  private readonly baseUrl = 'https://open-api.tiktok.com'
  private readonly accessToken = Deno.env.get('TIKTOK_ACCESS_TOKEN')
  private readonly clientKey = Deno.env.get('TIKTOK_CLIENT_KEY')

  async search(keyword: string, options: SearchOptions = {}): Promise<RawContent[]> {
    if (!this.accessToken || !this.clientKey) {
      throw new Error('TikTok API credentials not configured')
    }

    try {
      const sanitizedKeyword = this.sanitizeKeyword(keyword)
      
      // TikTok Research API for video search
      const results = await this.searchVideos(sanitizedKeyword, options)
      
      return results
    } catch (error) {
      throw this.handleError(error, 'search')
    }
  }

  async getContent(id: string): Promise<RawContent | null> {
    if (!this.accessToken) {
      throw new Error('TikTok Access Token not configured')
    }

    try {
      const videoId = id.replace('tiktok_', '')
      
      // TikTok doesn't provide a direct video details API for external content
      // This would typically require the TikTok Research API or Business API
      const url = `${this.baseUrl}/v2/research/video/query/`
      
      const requestBody = {
        query: {
          video_ids: [videoId]
        },
        fields: [
          'id',
          'video_description',
          'create_time',
          'username',
          'like_count',
          'comment_count',
          'share_count',
          'view_count'
        ]
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'CustomerSignal/1.0',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw this.handleError({ status: response.status, message: response.statusText }, 'getContent')
      }

      const data = await response.json()
      return this.parseVideoData(data.data?.videos?.[0])
    } catch (error) {
      throw this.handleError(error, 'getContent')
    }
  }

  async validateConfiguration(): Promise<boolean> {
    if (!this.accessToken || !this.clientKey) {
      return false
    }

    try {
      // Test with a simple request to TikTok's API
      const response = await fetch(`${this.baseUrl}/v2/oauth/token/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_key: this.clientKey,
          client_secret: Deno.env.get('TIKTOK_CLIENT_SECRET') || '',
          grant_type: 'client_credentials',
        }),
      })
      return response.ok
    } catch {
      return false
    }
  }

  protected buildSearchQuery(keyword: string, options: SearchOptions = {}): string {
    // TikTok uses JSON body for search, not URL params
    return JSON.stringify({
      query: {
        keyword: keyword,
        and: [],
        or: [],
        not: []
      },
      fields: [
        'id',
        'video_description',
        'create_time',
        'username',
        'like_count',
        'comment_count',
        'share_count',
        'view_count',
        'hashtag_names'
      ],
      max_count: Math.min(options.limit || 20, 100),
      cursor: 0,
      search_id: `search_${Date.now()}`,
      is_random: false
    })
  }

  private async searchVideos(keyword: string, options: SearchOptions = {}): Promise<RawContent[]> {
    try {
      const url = `${this.baseUrl}/v2/research/video/query/`
      
      const requestBody = {
        query: {
          keyword: keyword,
          and: [],
          or: [],
          not: []
        },
        fields: [
          'id',
          'video_description',
          'create_time',
          'username',
          'like_count',
          'comment_count',
          'share_count',
          'view_count',
          'hashtag_names'
        ],
        max_count: Math.min(options.limit || 20, 100),
        cursor: 0,
        search_id: `search_${Date.now()}`,
        is_random: false
      }

      if (options.since) {
        requestBody.query['start_date'] = options.since
      }

      if (options.until) {
        requestBody.query['end_date'] = options.until
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'CustomerSignal/1.0',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw this.handleError({ status: response.status, message: response.statusText }, 'searchVideos')
      }

      const data = await response.json()
      
      return data.data?.videos
        ?.map((video: any) => this.parseVideoData(video))
        .filter((video: RawContent | null) => video !== null) as RawContent[] || []
    } catch (error) {
      throw this.handleError(error, 'searchVideos')
    }
  }

  private parseVideoData(videoData: any): RawContent | null {
    if (!videoData) {
      return null
    }

    try {
      return {
        id: `tiktok_${videoData.id}`,
        content: videoData.video_description || '',
        author: videoData.username || 'TikTok User',
        url: `https://www.tiktok.com/@${videoData.username}/video/${videoData.id}`,
        timestamp: new Date(videoData.create_time * 1000).toISOString(),
        engagement: {
          likes: videoData.like_count || 0,
          comments: videoData.comment_count || 0,
          shares: videoData.share_count || 0,
          views: videoData.view_count || 0,
        },
        metadata: {
          videoId: videoData.id,
          hashtags: videoData.hashtag_names || [],
          duration: videoData.duration,
          region_code: videoData.region_code,
        }
      }
    } catch (error) {
      console.error('Error parsing TikTok video data:', error)
      return null
    }
  }

  /**
   * Search TikTok hashtags for brand mentions
   */
  async searchHashtag(hashtag: string, options: SearchOptions = {}): Promise<RawContent[]> {
    if (!this.accessToken) {
      throw new Error('TikTok Access Token not configured')
    }

    try {
      const url = `${this.baseUrl}/v2/research/video/query/`
      
      const requestBody = {
        query: {
          hashtag_name: hashtag.replace('#', ''),
          and: [],
          or: [],
          not: []
        },
        fields: [
          'id',
          'video_description',
          'create_time',
          'username',
          'like_count',
          'comment_count',
          'share_count',
          'view_count',
          'hashtag_names'
        ],
        max_count: Math.min(options.limit || 20, 100),
        cursor: 0,
        search_id: `hashtag_search_${Date.now()}`,
        is_random: false
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'CustomerSignal/1.0',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw this.handleError({ status: response.status, message: response.statusText }, 'searchHashtag')
      }

      const data = await response.json()
      
      return data.data?.videos
        ?.map((video: any) => this.parseVideoData(video))
        .filter((video: RawContent | null) => video !== null) as RawContent[] || []
    } catch (error) {
      throw this.handleError(error, 'searchHashtag')
    }
  }

  /**
   * Get TikTok user profile and recent videos
   */
  async getUserVideos(username: string, keyword: string, options: SearchOptions = {}): Promise<RawContent[]> {
    if (!this.accessToken) {
      throw new Error('TikTok Access Token not configured')
    }

    try {
      const url = `${this.baseUrl}/v2/research/video/query/`
      
      const requestBody = {
        query: {
          username: username,
          and: [],
          or: [],
          not: []
        },
        fields: [
          'id',
          'video_description',
          'create_time',
          'username',
          'like_count',
          'comment_count',
          'share_count',
          'view_count',
          'hashtag_names'
        ],
        max_count: Math.min(options.limit || 20, 100),
        cursor: 0,
        search_id: `user_search_${Date.now()}`,
        is_random: false
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'CustomerSignal/1.0',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw this.handleError({ status: response.status, message: response.statusText }, 'getUserVideos')
      }

      const data = await response.json()
      
      return data.data?.videos
        ?.map((video: any) => this.parseVideoData(video))
        .filter((video: RawContent | null) => {
          return video && video.content.toLowerCase().includes(keyword.toLowerCase())
        }) as RawContent[] || []
    } catch (error) {
      throw this.handleError(error, 'getUserVideos')
    }
  }
}