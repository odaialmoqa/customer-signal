import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LinkedInAdapter } from '../../../supabase/functions/_shared/platform-adapters/linkedin-adapter'
import { YouTubeAdapter } from '../../../supabase/functions/_shared/platform-adapters/youtube-adapter'
import { InstagramAdapter } from '../../../supabase/functions/_shared/platform-adapters/instagram-adapter'
import { TikTokAdapter } from '../../../supabase/functions/_shared/platform-adapters/tiktok-adapter'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock Deno environment
global.Deno = {
  env: {
    get: vi.fn((key: string) => {
      const envVars: Record<string, string> = {
        'LINKEDIN_ACCESS_TOKEN': 'test-linkedin-token',
        'YOUTUBE_API_KEY': 'test-youtube-key',
        'INSTAGRAM_ACCESS_TOKEN': 'test-instagram-token',
        'TIKTOK_ACCESS_TOKEN': 'test-tiktok-token',
        'TIKTOK_CLIENT_KEY': 'test-tiktok-client-key',
        'TIKTOK_CLIENT_SECRET': 'test-tiktok-secret'
      }
      return envVars[key]
    })
  }
} as any

describe('Social Media Platform Adapters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('LinkedInAdapter', () => {
    let linkedinAdapter: LinkedInAdapter

    beforeEach(() => {
      linkedinAdapter = new LinkedInAdapter()
    })

    it('should search LinkedIn shares', async () => {
      const mockResponse = {
        elements: [
          {
            id: 'share123',
            text: { text: 'Great insights about our product!' },
            author: 'John Professional',
            created: { time: 1640995200000 },
            totalSocialActivityCounts: {
              numLikes: 25,
              numShares: 5,
              numComments: 3
            }
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const results = await linkedinAdapter.search('product')
      
      expect(results).toHaveLength(1)
      expect(results[0].content).toContain('Great insights')
      expect(results[0].author).toBe('John Professional')
      expect(results[0].engagement.likes).toBe(25)
    })

    it('should handle LinkedIn API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })

      await expect(linkedinAdapter.search('test')).rejects.toThrow('Authentication failed')
    })

    it('should validate LinkedIn configuration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'user123' })
      })

      const isValid = await linkedinAdapter.validateConfiguration()
      expect(isValid).toBe(true)
    })
  })

  describe('YouTubeAdapter', () => {
    let youtubeAdapter: YouTubeAdapter

    beforeEach(() => {
      youtubeAdapter = new YouTubeAdapter()
    })

    it('should search YouTube videos', async () => {
      const mockSearchResponse = {
        items: [
          {
            id: { videoId: 'video123' },
            snippet: {
              title: 'Product Review Video',
              description: 'Detailed review of the product',
              channelTitle: 'Tech Reviewer',
              publishedAt: '2024-01-01T00:00:00Z'
            }
          }
        ]
      }

      const mockDetailsResponse = {
        items: [
          {
            id: 'video123',
            snippet: {
              title: 'Product Review Video',
              description: 'Detailed review of the product',
              channelTitle: 'Tech Reviewer',
              publishedAt: '2024-01-01T00:00:00Z',
              channelId: 'channel123'
            },
            statistics: {
              viewCount: '1000',
              likeCount: '50',
              commentCount: '10'
            }
          }
        ]
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSearchResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDetailsResponse)
        })

      const results = await youtubeAdapter.search('product review')
      
      expect(results).toHaveLength(1)
      expect(results[0].content).toContain('Product Review Video')
      expect(results[0].engagement.views).toBe(1000)
      expect(results[0].engagement.likes).toBe(50)
    })

    it('should handle YouTube API quota exceeded', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Quota Exceeded'
      })

      await expect(youtubeAdapter.search('test')).rejects.toThrow('Authentication failed')
    })
  })

  describe('InstagramAdapter', () => {
    let instagramAdapter: InstagramAdapter

    beforeEach(() => {
      instagramAdapter = new InstagramAdapter()
    })

    it('should search user media', async () => {
      // Mock getUserId call
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'user123' })
        })
        // Mock user media call
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            data: [
              {
                id: 'media123',
                caption: 'Check out this amazing product!',
                username: 'instagram_user',
                timestamp: '2024-01-01T00:00:00Z',
                media_type: 'IMAGE',
                media_url: 'https://instagram.com/media123.jpg',
                permalink: 'https://instagram.com/p/media123'
              }
            ]
          })
        })

      const results = await instagramAdapter.search('product')
      
      expect(results).toHaveLength(1)
      expect(results[0].content).toContain('amazing product')
      expect(results[0].author).toBe('instagram_user')
    })

    it('should handle Instagram API limitations', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      })

      await expect(instagramAdapter.search('test')).rejects.toThrow('Instagram error')
    })
  })

  describe('TikTokAdapter', () => {
    let tiktokAdapter: TikTokAdapter

    beforeEach(() => {
      tiktokAdapter = new TikTokAdapter()
    })

    it('should search TikTok videos', async () => {
      const mockResponse = {
        data: {
          videos: [
            {
              id: 'tiktok123',
              video_description: 'Dancing with our product! #brand',
              username: 'tiktok_user',
              create_time: 1640995200,
              like_count: 500,
              comment_count: 50,
              share_count: 25,
              view_count: 10000,
              hashtag_names: ['brand', 'product']
            }
          ]
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const results = await tiktokAdapter.search('product')
      
      expect(results).toHaveLength(1)
      expect(results[0].content).toContain('Dancing with our product')
      expect(results[0].engagement.likes).toBe(500)
      expect(results[0].engagement.views).toBe(10000)
      expect(results[0].metadata.hashtags).toContain('brand')
    })

    it('should handle TikTok API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      })

      await expect(tiktokAdapter.search('test')).rejects.toThrow('Rate limit exceeded')
    })
  })

  describe('Cross-Platform Error Handling', () => {
    it('should handle authentication failures consistently', async () => {
      const adapters = [
        new LinkedInAdapter(),
        new YouTubeAdapter(),
        new InstagramAdapter(),
        new TikTokAdapter()
      ]

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })

      for (const adapter of adapters) {
        await expect(adapter.search('test')).rejects.toThrow('Authentication failed')
      }
    })

    it('should handle rate limiting consistently', async () => {
      const adapters = [
        new LinkedInAdapter(),
        new YouTubeAdapter(),
        new InstagramAdapter(),
        new TikTokAdapter()
      ]

      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      })

      for (const adapter of adapters) {
        await expect(adapter.search('test')).rejects.toThrow('Rate limit exceeded')
      }
    })
  })
})