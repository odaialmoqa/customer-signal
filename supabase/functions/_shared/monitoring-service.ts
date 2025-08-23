import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PlatformAdapter } from './platform-adapters/base-adapter.ts'
import { RedditAdapter } from './platform-adapters/reddit-adapter.ts'
import { TwitterAdapter } from './platform-adapters/twitter-adapter.ts'
import { LinkedInAdapter } from './platform-adapters/linkedin-adapter.ts'
import { YouTubeAdapter } from './platform-adapters/youtube-adapter.ts'
import { InstagramAdapter } from './platform-adapters/instagram-adapter.ts'
import { TikTokAdapter } from './platform-adapters/tiktok-adapter.ts'
import { NewsAdapter } from './platform-adapters/news-adapter.ts'
import { ForumAdapter } from './platform-adapters/forum-adapter.ts'
import { RSSAdapter } from './platform-adapters/rss-adapter.ts'
import { ReviewAdapter } from './platform-adapters/review-adapter.ts'
import { BingNewsAdapter } from './platform-adapters/bing-news-adapter.ts'
import { GoogleAlertsAdapter } from './platform-adapters/google-alerts-adapter.ts'
import { MentionAdapter } from './platform-adapters/mention-adapter.ts'
import { Brand24Adapter } from './platform-adapters/brand24-adapter.ts'
import { GoogleTrendsAdapter } from './platform-adapters/google-trends-adapter.ts'
import { BrandwatchAdapter } from './platform-adapters/brandwatch-adapter.ts'
import { HootsuiteAdapter } from './platform-adapters/hootsuite-adapter.ts'
import { SproutSocialAdapter } from './platform-adapters/sprout-social-adapter.ts'
import { BuzzSumoAdapter } from './platform-adapters/buzzsumo-adapter.ts'
import { AdvancedAdapterWrapper } from './platform-adapters/advanced-adapter-wrapper.ts'
import { ContentNormalizer } from './content-normalizer.ts'
import { RateLimiter } from './rate-limiter.ts'

export interface MonitoringStatus {
  keywordId: string
  keyword: string
  isActive: boolean
  lastScan: string | null
  platforms: string[]
  nextScan: string | null
}

export interface ScanResult {
  platform: string
  mentions: NormalizedContent[]
  errors: string[]
}

export interface NormalizedContent {
  id: string
  content: string
  author: string
  platform: string
  url: string
  timestamp: string
  engagement: {
    likes: number
    shares: number
    comments: number
  }
  metadata: Record<string, any>
}

export class MonitoringService {
  private supabase: SupabaseClient
  private adapters: Map<string, PlatformAdapter>
  private contentNormalizer: ContentNormalizer
  private rateLimiter: RateLimiter

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
    this.contentNormalizer = new ContentNormalizer()
    this.rateLimiter = new RateLimiter()
    
    // Initialize platform adapters
    this.adapters = new Map([
      ['reddit', new RedditAdapter()],
      ['twitter', new TwitterAdapter()],
      ['linkedin', new LinkedInAdapter()],
      ['youtube', new YouTubeAdapter()],
      ['instagram', new InstagramAdapter()],
      ['tiktok', new TikTokAdapter()],
      ['news', new NewsAdapter()],
      ['forum', new ForumAdapter()],
      ['rss', new RSSAdapter()],
      ['reviews', new ReviewAdapter()],
      ['bing-news', new BingNewsAdapter()],
      ['google-alerts', new GoogleAlertsAdapter()],
      // Advanced monitoring and analytics APIs (wrapped for compatibility)
      ['mention', new AdvancedAdapterWrapper(
        new MentionAdapter({ 
          apiToken: Deno.env.get('MENTION_API_TOKEN') || '',
          rateLimitPerMinute: 60 
        }), true
      )],
      ['brand24', new AdvancedAdapterWrapper(
        new Brand24Adapter({ 
          apiToken: Deno.env.get('BRAND24_API_TOKEN') || '',
          rateLimitPerMinute: 60 
        }), true
      )],
      ['google-trends', new AdvancedAdapterWrapper(
        new GoogleTrendsAdapter({ 
          region: 'US',
          language: 'en',
          rateLimitPerMinute: 60 
        }), false
      )],
      ['brandwatch', new AdvancedAdapterWrapper(
        new BrandwatchAdapter({ 
          username: Deno.env.get('BRANDWATCH_USERNAME') || '',
          password: Deno.env.get('BRANDWATCH_PASSWORD') || '',
          clientId: Deno.env.get('BRANDWATCH_CLIENT_ID') || '',
          clientSecret: Deno.env.get('BRANDWATCH_CLIENT_SECRET') || '',
          rateLimitPerMinute: 60 
        }), true
      )],
      ['hootsuite', new AdvancedAdapterWrapper(
        new HootsuiteAdapter({ 
          accessToken: Deno.env.get('HOOTSUITE_ACCESS_TOKEN') || '',
          refreshToken: Deno.env.get('HOOTSUITE_REFRESH_TOKEN') || '',
          clientId: Deno.env.get('HOOTSUITE_CLIENT_ID') || '',
          clientSecret: Deno.env.get('HOOTSUITE_CLIENT_SECRET') || '',
          rateLimitPerMinute: 60 
        }), true
      )],
      ['sprout-social', new AdvancedAdapterWrapper(
        new SproutSocialAdapter({ 
          accessToken: Deno.env.get('SPROUT_SOCIAL_ACCESS_TOKEN') || '',
          customerId: Deno.env.get('SPROUT_SOCIAL_CUSTOMER_ID') || '',
          rateLimitPerMinute: 60 
        }), true
      )],
      ['buzzsumo', new AdvancedAdapterWrapper(
        new BuzzSumoAdapter({ 
          apiKey: Deno.env.get('BUZZSUMO_API_KEY') || '',
          rateLimitPerMinute: 60 
        }), true
      )],
    ])
  }

  async startMonitoring(keywordId: string, tenantId: string): Promise<void> {
    // Get keyword details
    const { data: keyword, error } = await this.supabase
      .from('keywords')
      .select('*')
      .eq('id', keywordId)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !keyword) {
      throw new Error('Keyword not found')
    }

    // Update keyword status to active
    await this.supabase
      .from('keywords')
      .update({ 
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', keywordId)
      .eq('tenant_id', tenantId)

    // Create or update monitoring job
    await this.scheduleMonitoringJob(keyword)
  }

  async stopMonitoring(keywordId: string, tenantId: string): Promise<void> {
    // Update keyword status to inactive
    await this.supabase
      .from('keywords')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', keywordId)
      .eq('tenant_id', tenantId)

    // Remove monitoring job
    await this.removeMonitoringJob(keywordId)
  }

  async scanKeyword(keywordId: string, tenantId: string, platforms?: string[]): Promise<ScanResult[]> {
    // Get keyword details
    const { data: keyword, error } = await this.supabase
      .from('keywords')
      .select('*')
      .eq('id', keywordId)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !keyword) {
      throw new Error('Keyword not found')
    }

    const platformsToScan = platforms || keyword.platforms
    const results: ScanResult[] = []

    // Scan each platform
    for (const platform of platformsToScan) {
      try {
        // Check rate limits
        await this.rateLimiter.checkLimit(platform, tenantId)

        const adapter = this.adapters.get(platform)
        if (!adapter) {
          results.push({
            platform,
            mentions: [],
            errors: [`No adapter available for platform: ${platform}`]
          })
          continue
        }

        // Perform the scan
        const rawContent = await adapter.search(keyword.term, {
          limit: 50,
          since: this.getLastScanTime(keywordId, platform)
        })

        // Normalize content
        const normalizedContent = rawContent.map(content => 
          this.contentNormalizer.normalize(content, platform)
        )

        // Store results
        await this.storeConversations(normalizedContent, keywordId, tenantId)

        results.push({
          platform,
          mentions: normalizedContent,
          errors: []
        })

        // Update rate limiter
        await this.rateLimiter.recordRequest(platform, tenantId)

      } catch (error) {
        console.error(`Error scanning ${platform}:`, error)
        results.push({
          platform,
          mentions: [],
          errors: [error.message]
        })
      }
    }

    // Update last scan time
    await this.updateLastScanTime(keywordId, platformsToScan)

    return results
  }

  async getMonitoringStatus(tenantId: string): Promise<MonitoringStatus[]> {
    const { data: keywords, error } = await this.supabase
      .from('keywords')
      .select(`
        id,
        term,
        is_active,
        platforms,
        monitoring_frequency,
        updated_at
      `)
      .eq('tenant_id', tenantId)

    if (error) {
      throw new Error(`Failed to get monitoring status: ${error.message}`)
    }

    return keywords.map(keyword => ({
      keywordId: keyword.id,
      keyword: keyword.term,
      isActive: keyword.is_active,
      lastScan: keyword.updated_at,
      platforms: keyword.platforms,
      nextScan: this.calculateNextScan(keyword.monitoring_frequency, keyword.updated_at)
    }))
  }

  private async scheduleMonitoringJob(keyword: any): Promise<void> {
    // In a real implementation, this would integrate with a job scheduler
    // For now, we'll store the job configuration in the database
    await this.supabase
      .from('monitoring_jobs')
      .upsert({
        keyword_id: keyword.id,
        tenant_id: keyword.tenant_id,
        frequency: keyword.monitoring_frequency,
        platforms: keyword.platforms,
        is_active: true,
        next_run: this.calculateNextRun(keyword.monitoring_frequency),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
  }

  private async removeMonitoringJob(keywordId: string): Promise<void> {
    await this.supabase
      .from('monitoring_jobs')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('keyword_id', keywordId)
  }

  private async storeConversations(conversations: NormalizedContent[], keywordId: string, tenantId: string): Promise<void> {
    if (conversations.length === 0) return

    const conversationData = conversations.map(conv => ({
      id: conv.id,
      keyword_id: keywordId,
      tenant_id: tenantId,
      content: conv.content,
      author: conv.author,
      platform: conv.platform,
      url: conv.url,
      timestamp: conv.timestamp,
      engagement_metrics: conv.engagement,
      metadata: conv.metadata,
      created_at: new Date().toISOString()
    }))

    // Use upsert to handle duplicates
    await this.supabase
      .from('conversations')
      .upsert(conversationData, { onConflict: 'id' })
  }

  private getLastScanTime(keywordId: string, platform: string): string {
    // Get the last scan time for this keyword/platform combination
    // This would typically be stored in the database
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    return oneHourAgo.toISOString()
  }

  private async updateLastScanTime(keywordId: string, platforms: string[]): Promise<void> {
    const now = new Date().toISOString()
    
    // Update the monitoring job's last run time
    await this.supabase
      .from('monitoring_jobs')
      .update({
        last_run: now,
        next_run: this.calculateNextRun('hourly'), // This should be dynamic based on frequency
        updated_at: now
      })
      .eq('keyword_id', keywordId)
  }

  private calculateNextScan(frequency: string, lastScan: string): string {
    const last = new Date(lastScan)
    switch (frequency) {
      case 'realtime':
        return new Date(last.getTime() + 5 * 60 * 1000).toISOString() // 5 minutes
      case 'hourly':
        return new Date(last.getTime() + 60 * 60 * 1000).toISOString() // 1 hour
      case 'daily':
        return new Date(last.getTime() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      default:
        return new Date(last.getTime() + 60 * 60 * 1000).toISOString() // Default to 1 hour
    }
  }

  private calculateNextRun(frequency: string): string {
    const now = new Date()
    switch (frequency) {
      case 'realtime':
        return new Date(now.getTime() + 5 * 60 * 1000).toISOString() // 5 minutes
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000).toISOString() // 1 hour
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      default:
        return new Date(now.getTime() + 60 * 60 * 1000).toISOString() // Default to 1 hour
    }
  }
}