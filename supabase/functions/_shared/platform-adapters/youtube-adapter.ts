import { PlatformAdapter, SearchOptions, RawContent } from './base-adapter.ts'

export class YouTubeAdapter extends PlatformAdapter {
  readonly platformName = 'youtube'
  readonly rateLimitPerHour = 10000 // YouTube Data API v3 quota units per day (converted to hourly)
  readonly requiresAuth = true

  private readonly baseUrl = 'https://www.googleapis.com/youtube/v3'
  private readonly apiKey = Deno.env.get('YOUTUBE_API_KEY')

  async search(keyword: string, options: SearchOptions = {}): Promise<RawContent[]> {
    if (!this.apiKey) {
      throw new Error('YouTube API Key not configured')
    }

    try {
      const sanitizedKeyword = this.sanitizeKeyword(keyword)
      const query = this.buildSearchQuery(sanitizedKeyword, options)
      
      const url = `${this.baseUrl}/search?${query}`
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CustomerSignal/1.0',
        },
      })

      if (!response.ok) {
        throw this.handleError({ status: response.status, message: response.statusText }, 'search')
      }

      const data = await response.json()
      return await this.parseSearchResults(data)
    } catch (error) {
      throw this.handleError(error, 'search')
    }
  }

  async getContent(id: string): Promise<RawContent | null> {
    if (!this.apiKey) {
      throw new Error('YouTube API Key not configured')
    }

    try {
      const videoId = id.replace('youtube_', '')
      const url = `${this.baseUrl}/videos?part=snippet,statistics&id=${videoId}&key=${this.apiKey}`
      
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
      return this.parseVideoData(data.items?.[0])
    } catch (error) {
      throw this.handleError(error, 'getContent')
    }
  }

  async validateConfiguration(): Promise<boolean> {
    if (!this.apiKey) {
      return false
    }

    try {
      // Test with a simple request to YouTube's API
      const response = await fetch(`${this.baseUrl}/search?part=snippet&q=test&maxResults=1&key=${this.apiKey}`)
      return response.ok
    } catch {
      return false
    }
  }

  protected buildSearchQuery(keyword: string, options: SearchOptions = {}): string {
    const params = new URLSearchParams()
    
    params.set('part', 'snippet')
    params.set('q', keyword)
    params.set('type', 'video')
    params.set('maxResults', Math.min(options.limit || 25, 50).toString())
    params.set('key', this.apiKey!)
    
    if (options.sortBy === 'date') {
      params.set('order', 'date')
    } else {
      params.set('order', 'relevance')
    }
    
    if (options.since) {
      params.set('publishedAfter', options.since)
    }
    
    if (options.until) {
      params.set('publishedBefore', options.until)
    }
    
    return params.toString()
  }

  private async parseSearchResults(data: any): Promise<RawContent[]> {
    if (!data?.items) {
      return []
    }

    const videoIds = data.items.map((item: any) => item.id.videoId).join(',')
    
    // Get detailed video information including statistics
    const detailsUrl = `${this.baseUrl}/videos?part=snippet,statistics&id=${videoIds}&key=${this.apiKey}`
    
    try {
      const detailsResponse = await fetch(detailsUrl)
      const detailsData = await detailsResponse.json()
      
      return detailsData.items
        .map((video: any) => this.parseVideoData(video))
        .filter((video: RawContent | null) => video !== null) as RawContent[]
    } catch (error) {
      // Fallback to basic data if detailed fetch fails
      return data.items
        .map((item: any) => this.parseBasicVideoData(item))
        .filter((video: RawContent | null) => video !== null) as RawContent[]
    }
  }

  private parseVideoData(videoData: any): RawContent | null {
    if (!videoData) {
      return null
    }

    try {
      const snippet = videoData.snippet
      const statistics = videoData.statistics || {}

      return {
        id: `youtube_${videoData.id}`,
        content: `${snippet.title}\n\n${snippet.description}`,
        author: snippet.channelTitle || 'Unknown Channel',
        url: `https://www.youtube.com/watch?v=${videoData.id}`,
        timestamp: snippet.publishedAt,
        engagement: {
          likes: parseInt(statistics.likeCount || '0'),
          views: parseInt(statistics.viewCount || '0'),
          comments: parseInt(statistics.commentCount || '0'),
          shares: 0, // YouTube doesn't provide share count in API
        },
        metadata: {
          channelId: snippet.channelId,
          categoryId: snippet.categoryId,
          duration: videoData.contentDetails?.duration,
          tags: snippet.tags || [],
          defaultLanguage: snippet.defaultLanguage,
          thumbnails: snippet.thumbnails,
        }
      }
    } catch (error) {
      console.error('Error parsing YouTube video data:', error)
      return null
    }
  }

  private parseBasicVideoData(itemData: any): RawContent | null {
    if (!itemData?.snippet) {
      return null
    }

    try {
      const snippet = itemData.snippet

      return {
        id: `youtube_${itemData.id.videoId}`,
        content: `${snippet.title}\n\n${snippet.description}`,
        author: snippet.channelTitle || 'Unknown Channel',
        url: `https://www.youtube.com/watch?v=${itemData.id.videoId}`,
        timestamp: snippet.publishedAt,
        engagement: {
          likes: 0,
          views: 0,
          comments: 0,
          shares: 0,
        },
        metadata: {
          channelId: snippet.channelId,
          thumbnails: snippet.thumbnails,
        }
      }
    } catch (error) {
      console.error('Error parsing basic YouTube video data:', error)
      return null
    }
  }

  /**
   * Search YouTube comments for a specific video
   */
  async searchVideoComments(videoId: string, keyword: string, options: SearchOptions = {}): Promise<RawContent[]> {
    if (!this.apiKey) {
      throw new Error('YouTube API Key not configured')
    }

    try {
      const url = `${this.baseUrl}/commentThreads?part=snippet&videoId=${videoId}&maxResults=${options.limit || 100}&key=${this.apiKey}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw this.handleError({ status: response.status, message: response.statusText }, 'searchVideoComments')
      }

      const data = await response.json()
      
      return data.items
        ?.map((item: any) => this.parseCommentData(item, videoId))
        .filter((comment: RawContent | null) => {
          return comment && comment.content.toLowerCase().includes(keyword.toLowerCase())
        }) as RawContent[] || []
    } catch (error) {
      throw this.handleError(error, 'searchVideoComments')
    }
  }

  private parseCommentData(commentData: any, videoId: string): RawContent | null {
    if (!commentData?.snippet?.topLevelComment?.snippet) {
      return null
    }

    try {
      const comment = commentData.snippet.topLevelComment.snippet

      return {
        id: `youtube_comment_${commentData.id}`,
        content: comment.textDisplay,
        author: comment.authorDisplayName,
        url: `https://www.youtube.com/watch?v=${videoId}&lc=${commentData.id}`,
        timestamp: comment.publishedAt,
        engagement: {
          likes: comment.likeCount || 0,
          comments: commentData.snippet.totalReplyCount || 0,
          shares: 0,
        },
        metadata: {
          videoId: videoId,
          authorChannelId: comment.authorChannelId?.value,
          canRate: comment.canRate,
          parentId: commentData.snippet.topLevelComment.id,
        }
      }
    } catch (error) {
      console.error('Error parsing YouTube comment data:', error)
      return null
    }
  }
}