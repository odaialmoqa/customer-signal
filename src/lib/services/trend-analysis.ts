import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { Database } from '@/lib/types/database'

type ConversationRow = Database['public']['Tables']['conversations']['Row']

export interface TrendingTopic {
  id: string
  theme: string
  keywords: string[]
  relevanceScore: number
  conversationCount: number
  sentimentDistribution: {
    positive: number
    negative: number
    neutral: number
  }
  platforms: string[]
  timeRange: {
    start: string
    end: string
  }
  conversations: ConversationRow[]
  emergingTrend: boolean
  trendDirection: 'rising' | 'falling' | 'stable'
  peakTimestamp?: string
}

export interface StoryCluster {
  id: string
  title: string
  summary: string
  mainTheme: string
  subThemes: string[]
  relevanceScore: number
  conversationIds: string[]
  platforms: string[]
  timeSpan: {
    start: string
    end: string
  }
  sentimentEvolution: Array<{
    timestamp: string
    sentiment: 'positive' | 'negative' | 'neutral'
    count: number
  }>
  keyPhrases: string[]
  crossPlatformLinks: Array<{
    platform1: string
    platform2: string
    sharedKeywords: string[]
    linkStrength: number
  }>
}

export interface TrendAnalysisResult {
  trendingTopics: TrendingTopic[]
  storyClusters: StoryCluster[]
  emergingThemes: string[]
  decliningSentiments: Array<{
    theme: string
    sentimentChange: number
    timeframe: string
  }>
  crossPlatformInsights: Array<{
    theme: string
    platforms: string[]
    correlationStrength: number
  }>
}

export interface TrendAnalysisOptions {
  timeRange?: {
    start: string
    end: string
  }
  minConversationCount?: number
  minRelevanceScore?: number
  platforms?: string[]
  keywords?: string[]
  includeEmergingTrends?: boolean
  maxResults?: number
}

export class TrendAnalysisService {
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
   * Analyze trends and surface stories for a tenant
   */
  async analyzeTrends(
    tenantId: string,
    options: TrendAnalysisOptions = {}
  ): Promise<TrendAnalysisResult> {
    const {
      timeRange,
      minConversationCount = 5,
      minRelevanceScore = 0.3,
      platforms,
      keywords,
      includeEmergingTrends = true,
      maxResults = 20
    } = options

    // Get conversations for analysis
    const conversations = await this.getConversationsForAnalysis(
      tenantId,
      timeRange,
      platforms,
      keywords
    )

    // Detect trending topics
    const trendingTopics = await this.detectTrendingTopics(
      conversations,
      minConversationCount,
      minRelevanceScore,
      maxResults
    )

    // Create story clusters
    const storyClusters = await this.createStoryClusters(
      conversations,
      trendingTopics,
      maxResults
    )

    // Identify emerging themes
    const emergingThemes = includeEmergingTrends
      ? await this.identifyEmergingThemes(conversations, trendingTopics)
      : []

    // Analyze sentiment changes
    const decliningSentiments = await this.analyzeSentimentChanges(
      conversations,
      trendingTopics
    )

    // Find cross-platform insights
    const crossPlatformInsights = await this.findCrossPlatformInsights(
      conversations,
      trendingTopics
    )

    return {
      trendingTopics,
      storyClusters,
      emergingThemes,
      decliningSentiments,
      crossPlatformInsights
    }
  }

  /**
   * Get trending topics for a specific time period
   */
  async getTrendingTopics(
    tenantId: string,
    options: TrendAnalysisOptions = {}
  ): Promise<TrendingTopic[]> {
    const result = await this.analyzeTrends(tenantId, options)
    return result.trendingTopics
  }

  /**
   * Get story clusters for narrative analysis
   */
  async getStoryClusters(
    tenantId: string,
    options: TrendAnalysisOptions = {}
  ): Promise<StoryCluster[]> {
    const result = await this.analyzeTrends(tenantId, options)
    return result.storyClusters
  }

  /**
   * Find conversations related to a specific trend
   */
  async getRelatedConversations(
    tenantId: string,
    trendId: string,
    limit: number = 50
  ): Promise<ConversationRow[]> {
    // This would typically use the trend analysis results stored in cache/database
    // For now, we'll implement a basic keyword-based search
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to get related conversations: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get conversations for trend analysis
   */
  private async getConversationsForAnalysis(
    tenantId: string,
    timeRange?: { start: string; end: string },
    platforms?: string[],
    keywords?: string[]
  ): Promise<ConversationRow[]> {
    let query = this.supabase
      .from('conversations')
      .select('*')
      .eq('tenant_id', tenantId)
      .not('content', 'is', null)
      .order('timestamp', { ascending: false })

    if (timeRange) {
      query = query
        .gte('timestamp', timeRange.start)
        .lte('timestamp', timeRange.end)
    }

    if (platforms?.length) {
      query = query.in('platform', platforms)
    }

    if (keywords?.length) {
      query = query.overlaps('keywords', keywords)
    }

    const { data, error } = await query.limit(10000) // Reasonable limit for analysis

    if (error) {
      throw new Error(`Failed to get conversations for analysis: ${error.message}`)
    }

    return data || []
  }

  /**
   * Detect trending topics using keyword frequency and temporal analysis
   */
  private async detectTrendingTopics(
    conversations: ConversationRow[],
    minConversationCount: number,
    minRelevanceScore: number,
    maxResults: number
  ): Promise<TrendingTopic[]> {
    // Group conversations by keywords and analyze frequency
    const keywordGroups = new Map<string, ConversationRow[]>()
    const keywordCounts = new Map<string, number>()

    conversations.forEach(conv => {
      if (conv.keywords) {
        conv.keywords.forEach(keyword => {
          if (!keywordGroups.has(keyword)) {
            keywordGroups.set(keyword, [])
            keywordCounts.set(keyword, 0)
          }
          keywordGroups.get(keyword)!.push(conv)
          keywordCounts.set(keyword, keywordCounts.get(keyword)! + 1)
        })
      }
    })

    const trendingTopics: TrendingTopic[] = []

    for (const [keyword, convs] of keywordGroups.entries()) {
      if (convs.length < minConversationCount) continue

      const relevanceScore = this.calculateRelevanceScore(convs, conversations.length)
      if (relevanceScore < minRelevanceScore) continue

      const sentimentDistribution = this.calculateSentimentDistribution(convs)
      const platforms = [...new Set(convs.map(c => c.platform))]
      const timeRange = this.getTimeRange(convs)
      const trendDirection = this.calculateTrendDirection(convs)
      const emergingTrend = this.isEmergingTrend(convs)

      trendingTopics.push({
        id: `trend_${keyword}_${Date.now()}`,
        theme: keyword,
        keywords: [keyword],
        relevanceScore,
        conversationCount: convs.length,
        sentimentDistribution,
        platforms,
        timeRange,
        conversations: convs.slice(0, 10), // Limit for performance
        emergingTrend,
        trendDirection,
        peakTimestamp: this.findPeakTimestamp(convs)
      })
    }

    // Sort by relevance score and return top results
    return trendingTopics
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults)
  }

  /**
   * Create story clusters by grouping related conversations
   */
  private async createStoryClusters(
    conversations: ConversationRow[],
    trendingTopics: TrendingTopic[],
    maxResults: number
  ): Promise<StoryCluster[]> {
    const clusters: StoryCluster[] = []

    // Group conversations by similar themes and time proximity
    const themeGroups = new Map<string, ConversationRow[]>()

    trendingTopics.forEach(topic => {
      const relatedConversations = conversations.filter(conv =>
        conv.keywords?.some(keyword => topic.keywords.includes(keyword))
      )

      if (relatedConversations.length >= 3) {
        const clusterId = `cluster_${topic.theme}_${Date.now()}`
        const timeSpan = this.getTimeRange(relatedConversations)
        const platforms = [...new Set(relatedConversations.map(c => c.platform))]
        const sentimentEvolution = this.calculateSentimentEvolution(relatedConversations)
        const keyPhrases = this.extractKeyPhrases(relatedConversations)
        const crossPlatformLinks = this.findCrossPlatformLinks(relatedConversations)

        clusters.push({
          id: clusterId,
          title: `${topic.theme} Discussion`,
          summary: this.generateClusterSummary(relatedConversations, topic.theme),
          mainTheme: topic.theme,
          subThemes: this.identifySubThemes(relatedConversations),
          relevanceScore: topic.relevanceScore,
          conversationIds: relatedConversations.map(c => c.id),
          platforms,
          timeSpan,
          sentimentEvolution,
          keyPhrases,
          crossPlatformLinks
        })
      }
    })

    return clusters
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults)
  }

  /**
   * Identify emerging themes that are gaining traction
   */
  private async identifyEmergingThemes(
    conversations: ConversationRow[],
    trendingTopics: TrendingTopic[]
  ): Promise<string[]> {
    const emergingThemes: string[] = []

    // Look for keywords that are appearing more frequently in recent conversations
    const recentConversations = conversations
      .filter(c => c.timestamp && new Date(c.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .slice(0, 1000)

    const recentKeywords = new Map<string, number>()
    recentConversations.forEach(conv => {
      conv.keywords?.forEach(keyword => {
        recentKeywords.set(keyword, (recentKeywords.get(keyword) || 0) + 1)
      })
    })

    // Compare with existing trending topics to find new themes
    const existingThemes = new Set(trendingTopics.map(t => t.theme))

    for (const [keyword, count] of recentKeywords.entries()) {
      if (!existingThemes.has(keyword) && count >= 3) {
        emergingThemes.push(keyword)
      }
    }

    return emergingThemes.slice(0, 10) // Limit to top 10 emerging themes
  }

  /**
   * Analyze sentiment changes over time for topics
   */
  private async analyzeSentimentChanges(
    conversations: ConversationRow[],
    trendingTopics: TrendingTopic[]
  ): Promise<Array<{ theme: string; sentimentChange: number; timeframe: string }>> {
    const sentimentChanges: Array<{ theme: string; sentimentChange: number; timeframe: string }> = []

    trendingTopics.forEach(topic => {
      const topicConversations = conversations.filter(conv =>
        conv.keywords?.some(keyword => topic.keywords.includes(keyword))
      )

      const sentimentChange = this.calculateSentimentChange(topicConversations)
      if (Math.abs(sentimentChange) > 0.1) { // Significant change threshold
        sentimentChanges.push({
          theme: topic.theme,
          sentimentChange,
          timeframe: '7d' // Could be made configurable
        })
      }
    })

    return sentimentChanges.sort((a, b) => Math.abs(b.sentimentChange) - Math.abs(a.sentimentChange))
  }

  /**
   * Find insights that span multiple platforms
   */
  private async findCrossPlatformInsights(
    conversations: ConversationRow[],
    trendingTopics: TrendingTopic[]
  ): Promise<Array<{ theme: string; platforms: string[]; correlationStrength: number }>> {
    const crossPlatformInsights: Array<{ theme: string; platforms: string[]; correlationStrength: number }> = []

    trendingTopics.forEach(topic => {
      if (topic.platforms.length > 1) {
        const correlationStrength = this.calculateCrossPlatformCorrelation(
          conversations,
          topic.keywords,
          topic.platforms
        )

        if (correlationStrength > 0.3) {
          crossPlatformInsights.push({
            theme: topic.theme,
            platforms: topic.platforms,
            correlationStrength
          })
        }
      }
    })

    return crossPlatformInsights.sort((a, b) => b.correlationStrength - a.correlationStrength)
  }

  // Helper methods for calculations

  private calculateRelevanceScore(conversations: ConversationRow[], totalConversations: number): number {
    const frequency = conversations.length / totalConversations
    const recency = this.calculateRecencyScore(conversations)
    const engagement = this.calculateEngagementScore(conversations)
    const sentiment = this.calculateSentimentScore(conversations)

    return (frequency * 0.3 + recency * 0.3 + engagement * 0.2 + sentiment * 0.2)
  }

  private calculateRecencyScore(conversations: ConversationRow[]): number {
    const now = Date.now()
    const recentConversations = conversations.filter(c => {
      if (!c.timestamp) return false
      const timestamp = new Date(c.timestamp).getTime()
      return (now - timestamp) < (7 * 24 * 60 * 60 * 1000) // Last 7 days
    })

    return recentConversations.length / conversations.length
  }

  private calculateEngagementScore(conversations: ConversationRow[]): number {
    let totalEngagement = 0
    let validConversations = 0

    conversations.forEach(conv => {
      if (conv.engagement_metrics && typeof conv.engagement_metrics === 'object') {
        const metrics = conv.engagement_metrics as any
        const engagement = (metrics.likes || 0) + (metrics.shares || 0) + (metrics.comments || 0)
        totalEngagement += engagement
        validConversations++
      }
    })

    return validConversations > 0 ? Math.min(totalEngagement / validConversations / 100, 1) : 0
  }

  private calculateSentimentScore(conversations: ConversationRow[]): number {
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 }
    
    conversations.forEach(conv => {
      if (conv.sentiment) {
        sentimentCounts[conv.sentiment]++
      }
    })

    const total = conversations.length
    if (total === 0) return 0

    // Higher score for more positive sentiment
    return (sentimentCounts.positive * 1 + sentimentCounts.neutral * 0.5) / total
  }

  private calculateSentimentDistribution(conversations: ConversationRow[]) {
    const distribution = { positive: 0, negative: 0, neutral: 0 }
    
    conversations.forEach(conv => {
      if (conv.sentiment) {
        distribution[conv.sentiment]++
      }
    })

    return distribution
  }

  private getTimeRange(conversations: ConversationRow[]) {
    const timestamps = conversations
      .map(c => c.timestamp)
      .filter(t => t !== null)
      .map(t => new Date(t!).getTime())
      .sort((a, b) => a - b)

    return {
      start: timestamps.length > 0 ? new Date(timestamps[0]).toISOString() : new Date().toISOString(),
      end: timestamps.length > 0 ? new Date(timestamps[timestamps.length - 1]).toISOString() : new Date().toISOString()
    }
  }

  private calculateTrendDirection(conversations: ConversationRow[]): 'rising' | 'falling' | 'stable' {
    const now = Date.now()
    const oneDayAgo = now - (24 * 60 * 60 * 1000)
    const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000)

    const recentCount = conversations.filter(c => 
      c.timestamp && new Date(c.timestamp).getTime() > oneDayAgo
    ).length

    const previousCount = conversations.filter(c => 
      c.timestamp && 
      new Date(c.timestamp).getTime() > twoDaysAgo && 
      new Date(c.timestamp).getTime() <= oneDayAgo
    ).length

    if (recentCount > previousCount * 1.2) return 'rising'
    if (recentCount < previousCount * 0.8) return 'falling'
    return 'stable'
  }

  private isEmergingTrend(conversations: ConversationRow[]): boolean {
    const now = Date.now()
    const threeDaysAgo = now - (3 * 24 * 60 * 60 * 1000)
    
    const recentConversations = conversations.filter(c =>
      c.timestamp && new Date(c.timestamp).getTime() > threeDaysAgo
    )

    // Consider it emerging if most conversations are recent
    return recentConversations.length / conversations.length > 0.7
  }

  private findPeakTimestamp(conversations: ConversationRow[]): string | undefined {
    // Group by day and find the day with most conversations
    const dailyCounts = new Map<string, number>()
    
    conversations.forEach(conv => {
      if (conv.timestamp) {
        const day = new Date(conv.timestamp).toISOString().split('T')[0]
        dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1)
      }
    })

    let maxCount = 0
    let peakDay = ''
    
    for (const [day, count] of dailyCounts.entries()) {
      if (count > maxCount) {
        maxCount = count
        peakDay = day
      }
    }

    return peakDay ? `${peakDay}T12:00:00Z` : undefined
  }

  private calculateSentimentEvolution(conversations: ConversationRow[]) {
    const evolution: Array<{ timestamp: string; sentiment: 'positive' | 'negative' | 'neutral'; count: number }> = []
    
    // Group by day and sentiment
    const dailySentiment = new Map<string, Map<string, number>>()
    
    conversations.forEach(conv => {
      if (conv.timestamp && conv.sentiment) {
        const day = new Date(conv.timestamp).toISOString().split('T')[0]
        if (!dailySentiment.has(day)) {
          dailySentiment.set(day, new Map())
        }
        const dayMap = dailySentiment.get(day)!
        dayMap.set(conv.sentiment, (dayMap.get(conv.sentiment) || 0) + 1)
      }
    })

    for (const [day, sentiments] of dailySentiment.entries()) {
      for (const [sentiment, count] of sentiments.entries()) {
        evolution.push({
          timestamp: `${day}T12:00:00Z`,
          sentiment: sentiment as 'positive' | 'negative' | 'neutral',
          count
        })
      }
    }

    return evolution.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  }

  private extractKeyPhrases(conversations: ConversationRow[]): string[] {
    const phrases = new Map<string, number>()
    
    conversations.forEach(conv => {
      // Simple key phrase extraction - could be enhanced with NLP
      const words = conv.content.toLowerCase().split(/\s+/)
      for (let i = 0; i < words.length - 1; i++) {
        const phrase = `${words[i]} ${words[i + 1]}`
        if (phrase.length > 5) { // Filter out very short phrases
          phrases.set(phrase, (phrases.get(phrase) || 0) + 1)
        }
      }
    })

    return Array.from(phrases.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([phrase]) => phrase)
  }

  private findCrossPlatformLinks(conversations: ConversationRow[]) {
    const platformKeywords = new Map<string, Set<string>>()
    
    conversations.forEach(conv => {
      if (!platformKeywords.has(conv.platform)) {
        platformKeywords.set(conv.platform, new Set())
      }
      conv.keywords?.forEach(keyword => {
        platformKeywords.get(conv.platform)!.add(keyword)
      })
    })

    const links: Array<{
      platform1: string
      platform2: string
      sharedKeywords: string[]
      linkStrength: number
    }> = []

    const platforms = Array.from(platformKeywords.keys())
    for (let i = 0; i < platforms.length; i++) {
      for (let j = i + 1; j < platforms.length; j++) {
        const platform1 = platforms[i]
        const platform2 = platforms[j]
        const keywords1 = platformKeywords.get(platform1)!
        const keywords2 = platformKeywords.get(platform2)!
        
        const sharedKeywords = Array.from(keywords1).filter(k => keywords2.has(k))
        if (sharedKeywords.length > 0) {
          const linkStrength = sharedKeywords.length / Math.max(keywords1.size, keywords2.size)
          links.push({
            platform1,
            platform2,
            sharedKeywords,
            linkStrength
          })
        }
      }
    }

    return links.sort((a, b) => b.linkStrength - a.linkStrength)
  }

  private generateClusterSummary(conversations: ConversationRow[], theme: string): string {
    const platforms = [...new Set(conversations.map(c => c.platform))]
    const sentimentCounts = this.calculateSentimentDistribution(conversations)
    const dominantSentiment = Object.entries(sentimentCounts)
      .sort((a, b) => b[1] - a[1])[0][0]

    return `${conversations.length} conversations about ${theme} across ${platforms.join(', ')} with predominantly ${dominantSentiment} sentiment`
  }

  private identifySubThemes(conversations: ConversationRow[]): string[] {
    const allKeywords = new Set<string>()
    conversations.forEach(conv => {
      conv.keywords?.forEach(keyword => allKeywords.add(keyword))
    })
    
    return Array.from(allKeywords).slice(0, 5) // Top 5 sub-themes
  }

  private calculateSentimentChange(conversations: ConversationRow[]): number {
    const now = Date.now()
    const threeDaysAgo = now - (3 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000)

    const recentConversations = conversations.filter(c =>
      c.timestamp && new Date(c.timestamp).getTime() > threeDaysAgo
    )
    const olderConversations = conversations.filter(c =>
      c.timestamp && 
      new Date(c.timestamp).getTime() <= threeDaysAgo &&
      new Date(c.timestamp).getTime() > sevenDaysAgo
    )

    const recentPositive = recentConversations.filter(c => c.sentiment === 'positive').length
    const recentTotal = recentConversations.length
    const olderPositive = olderConversations.filter(c => c.sentiment === 'positive').length
    const olderTotal = olderConversations.length

    if (recentTotal === 0 || olderTotal === 0) return 0

    const recentRatio = recentPositive / recentTotal
    const olderRatio = olderPositive / olderTotal

    return recentRatio - olderRatio
  }

  private calculateCrossPlatformCorrelation(
    conversations: ConversationRow[],
    keywords: string[],
    platforms: string[]
  ): number {
    const platformConversations = new Map<string, ConversationRow[]>()
    
    platforms.forEach(platform => {
      platformConversations.set(platform, [])
    })

    conversations.forEach(conv => {
      if (platforms.includes(conv.platform) && 
          conv.keywords?.some(k => keywords.includes(k))) {
        platformConversations.get(conv.platform)!.push(conv)
      }
    })

    // Calculate correlation based on temporal patterns
    const platformTimestamps = new Map<string, number[]>()
    
    for (const [platform, convs] of platformConversations.entries()) {
      const timestamps = convs
        .map(c => c.timestamp ? new Date(c.timestamp).getTime() : 0)
        .filter(t => t > 0)
        .sort((a, b) => a - b)
      
      platformTimestamps.set(platform, timestamps)
    }

    // Simple correlation calculation - could be enhanced
    let totalCorrelation = 0
    let comparisons = 0

    for (let i = 0; i < platforms.length; i++) {
      for (let j = i + 1; j < platforms.length; j++) {
        const timestamps1 = platformTimestamps.get(platforms[i]) || []
        const timestamps2 = platformTimestamps.get(platforms[j]) || []
        
        if (timestamps1.length > 0 && timestamps2.length > 0) {
          // Calculate temporal overlap
          const overlap = this.calculateTemporalOverlap(timestamps1, timestamps2)
          totalCorrelation += overlap
          comparisons++
        }
      }
    }

    return comparisons > 0 ? totalCorrelation / comparisons : 0
  }

  private calculateTemporalOverlap(timestamps1: number[], timestamps2: number[]): number {
    const oneDay = 24 * 60 * 60 * 1000
    let overlaps = 0
    
    timestamps1.forEach(t1 => {
      const hasOverlap = timestamps2.some(t2 => Math.abs(t1 - t2) < oneDay)
      if (hasOverlap) overlaps++
    })

    return overlaps / Math.max(timestamps1.length, timestamps2.length)
  }
}

export const trendAnalysisService = new TrendAnalysisService()