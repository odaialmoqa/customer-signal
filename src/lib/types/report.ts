export interface ReportConfig {
  id: string
  name: string
  description?: string
  tenantId: string
  templateType: ReportTemplateType
  dataRange: DateRange
  filters: ReportFilters
  metrics: ReportMetric[]
  visualizations: ReportVisualization[]
  format: ReportFormat[]
  schedule?: ReportSchedule
  recipients?: string[]
  createdAt: Date
  updatedAt: Date
}

export interface ReportTemplate {
  id: string
  name: string
  description: string
  type: ReportTemplateType
  sections: ReportSection[]
  defaultMetrics: ReportMetric[]
  isSystem: boolean
  createdAt: Date
}

export type ReportTemplateType = 
  | 'executive-summary'
  | 'detailed-analytics'
  | 'sentiment-analysis'
  | 'keyword-performance'
  | 'platform-comparison'
  | 'trend-analysis'
  | 'custom'

export interface DateRange {
  start: Date
  end: Date
  preset?: 'last-7-days' | 'last-30-days' | 'last-90-days' | 'last-year' | 'custom'
}

export interface ReportFilters {
  keywords?: string[]
  platforms?: string[]
  sentiment?: ('positive' | 'negative' | 'neutral')[]
  tags?: string[]
  authors?: string[]
  minEngagement?: number
}

export type ReportMetric = 
  | 'conversation-volume'
  | 'sentiment-distribution'
  | 'platform-breakdown'
  | 'keyword-performance'
  | 'engagement-metrics'
  | 'trend-analysis'
  | 'top-mentions'
  | 'response-time'

export type ReportVisualization = 
  | 'line-chart'
  | 'bar-chart'
  | 'pie-chart'
  | 'table'
  | 'heatmap'
  | 'word-cloud'
  | 'timeline'

export type ReportFormat = 'pdf' | 'excel' | 'csv'

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  dayOfWeek?: number // 0-6 for weekly
  dayOfMonth?: number // 1-31 for monthly
  time: string // HH:MM format
  timezone: string
  isActive: boolean
}

export interface ReportSection {
  id: string
  title: string
  type: 'summary' | 'chart' | 'table' | 'text' | 'insights'
  order: number
  config: Record<string, any>
}

export interface GeneratedReport {
  id: string
  configId: string
  tenantId: string
  format: ReportFormat
  status: 'generating' | 'completed' | 'failed'
  filePath?: string
  fileSize?: number
  generatedAt: Date
  expiresAt: Date
  downloadCount: number
  error?: string
}

export interface ReportData {
  summary: ExecutiveSummary
  metrics: Record<ReportMetric, any>
  visualizations: Record<string, any>
  rawData: any[]
  generatedAt: Date
  dateRange: DateRange
}

export interface ExecutiveSummary {
  totalConversations: number
  sentimentBreakdown: {
    positive: number
    negative: number
    neutral: number
  }
  topKeywords: Array<{
    keyword: string
    mentions: number
    sentiment: number
  }>
  platformBreakdown: Array<{
    platform: string
    conversations: number
    percentage: number
  }>
  keyInsights: string[]
  recommendations: string[]
  trendHighlights: string[]
}

export interface ReportGenerationJob {
  id: string
  reportConfigId: string
  tenantId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  startedAt?: Date
  completedAt?: Date
  error?: string
}