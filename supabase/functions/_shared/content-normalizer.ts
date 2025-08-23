import { RawContent } from './platform-adapters/base-adapter.ts'
import { NormalizedContent } from './monitoring-service.ts'

export class ContentNormalizer {
  /**
   * Normalize content from different platforms into a consistent format
   */
  normalize(rawContent: RawContent, platform: string): NormalizedContent {
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

  /**
   * Ensure the ID is unique and properly formatted
   */
  private ensureUniqueId(id: string, platform: string): string {
    if (id.startsWith(`${platform}_`)) {
      return id
    }
    return `${platform}_${id}`
  }

  /**
   * Clean and normalize text content
   */
  private normalizeContent(content: string): string {
    if (!content) return ''

    return content
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove control characters
      .replace(/[\x00-\x1F\x7F]/g, '')
      // Trim and limit length
      .trim()
      .substring(0, 10000) // Reasonable limit for content length
  }

  /**
   * Normalize author information
   */
  private normalizeAuthor(author: string): string {
    if (!author) return 'unknown'

    return author
      .trim()
      .substring(0, 100) // Limit author name length
      .replace(/[^\w\s@._-]/g, '') // Keep only safe characters
  }

  /**
   * Ensure URL is properly formatted
   */
  private normalizeUrl(url: string): string {
    if (!url) return ''

    try {
      // Validate and normalize URL
      const urlObj = new URL(url)
      return urlObj.toString()
    } catch {
      // If URL is invalid, return as-is but cleaned
      return url.trim().substring(0, 500)
    }
  }

  /**
   * Normalize timestamp to ISO format
   */
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

  /**
   * Normalize engagement metrics
   */
  private normalizeEngagement(engagement: any): {
    likes: number
    shares: number
    comments: number
  } {
    return {
      likes: this.normalizeNumber(engagement.likes || engagement.upvotes || engagement.reactions),
      shares: this.normalizeNumber(engagement.shares || engagement.retweets || engagement.reposts),
      comments: this.normalizeNumber(engagement.comments || engagement.replies)
    }
  }

  /**
   * Normalize metadata based on platform
   */
  private normalizeMetadata(metadata: any, platform: string): Record<string, any> {
    const normalized: Record<string, any> = {
      platform,
      normalized_at: new Date().toISOString()
    }

    // Platform-specific metadata normalization
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

      case 'news':
        normalized.source = metadata.source
        normalized.source_id = metadata.source_id
        normalized.image_url = metadata.url_to_image
        break

      case 'forum':
        normalized.tags = Array.isArray(metadata.tags) ? metadata.tags : []
        normalized.question_score = this.normalizeNumber(metadata.question_score)
        normalized.answer_count = this.normalizeNumber(metadata.answer_count)
        break
    }

    // Add any additional metadata that doesn't conflict
    Object.keys(metadata).forEach(key => {
      if (!normalized.hasOwnProperty(key) && this.isValidMetadataValue(metadata[key])) {
        normalized[key] = metadata[key]
      }
    })

    return normalized
  }

  /**
   * Normalize numeric values with optional bounds
   */
  private normalizeNumber(value: any, min = 0, max = Number.MAX_SAFE_INTEGER): number {
    const num = parseInt(value) || 0
    return Math.max(min, Math.min(max, num))
  }

  /**
   * Check if a metadata value is valid for storage
   */
  private isValidMetadataValue(value: any): boolean {
    if (value === null || value === undefined) return false
    if (typeof value === 'string' && value.length > 1000) return false
    if (typeof value === 'object' && JSON.stringify(value).length > 5000) return false
    return true
  }

  /**
   * Extract keywords from content for better searchability
   */
  extractKeywords(content: string): string[] {
    if (!content) return []

    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3) // Filter out short words
      .filter(word => !this.isStopWord(word))

    // Remove duplicates and limit count
    return [...new Set(words)].slice(0, 20)
  }

  /**
   * Check if a word is a common stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'among', 'this', 'that', 'these',
      'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
      'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his',
      'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself',
      'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which',
      'who', 'whom', 'whose', 'this', 'that', 'these', 'those', 'am', 'is',
      'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'having', 'do', 'does', 'did', 'doing', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'shall'
    ])

    return stopWords.has(word)
  }
}