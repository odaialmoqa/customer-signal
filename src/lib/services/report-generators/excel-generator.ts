import ExcelJS from 'exceljs'
import { ReportData, ReportConfig, ExecutiveSummary } from '@/lib/types/report'
import { format } from 'date-fns'

export class ExcelReportGenerator {
  private workbook: ExcelJS.Workbook

  constructor() {
    this.workbook = new ExcelJS.Workbook()
    this.workbook.creator = 'CustomerSignal'
    this.workbook.created = new Date()
  }

  async generateReport(data: ReportData, config: ReportConfig): Promise<Buffer> {
    this.addSummarySheet(data, config)
    this.addConversationDataSheet(data)
    this.addSentimentAnalysisSheet(data)
    this.addKeywordPerformanceSheet(data)
    this.addPlatformBreakdownSheet(data)
    this.addRawDataSheet(data)

    return await this.workbook.xlsx.writeBuffer() as Buffer
  }

  private addSummarySheet(data: ReportData, config: ReportConfig): void {
    const worksheet = this.workbook.addWorksheet('Executive Summary')
    
    // Set column widths
    worksheet.columns = [
      { width: 25 },
      { width: 20 },
      { width: 30 }
    ]

    // Header
    this.addSheetHeader(worksheet, config.name, data.dateRange)
    
    let currentRow = 6

    // Key Metrics Section
    worksheet.getCell(`A${currentRow}`).value = 'Key Metrics'
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 }
    currentRow += 2

    const metrics = [
      ['Total Conversations', data.summary.totalConversations.toLocaleString()],
      ['Positive Sentiment', `${Math.round((data.summary.sentimentBreakdown.positive / (data.summary.sentimentBreakdown.positive + data.summary.sentimentBreakdown.negative + data.summary.sentimentBreakdown.neutral)) * 100)}%`],
      ['Negative Sentiment', `${Math.round((data.summary.sentimentBreakdown.negative / (data.summary.sentimentBreakdown.positive + data.summary.sentimentBreakdown.negative + data.summary.sentimentBreakdown.neutral)) * 100)}%`],
      ['Neutral Sentiment', `${Math.round((data.summary.sentimentBreakdown.neutral / (data.summary.sentimentBreakdown.positive + data.summary.sentimentBreakdown.negative + data.summary.sentimentBreakdown.neutral)) * 100)}%`],
      ['Top Platform', data.summary.platformBreakdown[0]?.platform || 'N/A'],
      ['Top Keyword', data.summary.topKeywords[0]?.keyword || 'N/A']
    ]

    metrics.forEach(([metric, value]) => {
      worksheet.getCell(`A${currentRow}`).value = metric
      worksheet.getCell(`B${currentRow}`).value = value
      worksheet.getCell(`A${currentRow}`).font = { bold: true }
      currentRow++
    })

    currentRow += 2

    // Top Keywords Section
    worksheet.getCell(`A${currentRow}`).value = 'Top Keywords'
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 }
    currentRow += 1

    worksheet.getCell(`A${currentRow}`).value = 'Keyword'
    worksheet.getCell(`B${currentRow}`).value = 'Mentions'
    worksheet.getCell(`C${currentRow}`).value = 'Avg Sentiment'
    worksheet.getRow(currentRow).font = { bold: true }
    currentRow++

    data.summary.topKeywords.slice(0, 10).forEach(keyword => {
      worksheet.getCell(`A${currentRow}`).value = keyword.keyword
      worksheet.getCell(`B${currentRow}`).value = keyword.mentions
      worksheet.getCell(`C${currentRow}`).value = keyword.sentiment > 0 ? 'Positive' : keyword.sentiment < 0 ? 'Negative' : 'Neutral'
      currentRow++
    })

    currentRow += 2

    // Key Insights Section
    worksheet.getCell(`A${currentRow}`).value = 'Key Insights'
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 }
    currentRow += 1

    data.summary.keyInsights.forEach(insight => {
      worksheet.getCell(`A${currentRow}`).value = `• ${insight}`
      worksheet.getCell(`A${currentRow}`).alignment = { wrapText: true }
      currentRow++
    })

    currentRow += 2

    // Recommendations Section
    worksheet.getCell(`A${currentRow}`).value = 'Recommendations'
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 }
    currentRow += 1

    data.summary.recommendations.forEach(recommendation => {
      worksheet.getCell(`A${currentRow}`).value = `• ${recommendation}`
      worksheet.getCell(`A${currentRow}`).alignment = { wrapText: true }
      currentRow++
    })

    // Apply styling
    this.applyTableStyling(worksheet, 8, 3, metrics.length)
  }

  private addConversationDataSheet(data: ReportData): void {
    const worksheet = this.workbook.addWorksheet('Conversation Volume')
    
    // Headers
    const headers = ['Date', 'Conversations', 'Positive', 'Negative', 'Neutral']
    worksheet.addRow(headers)
    worksheet.getRow(1).font = { bold: true }

    // Aggregate data by day
    const dailyData = this.aggregateConversationsByDay(data.metrics['conversation-volume'] || [])
    
    Object.entries(dailyData).forEach(([date, stats]) => {
      worksheet.addRow([
        format(new Date(date), 'yyyy-MM-dd'),
        stats.total,
        stats.positive,
        stats.negative,
        stats.neutral
      ])
    })

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15
    })

    // Apply table styling
    this.applyTableStyling(worksheet, 1, headers.length, Object.keys(dailyData).length + 1)
  }

  private addSentimentAnalysisSheet(data: ReportData): void {
    const worksheet = this.workbook.addWorksheet('Sentiment Analysis')
    
    // Sentiment breakdown
    worksheet.addRow(['Sentiment Distribution'])
    worksheet.getRow(1).font = { bold: true, size: 14 }
    
    worksheet.addRow(['Sentiment', 'Count', 'Percentage'])
    worksheet.getRow(2).font = { bold: true }

    const breakdown = data.summary.sentimentBreakdown
    const total = breakdown.positive + breakdown.negative + breakdown.neutral

    const sentimentData = [
      ['Positive', breakdown.positive, `${Math.round((breakdown.positive / total) * 100)}%`],
      ['Negative', breakdown.negative, `${Math.round((breakdown.negative / total) * 100)}%`],
      ['Neutral', breakdown.neutral, `${Math.round((breakdown.neutral / total) * 100)}%`]
    ]

    sentimentData.forEach(row => worksheet.addRow(row))

    // Sentiment over time
    worksheet.addRow([])
    worksheet.addRow(['Sentiment Trends Over Time'])
    worksheet.getRow(7).font = { bold: true, size: 14 }

    const sentimentOverTime = this.aggregateSentimentByDay(data.metrics['sentiment-distribution'] || [])
    
    worksheet.addRow(['Date', 'Positive', 'Negative', 'Neutral'])
    worksheet.getRow(8).font = { bold: true }

    Object.entries(sentimentOverTime).forEach(([date, sentiment]) => {
      worksheet.addRow([
        format(new Date(date), 'yyyy-MM-dd'),
        sentiment.positive,
        sentiment.negative,
        sentiment.neutral
      ])
    })

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15
    })

    // Apply styling
    this.applyTableStyling(worksheet, 2, 3, 4)
    this.applyTableStyling(worksheet, 8, 4, Object.keys(sentimentOverTime).length + 1)
  }

  private addKeywordPerformanceSheet(data: ReportData): void {
    const worksheet = this.workbook.addWorksheet('Keyword Performance')
    
    const headers = ['Keyword', 'Total Mentions', 'Positive', 'Negative', 'Neutral', 'Avg Sentiment Score']
    worksheet.addRow(headers)
    worksheet.getRow(1).font = { bold: true }

    // Get keyword performance data
    const keywordData = data.metrics['keyword-performance'] || []
    
    keywordData.forEach((keyword: any) => {
      worksheet.addRow([
        keyword.keyword,
        keyword.mentions,
        keyword.positive_mentions || 0,
        keyword.negative_mentions || 0,
        keyword.neutral_mentions || 0,
        keyword.avg_sentiment || 0
      ])
    })

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 18
    })

    // Apply styling
    this.applyTableStyling(worksheet, 1, headers.length, keywordData.length + 1)
  }

  private addPlatformBreakdownSheet(data: ReportData): void {
    const worksheet = this.workbook.addWorksheet('Platform Breakdown')
    
    const headers = ['Platform', 'Conversations', 'Percentage', 'Avg Sentiment']
    worksheet.addRow(headers)
    worksheet.getRow(1).font = { bold: true }

    data.summary.platformBreakdown.forEach(platform => {
      worksheet.addRow([
        platform.platform,
        platform.conversations,
        `${platform.percentage}%`,
        'N/A' // Would calculate from actual data
      ])
    })

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15
    })

    // Apply styling
    this.applyTableStyling(worksheet, 1, headers.length, data.summary.platformBreakdown.length + 1)
  }

  private addRawDataSheet(data: ReportData): void {
    const worksheet = this.workbook.addWorksheet('Raw Data')
    
    const headers = [
      'ID', 'Content', 'Author', 'Platform', 'URL', 'Timestamp', 
      'Sentiment', 'Keywords', 'Tags', 'Engagement'
    ]
    worksheet.addRow(headers)
    worksheet.getRow(1).font = { bold: true }

    // Add raw conversation data (limited to prevent huge files)
    const rawData = data.rawData.slice(0, 1000) // Limit to 1000 rows
    
    rawData.forEach((conversation: any) => {
      const createdAt = conversation.created_at ? new Date(conversation.created_at) : new Date()
      const formattedDate = isNaN(createdAt.getTime()) ? 'Invalid Date' : format(createdAt, 'yyyy-MM-dd HH:mm:ss')
      
      worksheet.addRow([
        conversation.id || '',
        conversation.content?.substring(0, 200) + (conversation.content?.length > 200 ? '...' : '') || '',
        conversation.author || '',
        conversation.platform || '',
        conversation.url || '',
        formattedDate,
        conversation.sentiment || '',
        Array.isArray(conversation.keywords) ? conversation.keywords.join(', ') : (conversation.keywords || ''),
        Array.isArray(conversation.tags) ? conversation.tags.join(', ') : (conversation.tags || ''),
        conversation.engagement_score || 0
      ])
    })

    // Set column widths
    worksheet.getColumn(1).width = 10 // ID
    worksheet.getColumn(2).width = 50 // Content
    worksheet.getColumn(3).width = 20 // Author
    worksheet.getColumn(4).width = 15 // Platform
    worksheet.getColumn(5).width = 30 // URL
    worksheet.getColumn(6).width = 20 // Timestamp
    worksheet.getColumn(7).width = 12 // Sentiment
    worksheet.getColumn(8).width = 30 // Keywords
    worksheet.getColumn(9).width = 20 // Tags
    worksheet.getColumn(10).width = 12 // Engagement

    // Apply styling
    this.applyTableStyling(worksheet, 1, headers.length, Math.min(rawData.length + 1, 1001))
  }

  private addSheetHeader(worksheet: ExcelJS.Worksheet, reportName: string, dateRange: any): void {
    worksheet.getCell('A1').value = 'CustomerSignal Report'
    worksheet.getCell('A1').font = { bold: true, size: 16 }
    
    worksheet.getCell('A2').value = reportName
    worksheet.getCell('A2').font = { bold: true, size: 14 }
    
    worksheet.getCell('A3').value = `${format(new Date(dateRange.start), 'MMM dd, yyyy')} - ${format(new Date(dateRange.end), 'MMM dd, yyyy')}`
    worksheet.getCell('A3').font = { size: 12 }
    
    worksheet.getCell('A4').value = `Generated on ${format(new Date(), 'MMM dd, yyyy HH:mm')}`
    worksheet.getCell('A4').font = { size: 10, italic: true }
  }

  private applyTableStyling(worksheet: ExcelJS.Worksheet, startRow: number, columnCount: number, rowCount: number): void {
    // Apply borders and alternating row colors
    for (let row = startRow; row < startRow + rowCount; row++) {
      for (let col = 1; col <= columnCount; col++) {
        const cell = worksheet.getCell(row, col)
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
        
        // Alternating row colors (skip header)
        if (row > startRow && (row - startRow) % 2 === 0) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8F9FA' }
          }
        }
      }
    }
  }

  private aggregateConversationsByDay(conversations: any[]): Record<string, any> {
    return conversations.reduce((acc, conv) => {
      const date = format(new Date(conv.created_at), 'yyyy-MM-dd')
      if (!acc[date]) {
        acc[date] = { total: 0, positive: 0, negative: 0, neutral: 0 }
      }
      acc[date].total++
      if (conv.sentiment === 'positive') acc[date].positive++
      else if (conv.sentiment === 'negative') acc[date].negative++
      else acc[date].neutral++
      return acc
    }, {})
  }

  private aggregateSentimentByDay(sentimentData: any[]): Record<string, any> {
    return sentimentData.reduce((acc, item) => {
      const date = format(new Date(item.created_at), 'yyyy-MM-dd')
      if (!acc[date]) {
        acc[date] = { positive: 0, negative: 0, neutral: 0 }
      }
      acc[date][item.sentiment]++
      return acc
    }, {})
  }
}