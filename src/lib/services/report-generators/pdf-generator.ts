import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ReportData, ReportConfig, ExecutiveSummary } from '@/lib/types/report'
import { format } from 'date-fns'

export class PDFReportGenerator {
  private doc: jsPDF
  private pageHeight: number
  private pageWidth: number
  private margin: number = 20
  private currentY: number = 20

  constructor() {
    this.doc = new jsPDF()
    this.pageHeight = this.doc.internal.pageSize.height
    this.pageWidth = this.doc.internal.pageSize.width
  }

  async generateReport(data: ReportData, config: ReportConfig): Promise<Buffer> {
    this.addHeader(config.name, data.dateRange)
    this.addExecutiveSummary(data.summary)
    this.addConversationVolumeSection(data)
    this.addSentimentAnalysisSection(data)
    this.addKeywordPerformanceSection(data)
    this.addPlatformBreakdownSection(data)
    this.addInsightsAndRecommendations(data.summary)
    this.addFooter()

    return Buffer.from(this.doc.output('arraybuffer'))
  }

  private addHeader(reportName: string, dateRange: any): void {
    // Company logo placeholder
    this.doc.setFontSize(24)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('CustomerSignal', this.margin, this.currentY)
    
    this.currentY += 15
    this.doc.setFontSize(18)
    this.doc.text(reportName, this.margin, this.currentY)
    
    this.currentY += 10
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'normal')
    const dateRangeText = `${format(new Date(dateRange.start), 'MMM dd, yyyy')} - ${format(new Date(dateRange.end), 'MMM dd, yyyy')}`
    this.doc.text(dateRangeText, this.margin, this.currentY)
    
    this.currentY += 5
    this.doc.text(`Generated on ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, this.margin, this.currentY)
    
    this.currentY += 20
    this.addHorizontalLine()
  }

  private addExecutiveSummary(summary: ExecutiveSummary): void {
    this.addSectionTitle('Executive Summary')
    
    if (!summary) {
      this.doc.text('No summary data available', this.margin, this.currentY)
      this.currentY += 10
      return
    }
    
    // Key metrics in a grid
    const totalConversations = summary.totalConversations || 0
    const sentimentBreakdown = summary.sentimentBreakdown || { positive: 0, negative: 0, neutral: 0 }
    const total = sentimentBreakdown.positive + sentimentBreakdown.negative + sentimentBreakdown.neutral || 1
    
    const metrics = [
      ['Total Conversations', totalConversations.toLocaleString()],
      ['Positive Sentiment', `${Math.round((sentimentBreakdown.positive / total) * 100)}%`],
      ['Negative Sentiment', `${Math.round((sentimentBreakdown.negative / total) * 100)}%`],
      ['Top Platform', summary.platformBreakdown?.[0]?.platform || 'N/A']
    ]

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Metric', 'Value']],
      body: metrics,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      margin: { left: this.margin, right: this.margin },
      styles: { fontSize: 10 }
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 15
  }

  private addConversationVolumeSection(data: ReportData): void {
    this.checkPageBreak(60)
    this.addSectionTitle('Conversation Volume Analysis')
    
    const volumeData = data.metrics['conversation-volume'] || []
    
    this.doc.setFontSize(10)
    this.doc.text(`Total conversations captured: ${volumeData.length}`, this.margin, this.currentY)
    this.currentY += 10
    
    // Daily breakdown table
    const dailyBreakdown = this.aggregateByDay(volumeData)
    const tableData = Object.entries(dailyBreakdown).map(([date, count]) => [
      format(new Date(date), 'MMM dd, yyyy'),
      count.toString()
    ])

    if (tableData.length > 0) {
      autoTable(this.doc, {
        startY: this.currentY,
        head: [['Date', 'Conversations']],
        body: tableData.slice(0, 10), // Show last 10 days
        theme: 'striped',
        headStyles: { fillColor: [52, 152, 219] },
        margin: { left: this.margin, right: this.margin },
        styles: { fontSize: 9 }
      })
      this.currentY = (this.doc as any).lastAutoTable.finalY + 15
    }
  }

  private addSentimentAnalysisSection(data: ReportData): void {
    this.checkPageBreak(80)
    this.addSectionTitle('Sentiment Analysis')
    
    const sentimentData = data.metrics['sentiment-distribution'] || []
    const breakdown = data.summary.sentimentBreakdown
    
    // Sentiment breakdown table
    const sentimentTable = [
      ['Positive', breakdown.positive.toString(), `${Math.round((breakdown.positive / (breakdown.positive + breakdown.negative + breakdown.neutral)) * 100)}%`],
      ['Negative', breakdown.negative.toString(), `${Math.round((breakdown.negative / (breakdown.positive + breakdown.negative + breakdown.neutral)) * 100)}%`],
      ['Neutral', breakdown.neutral.toString(), `${Math.round((breakdown.neutral / (breakdown.positive + breakdown.negative + breakdown.neutral)) * 100)}%`]
    ]

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Sentiment', 'Count', 'Percentage']],
      body: sentimentTable,
      theme: 'grid',
      headStyles: { fillColor: [46, 204, 113] },
      margin: { left: this.margin, right: this.margin },
      styles: { fontSize: 10 }
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 15
  }

  private addKeywordPerformanceSection(data: ReportData): void {
    this.checkPageBreak(100)
    this.addSectionTitle('Keyword Performance')
    
    const topKeywords = data.summary.topKeywords.slice(0, 10)
    
    if (topKeywords.length > 0) {
      const keywordTable = topKeywords.map(k => [
        k.keyword,
        k.mentions.toString(),
        k.sentiment > 0 ? 'Positive' : k.sentiment < 0 ? 'Negative' : 'Neutral'
      ])

      autoTable(this.doc, {
        startY: this.currentY,
        head: [['Keyword', 'Mentions', 'Avg Sentiment']],
        body: keywordTable,
        theme: 'striped',
        headStyles: { fillColor: [155, 89, 182] },
        margin: { left: this.margin, right: this.margin },
        styles: { fontSize: 9 }
      })

      this.currentY = (this.doc as any).lastAutoTable.finalY + 15
    }
  }

  private addPlatformBreakdownSection(data: ReportData): void {
    this.checkPageBreak(80)
    this.addSectionTitle('Platform Distribution')
    
    const platformData = data.summary.platformBreakdown.slice(0, 8)
    
    if (platformData.length > 0) {
      const platformTable = platformData.map(p => [
        p.platform,
        p.conversations.toString(),
        `${p.percentage}%`
      ])

      autoTable(this.doc, {
        startY: this.currentY,
        head: [['Platform', 'Conversations', 'Percentage']],
        body: platformTable,
        theme: 'grid',
        headStyles: { fillColor: [230, 126, 34] },
        margin: { left: this.margin, right: this.margin },
        styles: { fontSize: 10 }
      })

      this.currentY = (this.doc as any).lastAutoTable.finalY + 15
    }
  }

  private addInsightsAndRecommendations(summary: ExecutiveSummary): void {
    this.checkPageBreak(100)
    
    // Key Insights
    this.addSectionTitle('Key Insights')
    summary.keyInsights.forEach((insight, index) => {
      this.doc.setFontSize(10)
      this.doc.text(`• ${insight}`, this.margin, this.currentY)
      this.currentY += 8
    })
    
    this.currentY += 10
    
    // Recommendations
    this.addSectionTitle('Recommendations')
    summary.recommendations.forEach((recommendation, index) => {
      this.doc.setFontSize(10)
      this.doc.text(`• ${recommendation}`, this.margin, this.currentY)
      this.currentY += 8
    })
  }

  private addSectionTitle(title: string): void {
    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(title, this.margin, this.currentY)
    this.currentY += 15
    this.doc.setFont('helvetica', 'normal')
  }

  private addHorizontalLine(): void {
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY)
    this.currentY += 10
  }

  private checkPageBreak(requiredSpace: number): void {
    if (this.currentY + requiredSpace > this.pageHeight - this.margin) {
      this.doc.addPage()
      this.currentY = this.margin
    }
  }

  private addFooter(): void {
    const pageCount = this.doc.getNumberOfPages()
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i)
      this.doc.setFontSize(8)
      this.doc.setFont('helvetica', 'normal')
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth - this.margin - 20,
        this.pageHeight - 10
      )
      this.doc.text(
        'Generated by CustomerSignal',
        this.margin,
        this.pageHeight - 10
      )
    }
  }

  private aggregateByDay(conversations: any[]): Record<string, number> {
    return conversations.reduce((acc, conv) => {
      const date = format(new Date(conv.created_at), 'yyyy-MM-dd')
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {})
  }
}