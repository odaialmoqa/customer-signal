export interface RateLimitConfig {
  requestsPerHour: number
  burstLimit?: number
  windowSizeMinutes?: number
}

export interface RateLimitStatus {
  allowed: boolean
  remainingRequests: number
  resetTime: Date
  retryAfter?: number
}

export class RateLimiter {
  private limits: Map<string, RateLimitConfig> = new Map()
  private usage: Map<string, { requests: number[]; lastReset: Date }> = new Map()

  constructor() {
    // Set default rate limits for different platforms
    this.setLimit('reddit', { requestsPerHour: 600, burstLimit: 60 })
    this.setLimit('twitter', { requestsPerHour: 300, burstLimit: 30 })
    this.setLimit('news', { requestsPerHour: 1000, burstLimit: 100 })
    this.setLimit('forum', { requestsPerHour: 300, burstLimit: 30 })
    this.setLimit('default', { requestsPerHour: 100, burstLimit: 10 })
  }

  /**
   * Set rate limit configuration for a platform
   */
  setLimit(platform: string, config: RateLimitConfig): void {
    this.limits.set(platform, {
      windowSizeMinutes: 60, // Default to 1 hour window
      ...config
    })
  }

  /**
   * Check if a request is allowed under rate limits
   */
  async checkLimit(platform: string, tenantId: string): Promise<RateLimitStatus> {
    const key = `${platform}:${tenantId}`
    const config = this.limits.get(platform) || this.limits.get('default')!
    
    const now = new Date()
    const usage = this.getUsage(key)
    
    // Clean old requests outside the window
    const windowStart = new Date(now.getTime() - (config.windowSizeMinutes! * 60 * 1000))
    usage.requests = usage.requests.filter(timestamp => timestamp > windowStart.getTime())
    
    const currentRequests = usage.requests.length
    const remainingRequests = Math.max(0, config.requestsPerHour - currentRequests)
    
    // Check if request is allowed
    const allowed = currentRequests < config.requestsPerHour
    
    // Calculate reset time (next hour boundary)
    const resetTime = new Date(Math.ceil(now.getTime() / (60 * 60 * 1000)) * (60 * 60 * 1000))
    
    let retryAfter: number | undefined
    if (!allowed) {
      // Calculate when the oldest request will expire
      const oldestRequest = Math.min(...usage.requests)
      retryAfter = Math.ceil((oldestRequest + (config.windowSizeMinutes! * 60 * 1000) - now.getTime()) / 1000)
    }

    return {
      allowed,
      remainingRequests,
      resetTime,
      retryAfter
    }
  }

  /**
   * Record a request for rate limiting
   */
  async recordRequest(platform: string, tenantId: string): Promise<void> {
    const key = `${platform}:${tenantId}`
    const usage = this.getUsage(key)
    
    usage.requests.push(Date.now())
    this.usage.set(key, usage)
  }

  /**
   * Get current usage statistics
   */
  getUsageStats(platform: string, tenantId: string): {
    currentRequests: number
    maxRequests: number
    resetTime: Date
  } {
    const key = `${platform}:${tenantId}`
    const config = this.limits.get(platform) || this.limits.get('default')!
    const usage = this.getUsage(key)
    
    const now = new Date()
    const windowStart = new Date(now.getTime() - (config.windowSizeMinutes! * 60 * 1000))
    const currentRequests = usage.requests.filter(timestamp => timestamp > windowStart.getTime()).length
    
    const resetTime = new Date(Math.ceil(now.getTime() / (60 * 60 * 1000)) * (60 * 60 * 1000))
    
    return {
      currentRequests,
      maxRequests: config.requestsPerHour,
      resetTime
    }
  }

  /**
   * Reset usage for a specific platform/tenant
   */
  resetUsage(platform: string, tenantId: string): void {
    const key = `${platform}:${tenantId}`
    this.usage.delete(key)
  }

  /**
   * Get or initialize usage tracking for a key
   */
  private getUsage(key: string): { requests: number[]; lastReset: Date } {
    if (!this.usage.has(key)) {
      this.usage.set(key, {
        requests: [],
        lastReset: new Date()
      })
    }
    return this.usage.get(key)!
  }

  /**
   * Clean up old usage data to prevent memory leaks
   */
  cleanup(): void {
    const now = new Date()
    const cutoff = now.getTime() - (24 * 60 * 60 * 1000) // 24 hours ago
    
    for (const [key, usage] of this.usage.entries()) {
      // Remove requests older than 24 hours
      usage.requests = usage.requests.filter(timestamp => timestamp > cutoff)
      
      // Remove empty usage records
      if (usage.requests.length === 0 && usage.lastReset.getTime() < cutoff) {
        this.usage.delete(key)
      }
    }
  }

  /**
   * Calculate optimal delay between requests to stay within limits
   */
  calculateOptimalDelay(platform: string): number {
    const config = this.limits.get(platform) || this.limits.get('default')!
    
    // Calculate delay to spread requests evenly across the hour
    const delayMs = (60 * 60 * 1000) / config.requestsPerHour
    
    // Add some jitter to avoid thundering herd
    const jitter = Math.random() * 1000
    
    return Math.max(1000, delayMs + jitter) // Minimum 1 second delay
  }

  /**
   * Wait for the optimal delay before making a request
   */
  async waitForOptimalTiming(platform: string): Promise<void> {
    const delay = this.calculateOptimalDelay(platform)
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  /**
   * Check if we should use burst capacity
   */
  canUseBurst(platform: string, tenantId: string): boolean {
    const key = `${platform}:${tenantId}`
    const config = this.limits.get(platform) || this.limits.get('default')!
    
    if (!config.burstLimit) return false
    
    const usage = this.getUsage(key)
    const now = new Date()
    const lastMinute = now.getTime() - (60 * 1000)
    
    const recentRequests = usage.requests.filter(timestamp => timestamp > lastMinute).length
    
    return recentRequests < config.burstLimit
  }
}