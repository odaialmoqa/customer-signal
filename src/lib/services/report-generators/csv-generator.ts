import { ReportData, ReportConfig } from '@/lib/types/report'
import { format } from 'date-fns'

export class CSVReportGenerator {
  async generateReport(data: ReportData, config: ReportConfig): Promise<Buffer> {
    const csvContent = this.generateCSVContent(data, config)
    return Buffer.from(csvContent, 'utf-8')
  }

  private generateCSVContent(data: ReportData, config: ReportConfig): string {
    const sections: string[] = []

    // Header
    sections.push(this.generateHeader(config, data))
    sections.push('') // Empty line

    // Executive Summary
    sections.push(this.generateExecutiveSummary(data.summary))
    sections.push('') // Empty line

    // Conversation Data
    sections.push(this.generateConversationData(data.rawData))
    sections.push('') // Empty line

    // Keyword Performance
    sections.push(this.generateKeywordPerformance(data.summary.topKeywords))
    sections.push('') // Empty line

    // Platform Breakdown
    sections.push(this.generatePlatformBreakdown(data.summary.platformBreakdown))

    return sections.join('\n')
  }

  private generateHeader(config: ReportConfig, data: ReportData): string {
    const lines = [
      `Report Name,${this.escapeCSV(config.name)}`,
      `Date Range,${format(new Date(data.dateRange.start), 'yyyy-MM-dd')} to ${format(new Date(data.dateRange.end), 'yyyy-MM-dd')}`,
      `Generated On,${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`,
      `Total Conversations,${data.summary.totalConversations}`
    ]
    return lines.join('\n')
  }

  private generateExecutiveSummary(summary: any): string {
    const lines = ['EXECUTIVE SUMMARY']
    
    // Sentiment breakdown
    lines.push('Sentiment,Count,Percentage')
    const total = summary.sentimentBreakdown.positive + summary.sentimentBreakdown.negative + summary.sentimentBreakdown.neutral
    lines.push(`Positive,${summary.sentimentBreakdown.positive},${Math.round((summary.sentimentBreakdown.positive / total) * 100)}%`)
    lines.push(`Negative,${summary.sentimentBreakdown.negative},${Math.round((summary.sentimentBreakdown.negative / total) * 100)}%`)
    lines.push(`Neutral,${summary.sentimentBreakdown.neutral},${Math.round((summary.sentimentBreakdown.neutral / total) * 100)}%`)
    
    lines.push('') // Empty line
    
    // Key insights
    lines.push('KEY INSIGHTS')
    summary.keyInsights.forEach((insight: string) => {
      lines.push(this.escapeCSV(insight))
    })
    
    lines.push('') // Empty line
    
    // Recommendations
    lines.push('RECOMMENDATIONS')
    summary.recommendations.forEach((recommendation: string) => {
      lines.push(this.escapeCSV(recommendation))
    })

    return lines.join('\n')
  }

  private generateConversationData(conversations: any[]): string {
    const lines = ['CONVERSATION DATA']
    lines.push('ID,Content,Author,Platform,URL,Timestamp,Sentiment,Keywords,Tags,Engagement')
    
    // Limit to prevent huge CSV files
    const limitedConversations = conversations.slice(0, 1000)
    
    limitedConversations.forEach(conv => {
      const row = [
        this.escapeCSV(conv.id || ''),
        this.escapeCSV((conv.content || '').substring(0, 500)), // Limit content length
        this.escapeCSV(conv.author || ''),
        this.escapeCSV(conv.platform || ''),
        this.escapeCSV(conv.url || ''),
        format(new Date(conv.created_at || new Date()), 'yyyy-MM-dd HH:mm:ss'),
        this.escapeCSV(conv.sentiment || ''),
        this.escapeCSV(Array.isArray(conv.keywords) ? conv.keywords.join('; ') : (conv.keywords || '')),
        this.escapeCSV(Array.isArray(conv.tags) ? conv.tags.join('; ') : (conv.tags || '')),
        conv.engagement_score || 0
      ]
      lines.push(row.join(','))
    })

    return lines.join('\n')
  }

  private generateKeywordPerformance(keywords: any[]): string {
    const lines = ['KEYWORD PERFORMANCE']
    lines.push('Keyword,Mentions,Average Sentiment')
    
    if (!keywords || !Array.isArray(keywords)) {
      lines.push('No keyword data available')
      return lines.join('\n')
    }
    
    keywords.forEach(keyword => {
      const row = [
        this.escapeCSV(keyword.keyword || ''),
        keyword.mentions || 0,
        keyword.sentiment > 0 ? 'Positive' : keyword.sentiment < 0 ? 'Negative' : 'Neutral'
      ]
      lines.push(row.join(','))
    })

    return lines.join('\n')
  }

  private generatePlatformBreakdown(platforms: any[]): string {
    const lines = ['PLATFORM BREAKDOWN']
    lines.push('Platform,Conversations,Percentage')
    
    platforms.forEach(platform => {
      const row = [
        this.escapeCSV(platform.platform),
        platform.conversations,
        `${platform.percentage}%`
      ]
      lines.push(row.join(','))
    })

    return lines.join('\n')
  }

  private escapeCSV(value: string): string {
    if (typeof value !== 'string') {
      return String(value)
    }
    
    // If the value contains comma, newline, or quote, wrap in quotes and escape internal quotes
    if (value.includes(',') || value.includes('\n') || value.includes('\r') || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    
    return value
  }
}