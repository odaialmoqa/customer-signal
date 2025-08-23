export interface SearchOptions {
  limit?: number
  since?: string
  until?: string
  sortBy?: 'relevance' | 'date'
  includeReplies?: boolean
}

export interface RawContent {
  id: string
  content: string
  author: string
  url: string
  timestamp: string
  engagement?: {
    likes?: number
    shares?: number
    comments?: number
    views?: number
  }
  metadata?: Record<string, any>
}

export abstract class PlatformAdapter {
  abstract readonly platformName: string
  abstract readonly rateLimitPerHour: number
  abstract readonly requiresAuth: boolean

  /**
   * Search for content containing the specified keyword
   */
  abstract search(keyword: string, options?: SearchOptions): Promise<RawContent[]>

  /**
   * Get specific content by ID
   */
  abstract getContent(id: string): Promise<RawContent | null>

  /**
   * Validate that the adapter is properly configured
   */
  abstract validateConfiguration(): Promise<boolean>

  /**
   * Monitor keywords and return conversations (for compatibility with new adapters)
   */
  async monitor?(keywords: string[]): Promise<any[]> {
    // Default implementation for backward compatibility
    const allResults: RawContent[] = []
    for (const keyword of keywords) {
      try {
        const results = await this.search(keyword, { limit: 50 })
        allResults.push(...results)
      } catch (error) {
        console.error(`Error monitoring keyword "${keyword}" on ${this.platformName}:`, error)
      }
    }
    return allResults
  }

  /**
   * Get platform name (for compatibility with new adapters)
   */
  getPlatformName?(): string {
    return this.platformName
  }

  /**
   * Get the platform-specific rate limit information
   */
  getRateLimit(): { requestsPerHour: number; burstLimit?: number } {
    return {
      requestsPerHour: this.rateLimitPerHour,
      burstLimit: Math.floor(this.rateLimitPerHour / 4) // Default burst limit
    }
  }

  /**
   * Handle platform-specific errors
   */
  protected handleError(error: any, context: string): Error {
    console.error(`${this.platformName} adapter error in ${context}:`, error)
    
    if (error.status === 429) {
      return new Error(`Rate limit exceeded for ${this.platformName}`)
    }
    
    if (error.status === 401 || error.status === 403) {
      return new Error(`Authentication failed for ${this.platformName}`)
    }
    
    if (error.status >= 500) {
      return new Error(`${this.platformName} service unavailable`)
    }
    
    return new Error(`${this.platformName} error: ${error.message || 'Unknown error'}`)
  }

  /**
   * Sanitize and validate search keywords
   */
  protected sanitizeKeyword(keyword: string): string {
    return keyword
      .trim()
      .replace(/[^\w\s\-_]/g, '') // Remove special characters except hyphens and underscores
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 100) // Limit length
  }

  /**
   * Build search query with platform-specific syntax
   */
  protected abstract buildSearchQuery(keyword: string, options?: SearchOptions): string
}