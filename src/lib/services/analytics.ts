import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { Database } from '@/lib/types/database'
import { analyticsCache } from '@/lib/utils/analytics-cache'

export interface TrendData {
  keyword: string
  platform: string
  timeBucket: string
  positiveCount: number
  negativeCount: number
  neutralCount: number
  totalCount: number
  sentimentScore: number
}

export interface KeywordFrequency {
  keyword: string
  frequency: number
  platforms: string[]
  sentimentDistribution: Record<string, number>
  firstSeen: string
  lastSeen: string
  trendDirection: 'rising' | 'falling' | 'stable'
}

export interface ConversationCluster {
  clusterId: string
  conversationIds: string[]
  sharedKeywords: string[]
  platforms: string[]
  sentimentDistribution: Record<string, number>
  timeSpan: {
    start: string
    end: string
  }
  conversationCount: number
}

export interface CrossPlatformPattern {
  keyword: string
  platform1: string
  platform2: string
  sharedConversations: number
  correlationStrength: number
  temporalOverlap: number
}

export interface EmergingTheme {
  keyword: string
  recentCount: number
  previousCount: number
  growthRate: number
  platforms: string[]
  sentimentTrend: number
}

export interface PlatformDistribution {
  platform: string
  count: number
  percentage: number
  sentimentBreakdown: {
    positive: number
    negative: number
    neutral: number
  }
}

export interface KeywordPerformance {
  keyword: string
  totalMentions: number
  averageSentiment: number
  platforms: string[]
  recentTrend: 'up' | 'down' | 'stable'
  engagementScore: number
}

export interface DashboardMetrics {
  totalConversations: number
  sentimentDistribution: {
    positive: number
    negative: number
    neutral: number
  }
  platformDistribution: PlatformDistribution[]
  topKeywords: KeywordPerformance[]
  recentTrends: TrendData[]
  emergingThemes: EmergingTheme[]
  timeRange: {
    start: string
    end: string
  }
}

export interface AnalyticsFilters {
  startDate?: string
  endDate?: string
  keywords?: string[]
  platforms?: string[]
  sentiments?: ('positive' | 'negative' | 'neutral')[]
  intervalType?: 'hour' | 'day' | 'week' | 'month'
}

export class AnalyticsService {
  private supabase: any

  constructor(supabaseClient?: any) {
    if (supabaseClient) {
      this.supabase = supabaseClient
    } else {
      // Use browser client by default
      this.supabase = createBrowserClient()
    }
  }

  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics(
    tenantId: string,
    filters: AnalyticsFilters = {}
  ): Promise<DashboardMetrics> {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString(),
      keywords,
      platforms,
      sentiments
    } = filters

    // Get basic conversation stats
    const { data: statsData, error: statsError } = await this.supabase.rpc('get_conversation_stats', {
      p_tenant_id: tenantId,
      p_start_date: startDate,
      p_end_date: endDate
    })

    if (statsError) {
      throw new Error(`Failed to get conversation stats: ${statsError.message}`)
    }

    const stats = statsData?.[0] || {
      total_conversations: 0,
      positive_count: 0,
      negative_count: 0,
      neutral_count: 0,
      platform_distribution: {},
      daily_counts: {}
    }

    // Get platform distribution with sentiment breakdown
    const platformDistribution = await this.getPlatformDistribution(tenantId, filters)

    // Get top keyword performance
    const topKeywords = await this.getKeywordPerformance(tenantId, filters)

    // Get recent trends
    const recentTrends = await this.getSentimentTrends(tenantId, {
      ...filters,
      intervalType: 'day'
    })

    // Get emerging themes
    const emergingThemes = await this.getEmergingThemes(tenantId)

    return {
      totalConversations: Number(stats.total_conversations),
      sentimentDistribution: {
        positive: Number(stats.positive_count),
        negative: Number(stats.negative_count),
        neutral: Number(stats.neutral_count)
      },
      platformDistribution,
      topKeywords: topKeywords.slice(0, 10),
      recentTrends: recentTrends.slice(0, 20),
      emergingThemes: emergingThemes.slice(0, 5),
      timeRange: {
        start: startDate,
        end: endDate
      }
    }
  }

  /**
   * Get sentiment trends over time
   */
  async getSentimentTrends(
    tenantId: string,
    filters: AnalyticsFilters = {}
  ): Promise<TrendData[]> {
    const {
      keywords,
      platforms,
      startDate,
      endDate,
      intervalType = 'day'
    } = filters

    // Check cache first
    const cacheKey = { tenantId, keywords, platforms, startDate, endDate, intervalType }
    const cached = analyticsCache.get<TrendData[]>('sentiment_trends', cacheKey)
    if (cached) {
      return cached
    }

    const { data, error } = await this.supabase.rpc('get_sentiment_trends', {
      p_tenant_id: tenantId,
      p_keywords: keywords || null,
      p_platforms: platforms || null,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
      p_interval_type: intervalType
    })

    if (error) {
      throw new Error(`Failed to get sentiment trends: ${error.message}`)
    }

    const result = (data || []).map((item: any) => ({
      keyword: item.keyword,
      platform: item.platform,
      timeBucket: item.time_bucket,
      positiveCount: Number(item.positive_count),
      negativeCount: Number(item.negative_count),
      neutralCount: Number(item.neutral_count),
      totalCount: Number(item.total_count),
      sentimentScore: Number(item.sentiment_score)
    }))

    // Cache the result for 2 minutes (trends change frequently)
    analyticsCache.set('sentiment_trends', cacheKey, result, 2 * 60 * 1000)
    return result
  }

  /**
   * Get keyword frequency and trends
   */
  async getKeywordFrequency(
    tenantId: string,
    filters: AnalyticsFilters = {},
    minFrequency: number = 1
  ): Promise<KeywordFrequency[]> {
    const { startDate, endDate, platforms } = filters

    // Check cache first
    const cacheKey = { tenantId, startDate, endDate, platforms, minFrequency }
    const cached = analyticsCache.get<KeywordFrequency[]>('keyword_frequency', cacheKey)
    if (cached) {
      return cached
    }

    const { data, error } = await this.supabase.rpc('get_keyword_frequency', {
      p_tenant_id: tenantId,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
      p_platforms: platforms || null,
      p_min_frequency: minFrequency
    })

    if (error) {
      throw new Error(`Failed to get keyword frequency: ${error.message}`)
    }

    const result = (data || []).map((item: any) => ({
      keyword: item.keyword,
      frequency: Number(item.frequency),
      platforms: item.platforms || [],
      sentimentDistribution: item.sentiment_distribution || {},
      firstSeen: item.first_seen,
      lastSeen: item.last_seen,
      trendDirection: item.trend_direction
    }))

    // Cache for 5 minutes (keyword frequencies are relatively stable)
    analyticsCache.set('keyword_frequency', cacheKey, result, 5 * 60 * 1000)
    return result
  }

  /**
   * Get conversation clusters
   */
  async getConversationClusters(
    tenantId: string,
    filters: AnalyticsFilters = {},
    minClusterSize: number = 3,
    similarityThreshold: number = 0.3
  ): Promise<ConversationCluster[]> {
    const { startDate, endDate } = filters

    const { data, error } = await this.supabase.rpc('get_conversation_clusters', {
      p_tenant_id: tenantId,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
      p_min_cluster_size: minClusterSize,
      p_similarity_threshold: similarityThreshold
    })

    if (error) {
      throw new Error(`Failed to get conversation clusters: ${error.message}`)
    }

    return (data || []).map((item: any) => ({
      clusterId: item.cluster_id,
      conversationIds: item.conversation_ids || [],
      sharedKeywords: item.shared_keywords || [],
      platforms: item.platforms || [],
      sentimentDistribution: item.sentiment_distribution || {},
      timeSpan: item.time_span || { start: '', end: '' },
      conversationCount: Number(item.conversation_count)
    }))
  }

  /**
   * Get cross-platform patterns
   */
  async getCrossPlatformPatterns(
    tenantId: string,
    filters: AnalyticsFilters = {},
    minCorrelation: number = 0.3
  ): Promise<CrossPlatformPattern[]> {
    const { startDate, endDate } = filters

    const { data, error } = await this.supabase.rpc('get_cross_platform_patterns', {
      p_tenant_id: tenantId,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
      p_min_correlation: minCorrelation
    })

    if (error) {
      throw new Error(`Failed to get cross-platform patterns: ${error.message}`)
    }

    return (data || []).map((item: any) => ({
      keyword: item.keyword,
      platform1: item.platform1,
      platform2: item.platform2,
      sharedConversations: Number(item.shared_conversations),
      correlationStrength: Number(item.correlation_strength),
      temporalOverlap: Number(item.temporal_overlap)
    }))
  }

  /**
   * Get emerging themes
   */
  async getEmergingThemes(
    tenantId: string,
    lookbackDays: number = 7,
    comparisonDays: number = 14,
    minGrowthRate: number = 2.0
  ): Promise<EmergingTheme[]> {
    const { data, error } = await this.supabase.rpc('get_emerging_themes', {
      p_tenant_id: tenantId,
      p_lookback_days: lookbackDays,
      p_comparison_days: comparisonDays,
      p_min_growth_rate: minGrowthRate
    })

    if (error) {
      throw new Error(`Failed to get emerging themes: ${error.message}`)
    }

    return (data || []).map((item: any) => ({
      keyword: item.keyword,
      recentCount: Number(item.recent_count),
      previousCount: Number(item.previous_count),
      growthRate: Number(item.growth_rate),
      platforms: item.platforms || [],
      sentimentTrend: Number(item.sentiment_trend)
    }))
  }

  /**
   * Get platform distribution with sentiment breakdown
   */
  async getPlatformDistribution(
    tenantId: string,
    filters: AnalyticsFilters = {}
  ): Promise<PlatformDistribution[]> {
    const { startDate, endDate, keywords, sentiments } = filters

    let query = this.supabase
      .from('conversations')
      .select('platform, sentiment')
      .eq('tenant_id', tenantId)

    if (startDate) {
      query = query.gte('timestamp', startDate)
    }
    if (endDate) {
      query = query.lte('timestamp', endDate)
    }
    if (keywords?.length) {
      query = query.overlaps('keywords', keywords)
    }
    if (sentiments?.length) {
      query = query.in('sentiment', sentiments)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to get platform distribution: ${error.message}`)
    }

    // Process the data to create distribution
    const platformCounts: Record<string, {
      total: number
      positive: number
      negative: number
      neutral: number
    }> = {}

    let totalConversations = 0

    data?.forEach(row => {
      const platform = row.platform
      const sentiment = row.sentiment || 'neutral'

      if (!platformCounts[platform]) {
        platformCounts[platform] = {
          total: 0,
          positive: 0,
          negative: 0,
          neutral: 0
        }
      }

      platformCounts[platform].total++
      platformCounts[platform][sentiment as keyof typeof platformCounts[string]]++
      totalConversations++
    })

    return Object.entries(platformCounts).map(([platform, counts]) => ({
      platform,
      count: counts.total,
      percentage: totalConversations > 0 ? (counts.total / totalConversations) * 100 : 0,
      sentimentBreakdown: {
        positive: counts.positive,
        negative: counts.negative,
        neutral: counts.neutral
      }
    })).sort((a, b) => b.count - a.count)
  }

  /**
   * Get keyword performance metrics
   */
  async getKeywordPerformance(
    tenantId: string,
    filters: AnalyticsFilters = {}
  ): Promise<KeywordPerformance[]> {
    const keywordFrequencies = await this.getKeywordFrequency(tenantId, filters, 2)

    return keywordFrequencies.map(kf => {
      const totalSentiment = Object.entries(kf.sentimentDistribution).reduce(
        (sum, [sentiment, count]) => {
          const score = sentiment === 'positive' ? 1 : sentiment === 'negative' ? -1 : 0
          return sum + (score * count)
        },
        0
      )

      const averageSentiment = kf.frequency > 0 ? totalSentiment / kf.frequency : 0

      // Calculate engagement score based on frequency and platform diversity
      const engagementScore = kf.frequency * (1 + (kf.platforms.length - 1) * 0.2)

      return {
        keyword: kf.keyword,
        totalMentions: kf.frequency,
        averageSentiment,
        platforms: kf.platforms,
        recentTrend: kf.trendDirection === 'rising' ? 'up' : 
                     kf.trendDirection === 'falling' ? 'down' : 'stable',
        engagementScore
      }
    }).sort((a, b) => b.engagementScore - a.engagementScore)
  }

  /**
   * Get time-series data for charts
   */
  async getTimeSeriesData(
    tenantId: string,
    metric: 'conversations' | 'sentiment' | 'keywords',
    filters: AnalyticsFilters = {}
  ): Promise<Array<{ date: string; value: number; breakdown?: Record<string, number> }>> {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString(),
      intervalType = 'day',
      keywords,
      platforms
    } = filters

    if (metric === 'sentiment') {
      const trends = await this.getSentimentTrends(tenantId, filters)
      
      // Group by time bucket and aggregate
      const timeGroups: Record<string, {
        positive: number
        negative: number
        neutral: number
        total: number
      }> = {}

      trends.forEach(trend => {
        const date = trend.timeBucket.split('T')[0] // Get date part
        if (!timeGroups[date]) {
          timeGroups[date] = { positive: 0, negative: 0, neutral: 0, total: 0 }
        }
        timeGroups[date].positive += trend.positiveCount
        timeGroups[date].negative += trend.negativeCount
        timeGroups[date].neutral += trend.neutralCount
        timeGroups[date].total += trend.totalCount
      })

      return Object.entries(timeGroups)
        .map(([date, counts]) => ({
          date,
          value: counts.total,
          breakdown: {
            positive: counts.positive,
            negative: counts.negative,
            neutral: counts.neutral
          }
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }

    // For conversations metric, get daily counts
    let query = this.supabase
      .from('conversations')
      .select('timestamp, platform')
      .eq('tenant_id', tenantId)
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .not('timestamp', 'is', null)

    if (keywords?.length) {
      query = query.overlaps('keywords', keywords)
    }
    if (platforms?.length) {
      query = query.in('platform', platforms)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to get time series data: ${error.message}`)
    }

    // Group by date
    const dateGroups: Record<string, { total: number; platforms: Record<string, number> }> = {}

    data?.forEach(row => {
      const date = new Date(row.timestamp).toISOString().split('T')[0]
      if (!dateGroups[date]) {
        dateGroups[date] = { total: 0, platforms: {} }
      }
      dateGroups[date].total++
      dateGroups[date].platforms[row.platform] = (dateGroups[date].platforms[row.platform] || 0) + 1
    })

    return Object.entries(dateGroups)
      .map(([date, counts]) => ({
        date,
        value: counts.total,
        breakdown: counts.platforms
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }
}

export const analyticsService = new AnalyticsService()