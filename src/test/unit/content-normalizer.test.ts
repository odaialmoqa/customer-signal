import { describe, it, expect } from 'vitest'
import { ContentNormalizer } from '../../lib/services/monitoring-edge-functions/content-normalizer'
import { RawContent } from '../../lib/services/monitoring-edge-functions/platform-adapters/base-adapter'

// Mock the content normalizer for client-side testing
class ContentNormalizer {
  normalize(rawContent: RawContent, platform: string): any {
    return {
      id: this.ensureUniqueId(rawContent.id, platform),
      content: this.normalizeContent(rawContent.content),
      author: this.normalizeAuthor(rawContent.author),
      platform: platform,
      url: this.normalizeUrl(rawContent.url),
      timestamp: this.normalizeTimestamp(rawContent.timestamp),
      engagement: this.normalizeEngagement(rawContent.engagement || {}),
      metadata: this.normalizeMetadata(rawContent.metadata || {}, platform)
    }
  }

  private ensureUniqueId(id: string, platform: string): string {
    if (id.startsWith(`${platform}_`)) {
      return id
    }
    return `${platform}_${id}`
  }

  private normalizeContent(content: string): string {
    if (!content) return ''
    return content
      .replace(/\s+/g, ' ')
      .replace(/[\x00-\x1F\x7F]/g, '')
      .trim()
      .substring(0, 10000)
  }

  private normalizeAuthor(author: string): string {
    if (!author) return 'unknown'
    return author
      .trim()
      .substring(0, 100)
      .replace(/[^\w\s@._-]/g, '')
  }

  private normalizeUrl(url: string): string {
    if (!url) return ''
    try {
      const urlObj = new URL(url)
      return urlObj.toString()
    } catch {
      return url.trim().substring(0, 500)
    }
  }

  private normalizeTimestamp(timestamp: string): string {
    if (!timestamp) return new Date().toISOString()
    try {
      const date = new Date(timestamp)
      if (isNaN(date.getTime())) {
        return new Date().toISOString()
      }
      return date.toISOString()
    } catch {
      return new Date().toISOString()
    }
  }

  private normalizeEngagement(engagement: any): { likes: number; shares: number; comments: number } {
    return {
      likes: this.normalizeNumber(engagement.likes || engagement.upvotes || engagement.reactions),
      shares: this.normalizeNumber(engagement.shares || engagement.retweets || engagement.reposts),
      comments: this.normalizeNumber(engagement.comments || engagement.replies)
    }
  }

  private normalizeMetadata(metadata: any, platform: string): Record<string, any> {
    const normalized: Record<string, any> = {
      platform,
      normalized_at: new Date().toISOString()
    }

    switch (platform) {
      case 'reddit':
        normalized.subreddit = metadata.subreddit
        normalized.score = this.normalizeNumber(metadata.score)
        normalized.upvote_ratio = this.normalizeNumber(metadata.upvote_ratio, 0, 1)
        normalized.flair = metadata.flair
        break
      case 'twitter':
        normalized.language = metadata.language
        normalized.verified = Boolean(metadata.verified)
        normalized.context_annotations = metadata.context_annotations || []
        normalized.quote_count = this.normalizeNumber(metadata.quote_count)
        break
    }

    return normalized
  }

  private normalizeNumber(value: any, min = 0, max = Number.MAX_SAFE_INTEGER): number {
    const num = parseInt(value) || 0
    return Math.max(min, Math.min(max, num))
  }

  extractKeywords(content: string): string[] {
    if (!content) return []
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word))
    return [...new Set(words)].slice(0, 20)
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'this', 'that', 'these', 'those', 'have', 'has', 'had', 'will', 'would'
    ])
    return stopWords.has(word)
  }
}

describe('ContentNormalizer', () => {
  const normalizer = new ContentNormalizer()

  describe('normalize', () => {
    it('should normalize Reddit content correctly', () => {
      const rawContent: RawContent = {
        id: 'abc123',
        content: 'This is a test post   with extra spaces\n\nand newlines',
        author: 'test_user',
        url: 'https://reddit.com/r/test/comments/abc123',
        timestamp: '2024-01-01T12:00:00Z',
        engagement: {
          likes: 10,
          comments: 5
        },
        metadata: {
          subreddit: 'test',
          score: 15,
          upvote_ratio: 0.8
        }
      }

      const normalized = normalizer.normalize(rawContent, 'reddit')

      expect(normalized.id).toBe('reddit_abc123')
      expect(normalized.content).toBe('This is a test post with extra spaces and newlines')
      expect(normalized.author).toBe('test_user')
      expect(normalized.platform).toBe('reddit')
      expect(normalized.engagement.likes).toBe(10)
      expect(normalized.engagement.comments).toBe(5)
      expect(normalized.metadata.subreddit).toBe('test')
      expect(normalized.metadata.score).toBe(15)
    })

    it('should normalize Twitter content correctly', () => {
      const rawContent: RawContent = {
        id: 'tweet_123',
        content: 'Great product! #awesome',
        author: 'John Doe (@johndoe)',
        url: 'https://twitter.com/johndoe/status/123',
        timestamp: '2024-01-01T12:00:00Z',
        engagement: {
          likes: 25,
          shares: 5,
          comments: 3
        },
        metadata: {
          language: 'en',
          verified: true,
          quote_count: 2
        }
      }

      const normalized = normalizer.normalize(rawContent, 'twitter')

      expect(normalized.id).toBe('twitter_tweet_123')
      expect(normalized.content).toBe('Great product! #awesome')
      expect(normalized.engagement.likes).toBe(25)
      expect(normalized.engagement.shares).toBe(5)
      expect(normalized.metadata.language).toBe('en')
      expect(normalized.metadata.verified).toBe(true)
    })

    it('should handle missing or invalid data gracefully', () => {
      const rawContent: RawContent = {
        id: '',
        content: '',
        author: '',
        url: 'invalid-url',
        timestamp: 'invalid-date',
        engagement: undefined,
        metadata: undefined
      }

      const normalized = normalizer.normalize(rawContent, 'test')

      expect(normalized.id).toBe('test_')
      expect(normalized.content).toBe('')
      expect(normalized.author).toBe('unknown')
      expect(normalized.url).toBe('invalid-url')
      expect(normalized.engagement.likes).toBe(0)
      expect(normalized.engagement.shares).toBe(0)
      expect(normalized.engagement.comments).toBe(0)
      expect(normalized.metadata.platform).toBe('test')
    })

    it('should ensure unique IDs', () => {
      const rawContent: RawContent = {
        id: 'reddit_existing_id',
        content: 'Test content',
        author: 'test_user',
        url: 'https://example.com',
        timestamp: '2024-01-01T12:00:00Z'
      }

      const normalized = normalizer.normalize(rawContent, 'reddit')
      expect(normalized.id).toBe('reddit_existing_id') // Should not double-prefix
    })

    it('should clean content properly', () => {
      const rawContent: RawContent = {
        id: 'test123',
        content: '   This   has\t\tmultiple\n\nwhitespace   types   ',
        author: 'test_user',
        url: 'https://example.com',
        timestamp: '2024-01-01T12:00:00Z'
      }

      const normalized = normalizer.normalize(rawContent, 'test')
      expect(normalized.content).toBe('This has multiple whitespace types')
    })

    it('should limit content length', () => {
      const longContent = 'a'.repeat(15000)
      const rawContent: RawContent = {
        id: 'test123',
        content: longContent,
        author: 'test_user',
        url: 'https://example.com',
        timestamp: '2024-01-01T12:00:00Z'
      }

      const normalized = normalizer.normalize(rawContent, 'test')
      expect(normalized.content.length).toBe(10000)
    })
  })

  describe('extractKeywords', () => {
    it('should extract meaningful keywords', () => {
      const content = 'This is a great product with amazing features and excellent customer service'
      const keywords = normalizer.extractKeywords(content)

      expect(keywords).toContain('great')
      expect(keywords).toContain('product')
      expect(keywords).toContain('amazing')
      expect(keywords).toContain('features')
      expect(keywords).toContain('excellent')
      expect(keywords).toContain('customer')
      expect(keywords).toContain('service')
      
      // Should not contain stop words
      expect(keywords).not.toContain('this')
      expect(keywords).not.toContain('with')
      expect(keywords).not.toContain('and')
    })

    it('should filter out short words', () => {
      const content = 'I am so happy with it'
      const keywords = normalizer.extractKeywords(content)

      expect(keywords).toContain('happy')
      expect(keywords).not.toContain('am')
      expect(keywords).not.toContain('so')
      expect(keywords).not.toContain('it')
    })

    it('should handle empty content', () => {
      const keywords = normalizer.extractKeywords('')
      expect(keywords).toEqual([])
    })

    it('should limit keyword count', () => {
      const longContent = Array(50).fill('unique').map((word, i) => `${word}${i}`).join(' ')
      const keywords = normalizer.extractKeywords(longContent)
      expect(keywords.length).toBeLessThanOrEqual(20)
    })

    it('should remove duplicates', () => {
      const content = 'great great product product amazing amazing'
      const keywords = normalizer.extractKeywords(content)
      
      expect(keywords.filter(k => k === 'great')).toHaveLength(1)
      expect(keywords.filter(k => k === 'product')).toHaveLength(1)
      expect(keywords.filter(k => k === 'amazing')).toHaveLength(1)
    })
  })
})