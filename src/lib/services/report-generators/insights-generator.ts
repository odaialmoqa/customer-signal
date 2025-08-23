import { ReportData, ExecutiveSummary } from '@/lib/types/report'
import { format, subDays, differenceInDays } from 'date-fns'

export class InsightsGenerator {
  generateExecutiveSummary(data: ReportData): ExecutiveSummary {
    const conversationData = data.rawData
    const totalConversations = conversationData.length
    
    const sentimentBreakdown = this.calculateSentimentBreakdown(conversationData)
    const topKeywords = this.getTopKeywords(conversationData)
    const platformBreakdown = this.calculatePlatformBreakdown(conversationData)
    
    return {
      totalConversations,
      sentimentBreakdown,
      topKeywords,
      platformBreakdown,
      keyInsights: this.generateKeyInsights(conversationData, data),
      recommendations: this.generateRecommendations(conversationData, data),
      trendHighlights: this.generateTrendHighlights(conversationData, data)
    }
  }

  private calculateSentimentBreakdown(conversations: any[]) {
    return conversations.reduce((acc, conv) => {
      const sentiment = conv.sentiment || 'neutral'
      acc[sentiment] = (acc[sentiment] || 0) + 1
      return acc
    }, { positive: 0, negative: 0, neutral: 0 })
  }

  private getTopKeywords(conversations: any[]) {
    const keywordCounts: Record<string, { mentions: number, sentiment: number[] }> = {}
    
    conversations.forEach(conv => {
      const keywords = Array.isArray(conv.keywords) ? conv.keywords : []
      const sentimentScore = this.getSentimentScore(conv.sentiment)
      
      keywords.forEach(keyword => {
        if (!keywordCounts[keyword]) {
          keywordCounts[keyword] = { mentions: 0, sentiment: [] }
        }
        keywordCounts[keyword].mentions++
        keywordCounts[keyword].sentiment.push(sentimentScore)
      })
    })

    return Object.entries(keywordCounts)
      .map(([keyword, data]) => ({
        keyword,
        mentions: data.mentions,
        sentiment: data.sentiment.reduce((a, b) => a + b, 0) / data.sentiment.length
      }))
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 10)
  }

  private calculatePlatformBreakdown(conversations: any[]) {
    const platformCounts: Record<string, number> = {}
    
    conversations.forEach(conv => {
      const platform = conv.platform || 'unknown'
      platformCounts[platform] = (platformCounts[platform] || 0) + 1
    })

    const total = conversations.length
    return Object.entries(platformCounts)
      .map(([platform, count]) => ({
        platform,
        conversations: count,
        percentage: Math.round((count / total) * 100)
      }))
      .sort((a, b) => b.conversations - a.conversations)
  }

  private generateKeyInsights(conversations: any[], data: ReportData): string[] {
    const insights: string[] = []
    
    // Volume insights
    const totalConversations = conversations.length
    if (totalConversations > 1000) {
      insights.push(`High conversation volume detected with ${totalConversations.toLocaleString()} total mentions`)
    } else if (totalConversations < 50) {
      insights.push(`Low conversation volume with only ${totalConversations} mentions - consider expanding keyword monitoring`)
    }

    // Sentiment insights
    const sentimentBreakdown = this.calculateSentimentBreakdown(conversations)
    const total = sentimentBreakdown.positive + sentimentBreakdown.negative + sentimentBreakdown.neutral
    const positiveRatio = sentimentBreakdown.positive / total
    const negativeRatio = sentimentBreakdown.negative / total

    if (positiveRatio > 0.7) {
      insights.push(`Excellent brand sentiment with ${Math.round(positiveRatio * 100)}% positive mentions`)
    } else if (negativeRatio > 0.4) {
      insights.push(`Concerning negative sentiment trend with ${Math.round(negativeRatio * 100)}% negative mentions requiring attention`)
    } else if (positiveRatio > 0.5) {
      insights.push(`Generally positive brand sentiment with ${Math.round(positiveRatio * 100)}% positive mentions`)
    }

    // Platform insights
    const platformBreakdown = this.calculatePlatformBreakdown(conversations)
    const topPlatform = platformBreakdown[0]
    if (topPlatform && topPlatform.percentage > 50) {
      insights.push(`${topPlatform.platform} dominates conversation volume with ${topPlatform.percentage}% of all mentions`)
    }

    // Engagement insights
    const highEngagementConversations = conversations.filter(c => (c.engagement_score || 0) > 100)
    if (highEngagementConversations.length > 0) {
      insights.push(`${highEngagementConversations.length} high-engagement conversations detected, indicating viral potential`)
    }

    // Temporal insights
    const temporalInsights = this.generateTemporalInsights(conversations, data.dateRange)
    insights.push(...temporalInsights)

    // Keyword insights
    const keywordInsights = this.generateKeywordInsights(conversations)
    insights.push(...keywordInsights)

    return insights.slice(0, 8) // Limit to top 8 insights
  }

  private generateRecommendations(conversations: any[], data: ReportData): string[] {
    const recommendations: string[] = []
    
    const sentimentBreakdown = this.calculateSentimentBreakdown(conversations)
    const total = sentimentBreakdown.positive + sentimentBreakdown.negative + sentimentBreakdown.neutral
    const negativeRatio = sentimentBreakdown.negative / total
    const positiveRatio = sentimentBreakdown.positive / total

    // Sentiment-based recommendations
    if (negativeRatio > 0.3) {
      recommendations.push('Implement proactive customer outreach program to address negative sentiment mentions')
      recommendations.push('Analyze common themes in negative feedback to identify product improvement opportunities')
      recommendations.push('Create response templates for common negative sentiment scenarios')
    }

    if (positiveRatio > 0.6) {
      recommendations.push('Leverage positive sentiment mentions for marketing testimonials and case studies')
      recommendations.push('Engage with positive mentions to build stronger customer relationships')
    }

    // Volume-based recommendations
    if (conversations.length < 100) {
      recommendations.push('Expand keyword monitoring to capture more relevant conversations')
      recommendations.push('Consider adding industry-specific terms and competitor mentions to keyword list')
    }

    // Platform-based recommendations
    const platformBreakdown = this.calculatePlatformBreakdown(conversations)
    const underrepresentedPlatforms = platformBreakdown.filter(p => p.percentage < 5)
    if (underrepresentedPlatforms.length > 0) {
      recommendations.push(`Consider increasing monitoring on underutilized platforms: ${underrepresentedPlatforms.map(p => p.platform).join(', ')}`)
    }

    // Engagement-based recommendations
    const avgEngagement = conversations.reduce((sum, c) => sum + (c.engagement_score || 0), 0) / conversations.length
    if (avgEngagement < 10) {
      recommendations.push('Focus on creating more engaging content to increase conversation participation')
    }

    // Response time recommendations
    const unrespondedNegative = conversations.filter(c => 
      c.sentiment === 'negative' && !c.has_response && (c.engagement_score || 0) > 5
    )
    if (unrespondedNegative.length > 0) {
      recommendations.push(`${unrespondedNegative.length} high-visibility negative mentions need immediate response`)
    }

    return recommendations.slice(0, 6) // Limit to top 6 recommendations
  }

  private generateTrendHighlights(conversations: any[], data: ReportData): string[] {
    const highlights: string[] = []
    
    // Calculate daily conversation volumes
    const dailyVolumes = this.aggregateByDay(conversations)
    const dates = Object.keys(dailyVolumes).sort()
    
    if (dates.length >= 7) {
      const recentWeek = dates.slice(-7)
      const previousWeek = dates.slice(-14, -7)
      
      const recentAvg = recentWeek.reduce((sum, date) => sum + dailyVolumes[date], 0) / recentWeek.length
      const previousAvg = previousWeek.reduce((sum, date) => sum + dailyVolumes[date], 0) / previousWeek.length
      
      if (previousAvg > 0) {
        const change = ((recentAvg - previousAvg) / previousAvg) * 100
        if (Math.abs(change) > 20) {
          const direction = change > 0 ? 'increased' : 'decreased'
          highlights.push(`Conversation volume ${direction} by ${Math.abs(Math.round(change))}% compared to previous week`)
        }
      }
    }

    // Sentiment trends
    const sentimentTrends = this.analyzeSentimentTrends(conversations)
    highlights.push(...sentimentTrends)

    // Peak activity detection
    const peakDays = this.detectPeakActivity(conversations)
    if (peakDays.length > 0) {
      highlights.push(`Peak conversation activity detected on ${peakDays.join(', ')}`)
    }

    // Emerging keywords
    const emergingKeywords = this.detectEmergingKeywords(conversations)
    if (emergingKeywords.length > 0) {
      highlights.push(`Emerging keywords gaining traction: ${emergingKeywords.join(', ')}`)
    }

    return highlights.slice(0, 5) // Limit to top 5 highlights
  }

  private generateTemporalInsights(conversations: any[], dateRange: any): string[] {
    const insights: string[] = []
    
    // Day of week analysis
    const dayOfWeekCounts: Record<string, number> = {}
    conversations.forEach(conv => {
      const dayOfWeek = format(new Date(conv.created_at), 'EEEE')
      dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1
    })

    const sortedDays = Object.entries(dayOfWeekCounts)
      .sort(([,a], [,b]) => b - a)
    
    if (sortedDays.length > 0) {
      const topDay = sortedDays[0]
      const percentage = Math.round((topDay[1] / conversations.length) * 100)
      if (percentage > 25) {
        insights.push(`${topDay[0]} shows highest conversation activity (${percentage}% of total mentions)`)
      }
    }

    return insights
  }

  private generateKeywordInsights(conversations: any[]): string[] {
    const insights: string[] = []
    
    // Find keywords with strong sentiment correlation
    const keywordSentiment = this.analyzeKeywordSentiment(conversations)
    const strongPositive = keywordSentiment.filter(k => k.avgSentiment > 0.5 && k.mentions > 5)
    const strongNegative = keywordSentiment.filter(k => k.avgSentiment < -0.5 && k.mentions > 5)

    if (strongPositive.length > 0) {
      insights.push(`Keywords driving positive sentiment: ${strongPositive.slice(0, 3).map(k => k.keyword).join(', ')}`)
    }

    if (strongNegative.length > 0) {
      insights.push(`Keywords associated with negative sentiment: ${strongNegative.slice(0, 3).map(k => k.keyword).join(', ')}`)
    }

    return insights
  }

  private analyzeSentimentTrends(conversations: any[]): string[] {
    const trends: string[] = []
    
    // Group by day and calculate sentiment
    const dailySentiment: Record<string, { positive: number, negative: number, neutral: number }> = {}
    
    conversations.forEach(conv => {
      const date = format(new Date(conv.created_at), 'yyyy-MM-dd')
      if (!dailySentiment[date]) {
        dailySentiment[date] = { positive: 0, negative: 0, neutral: 0 }
      }
      dailySentiment[date][conv.sentiment || 'neutral']++
    })

    const dates = Object.keys(dailySentiment).sort()
    if (dates.length >= 7) {
      const recentDates = dates.slice(-7)
      const recentPositiveRatio = recentDates.reduce((sum, date) => {
        const day = dailySentiment[date]
        const total = day.positive + day.negative + day.neutral
        return sum + (total > 0 ? day.positive / total : 0)
      }, 0) / recentDates.length

      if (recentPositiveRatio > 0.7) {
        trends.push('Positive sentiment trending upward over the last week')
      } else if (recentPositiveRatio < 0.3) {
        trends.push('Negative sentiment trend detected over the last week')
      }
    }

    return trends
  }

  private detectPeakActivity(conversations: any[]): string[] {
    const dailyVolumes = this.aggregateByDay(conversations)
    const volumes = Object.values(dailyVolumes)
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length
    const threshold = avgVolume * 2 // 2x average is considered peak

    return Object.entries(dailyVolumes)
      .filter(([, volume]) => volume > threshold)
      .map(([date]) => format(new Date(date), 'MMM dd'))
  }

  private detectEmergingKeywords(conversations: any[]): string[] {
    // This would require historical data comparison
    // For now, return keywords that appear frequently in recent conversations
    const recentConversations = conversations
      .filter(c => new Date(c.created_at) > subDays(new Date(), 7))
    
    const keywordCounts: Record<string, number> = {}
    recentConversations.forEach(conv => {
      const keywords = Array.isArray(conv.keywords) ? conv.keywords : []
      keywords.forEach(keyword => {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1
      })
    })

    return Object.entries(keywordCounts)
      .filter(([, count]) => count > 5)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([keyword]) => keyword)
  }

  private analyzeKeywordSentiment(conversations: any[]) {
    const keywordSentiment: Record<string, { mentions: number, sentimentSum: number }> = {}
    
    conversations.forEach(conv => {
      const keywords = Array.isArray(conv.keywords) ? conv.keywords : []
      const sentimentScore = this.getSentimentScore(conv.sentiment)
      
      keywords.forEach(keyword => {
        if (!keywordSentiment[keyword]) {
          keywordSentiment[keyword] = { mentions: 0, sentimentSum: 0 }
        }
        keywordSentiment[keyword].mentions++
        keywordSentiment[keyword].sentimentSum += sentimentScore
      })
    })

    return Object.entries(keywordSentiment)
      .map(([keyword, data]) => ({
        keyword,
        mentions: data.mentions,
        avgSentiment: data.sentimentSum / data.mentions
      }))
      .filter(k => k.mentions > 2) // Only include keywords with multiple mentions
  }

  private aggregateByDay(conversations: any[]): Record<string, number> {
    return conversations.reduce((acc, conv) => {
      const date = format(new Date(conv.created_at), 'yyyy-MM-dd')
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {})
  }

  private getSentimentScore(sentiment: string): number {
    switch (sentiment) {
      case 'positive': return 1
      case 'negative': return -1
      default: return 0
    }
  }
}