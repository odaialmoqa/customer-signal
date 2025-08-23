import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock rate limiter for client-side testing
class RateLimiter {
  private limits: Map<string, { requestsPerHour: number; burstLimit?: number }> = new Map()
  private usage: Map<string, { requests: number[]; lastReset: Date }> = new Map()

  constructor() {
    this.setLimit('reddit', { requestsPerHour: 600, burstLimit: 60 })
    this.setLimit('twitter', { requestsPerHour: 300, burstLimit: 30 })
    this.setLimit('news', { requestsPerHour: 1000, burstLimit: 100 })
    this.setLimit('default', { requestsPerHour: 100, burstLimit: 10 })
  }

  setLimit(platform: string, config: { requestsPerHour: number; burstLimit?: number }): void {
    this.limits.set(platform, config)
  }

  async checkLimit(platform: string, tenantId: string): Promise<{
    allowed: boolean
    remainingRequests: number
    resetTime: Date
    retryAfter?: number
  }> {
    const key = `${platform}:${tenantId}`
    const config = this.limits.get(platform) || this.limits.get('default')!
    
    const now = new Date()
    const usage = this.getUsage(key)
    
    // Clean old requests (older than 1 hour)
    const windowStart = new Date(now.getTime() - 60 * 60 * 1000)
    usage.requests = usage.requests.filter(timestamp => timestamp > windowStart.getTime())
    
    const currentRequests = usage.requests.length
    const remainingRequests = Math.max(0, config.requestsPerHour - currentRequests)
    const allowed = currentRequests < config.requestsPerHour
    
    const resetTime = new Date(Math.ceil(now.getTime() / (60 * 60 * 1000)) * (60 * 60 * 1000))
    
    let retryAfter: number | undefined
    if (!allowed && usage.requests.length > 0) {
      const oldestRequest = Math.min(...usage.requests)
      retryAfter = Math.ceil((oldestRequest + 60 * 60 * 1000 - now.getTime()) / 1000)
    }

    return { allowed, remainingRequests, resetTime, retryAfter }
  }

  async recordRequest(platform: string, tenantId: string): Promise<void> {
    const key = `${platform}:${tenantId}`
    const usage = this.getUsage(key)
    usage.requests.push(Date.now())
    this.usage.set(key, usage)
  }

  getUsageStats(platform: string, tenantId: string): {
    currentRequests: number
    maxRequests: number
    resetTime: Date
  } {
    const key = `${platform}:${tenantId}`
    const config = this.limits.get(platform) || this.limits.get('default')!
    const usage = this.getUsage(key)
    
    const now = new Date()
    const windowStart = new Date(now.getTime() - 60 * 60 * 1000)
    const currentRequests = usage.requests.filter(timestamp => timestamp > windowStart.getTime()).length
    
    const resetTime = new Date(Math.ceil(now.getTime() / (60 * 60 * 1000)) * (60 * 60 * 1000))
    
    return {
      currentRequests,
      maxRequests: config.requestsPerHour,
      resetTime
    }
  }

  resetUsage(platform: string, tenantId: string): void {
    const key = `${platform}:${tenantId}`
    this.usage.delete(key)
  }

  calculateOptimalDelay(platform: string): number {
    const config = this.limits.get(platform) || this.limits.get('default')!
    const delayMs = (60 * 60 * 1000) / config.requestsPerHour
    const jitter = Math.random() * 1000
    return Math.max(1000, delayMs + jitter)
  }

  canUseBurst(platform: string, tenantId: string): boolean {
    const key = `${platform}:${tenantId}`
    const config = this.limits.get(platform) || this.limits.get('default')!
    
    if (!config.burstLimit) return false
    
    const usage = this.getUsage(key)
    const now = new Date()
    const lastMinute = now.getTime() - 60 * 1000
    
    const recentRequests = usage.requests.filter(timestamp => timestamp > lastMinute).length
    return recentRequests < config.burstLimit
  }

  private getUsage(key: string): { requests: number[]; lastReset: Date } {
    if (!this.usage.has(key)) {
      this.usage.set(key, {
        requests: [],
        lastReset: new Date()
      })
    }
    return this.usage.get(key)!
  }
}

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter

  beforeEach(() => {
    rateLimiter = new RateLimiter()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('checkLimit', () => {
    it('should allow requests within rate limit', async () => {
      const result = await rateLimiter.checkLimit('reddit', 'tenant1')
      
      expect(result.allowed).toBe(true)
      expect(result.remainingRequests).toBe(600)
      expect(result.retryAfter).toBeUndefined()
    })

    it('should track requests correctly', async () => {
      // Make some requests
      await rateLimiter.recordRequest('reddit', 'tenant1')
      await rateLimiter.recordRequest('reddit', 'tenant1')
      await rateLimiter.recordRequest('reddit', 'tenant1')

      const result = await rateLimiter.checkLimit('reddit', 'tenant1')
      
      expect(result.allowed).toBe(true)
      expect(result.remainingRequests).toBe(597) // 600 - 3
    })

    it('should deny requests when rate limit is exceeded', async () => {
      // Simulate hitting the rate limit
      const key = 'reddit:tenant1'
      const usage = rateLimiter['getUsage'](key)
      
      // Add 600 requests (the limit for Reddit)
      const now = Date.now()
      for (let i = 0; i < 600; i++) {
        usage.requests.push(now - i * 1000) // Spread over the last 10 minutes
      }

      const result = await rateLimiter.checkLimit('reddit', 'tenant1')
      
      expect(result.allowed).toBe(false)
      expect(result.remainingRequests).toBe(0)
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('should clean old requests outside the window', async () => {
      const key = 'reddit:tenant1'
      const usage = rateLimiter['getUsage'](key)
      
      const now = Date.now()
      const twoHoursAgo = now - 2 * 60 * 60 * 1000
      
      // Add old requests that should be cleaned up
      usage.requests.push(twoHoursAgo, twoHoursAgo + 1000, twoHoursAgo + 2000)
      
      // Add recent requests
      usage.requests.push(now - 1000, now - 2000)

      const result = await rateLimiter.checkLimit('reddit', 'tenant1')
      
      expect(result.allowed).toBe(true)
      expect(result.remainingRequests).toBe(598) // Should only count the 2 recent requests
    })

    it('should handle different platforms with different limits', async () => {
      const redditResult = await rateLimiter.checkLimit('reddit', 'tenant1')
      const twitterResult = await rateLimiter.checkLimit('twitter', 'tenant1')
      
      expect(redditResult.remainingRequests).toBe(600)
      expect(twitterResult.remainingRequests).toBe(300)
    })

    it('should isolate usage between tenants', async () => {
      await rateLimiter.recordRequest('reddit', 'tenant1')
      await rateLimiter.recordRequest('reddit', 'tenant1')
      
      const tenant1Result = await rateLimiter.checkLimit('reddit', 'tenant1')
      const tenant2Result = await rateLimiter.checkLimit('reddit', 'tenant2')
      
      expect(tenant1Result.remainingRequests).toBe(598)
      expect(tenant2Result.remainingRequests).toBe(600)
    })
  })

  describe('recordRequest', () => {
    it('should record requests correctly', async () => {
      await rateLimiter.recordRequest('reddit', 'tenant1')
      
      const stats = rateLimiter.getUsageStats('reddit', 'tenant1')
      expect(stats.currentRequests).toBe(1)
    })

    it('should handle multiple requests', async () => {
      await rateLimiter.recordRequest('reddit', 'tenant1')
      await rateLimiter.recordRequest('reddit', 'tenant1')
      await rateLimiter.recordRequest('reddit', 'tenant1')
      
      const stats = rateLimiter.getUsageStats('reddit', 'tenant1')
      expect(stats.currentRequests).toBe(3)
    })
  })

  describe('getUsageStats', () => {
    it('should return correct usage statistics', async () => {
      await rateLimiter.recordRequest('reddit', 'tenant1')
      await rateLimiter.recordRequest('reddit', 'tenant1')
      
      const stats = rateLimiter.getUsageStats('reddit', 'tenant1')
      
      expect(stats.currentRequests).toBe(2)
      expect(stats.maxRequests).toBe(600)
      expect(stats.resetTime).toBeInstanceOf(Date)
    })

    it('should return zero for unused platforms', () => {
      const stats = rateLimiter.getUsageStats('reddit', 'tenant1')
      
      expect(stats.currentRequests).toBe(0)
      expect(stats.maxRequests).toBe(600)
    })
  })

  describe('resetUsage', () => {
    it('should reset usage for a platform/tenant', async () => {
      await rateLimiter.recordRequest('reddit', 'tenant1')
      await rateLimiter.recordRequest('reddit', 'tenant1')
      
      let stats = rateLimiter.getUsageStats('reddit', 'tenant1')
      expect(stats.currentRequests).toBe(2)
      
      rateLimiter.resetUsage('reddit', 'tenant1')
      
      stats = rateLimiter.getUsageStats('reddit', 'tenant1')
      expect(stats.currentRequests).toBe(0)
    })
  })

  describe('calculateOptimalDelay', () => {
    it('should calculate reasonable delays', () => {
      const redditDelay = rateLimiter.calculateOptimalDelay('reddit')
      const twitterDelay = rateLimiter.calculateOptimalDelay('twitter')
      
      // Reddit allows 600 requests/hour, so delay should be around 6 seconds
      expect(redditDelay).toBeGreaterThan(1000) // At least 1 second
      expect(redditDelay).toBeLessThan(10000) // Less than 10 seconds
      
      // Twitter allows 300 requests/hour, so delay should be around 12 seconds
      expect(twitterDelay).toBeGreaterThan(redditDelay) // Should be longer than Reddit
    })

    it('should include jitter', () => {
      const delay1 = rateLimiter.calculateOptimalDelay('reddit')
      const delay2 = rateLimiter.calculateOptimalDelay('reddit')
      
      // Due to jitter, delays should be different
      expect(delay1).not.toBe(delay2)
    })
  })

  describe('canUseBurst', () => {
    it('should allow burst when under burst limit', () => {
      const canBurst = rateLimiter.canUseBurst('reddit', 'tenant1')
      expect(canBurst).toBe(true)
    })

    it('should deny burst when over burst limit', async () => {
      const key = 'reddit:tenant1'
      const usage = rateLimiter['getUsage'](key)
      
      // Add requests within the last minute to exceed burst limit
      const now = Date.now()
      for (let i = 0; i < 65; i++) { // Reddit burst limit is 60
        usage.requests.push(now - i * 500) // Within last 30 seconds
      }

      const canBurst = rateLimiter.canUseBurst('reddit', 'tenant1')
      expect(canBurst).toBe(false)
    })

    it('should return false for platforms without burst limits', () => {
      rateLimiter.setLimit('no-burst', { requestsPerHour: 100 })
      
      const canBurst = rateLimiter.canUseBurst('no-burst', 'tenant1')
      expect(canBurst).toBe(false)
    })
  })
})