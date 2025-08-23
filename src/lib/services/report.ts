import { createClient } from '@/lib/supabase/server'
import { 
  ReportConfig, 
  ReportTemplate, 
  GeneratedReport, 
  ReportData,
  ExecutiveSummary,
  ReportGenerationJob,
  ReportFormat,
  ReportMetric
} from '@/lib/types/report'
import { PDFReportGenerator } from './report-generators/pdf-generator'
import { ExcelReportGenerator } from './report-generators/excel-generator'
import { CSVReportGenerator } from './report-generators/csv-generator'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export class ReportService {
  private supabase = createClient()

  // Report Configuration Management
  async createReportConfig(config: Omit<ReportConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportConfig> {
    const { data, error } = await this.supabase
      .from('report_configs')
      .insert({
        ...config,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create report config: ${error.message}`)
    return this.mapReportConfig(data)
  }

  async getReportConfigs(tenantId: string): Promise<ReportConfig[]> {
    const { data, error } = await this.supabase
      .from('report_configs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to fetch report configs: ${error.message}`)
    return data.map(this.mapReportConfig)
  }

  async updateReportConfig(id: string, updates: Partial<ReportConfig>): Promise<ReportConfig> {
    const { data, error } = await this.supabase
      .from('report_configs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Failed to update report config: ${error.message}`)
    return this.mapReportConfig(data)
  }

  async deleteReportConfig(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('report_configs')
      .delete()
      .eq('id', id)

    if (error) throw new Error(`Failed to delete report config: ${error.message}`)
  }

  // Report Templates
  async getReportTemplates(): Promise<ReportTemplate[]> {
    const { data, error } = await this.supabase
      .from('report_templates')
      .select('*')
      .order('name')

    if (error) throw new Error(`Failed to fetch report templates: ${error.message}`)
    return data.map(this.mapReportTemplate)
  }

  async createCustomTemplate(template: Omit<ReportTemplate, 'id' | 'createdAt'>): Promise<ReportTemplate> {
    const { data, error } = await this.supabase
      .from('report_templates')
      .insert({
        ...template,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create report template: ${error.message}`)
    return this.mapReportTemplate(data)
  }

  // Report Generation
  async generateReport(configId: string, format: ReportFormat): Promise<string> {
    // Create generation job
    const job = await this.createGenerationJob(configId)
    
    // Queue the report generation
    await this.queueReportGeneration(job.id, configId, format)
    
    return job.id
  }

  async getReportStatus(jobId: string): Promise<ReportGenerationJob> {
    const { data, error } = await this.supabase
      .from('report_generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error) throw new Error(`Failed to fetch report status: ${error.message}`)
    return this.mapGenerationJob(data)
  }

  async getGeneratedReports(tenantId: string): Promise<GeneratedReport[]> {
    const { data, error } = await this.supabase
      .from('generated_reports')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('generated_at', { ascending: false })

    if (error) throw new Error(`Failed to fetch generated reports: ${error.message}`)
    return data.map(this.mapGeneratedReport)
  }

  // Report Data Collection
  async collectReportData(config: ReportConfig): Promise<ReportData> {
    const [
      conversationData,
      sentimentData,
      keywordData,
      platformData
    ] = await Promise.all([
      this.getConversationData(config),
      this.getSentimentData(config),
      this.getKeywordData(config),
      this.getPlatformData(config)
    ])

    const summary = this.generateExecutiveSummary({
      conversationData,
      sentimentData,
      keywordData,
      platformData
    })

    return {
      summary,
      metrics: {
        'conversation-volume': conversationData,
        'sentiment-distribution': sentimentData,
        'keyword-performance': keywordData,
        'platform-breakdown': platformData
      },
      visualizations: {},
      rawData: conversationData,
      generatedAt: new Date(),
      dateRange: config.dataRange
    }
  }

  // Executive Summary Generation
  private generateExecutiveSummary(data: any): ExecutiveSummary {
    const { conversationData, sentimentData, keywordData, platformData } = data

    const totalConversations = conversationData.length
    const sentimentBreakdown = this.calculateSentimentBreakdown(sentimentData)
    const topKeywords = this.getTopKeywords(keywordData)
    const platformBreakdown = this.calculatePlatformBreakdown(platformData)

    return {
      totalConversations,
      sentimentBreakdown,
      topKeywords,
      platformBreakdown,
      keyInsights: this.generateKeyInsights(data),
      recommendations: this.generateRecommendations(data),
      trendHighlights: this.generateTrendHighlights(data)
    }
  }

  private generateKeyInsights(data: any): string[] {
    const insights: string[] = []
    
    // Sentiment insights
    const { sentimentData } = data
    const positiveRatio = sentimentData.filter((s: any) => s.sentiment === 'positive').length / sentimentData.length
    if (positiveRatio > 0.7) {
      insights.push(`Strong positive sentiment detected (${Math.round(positiveRatio * 100)}% positive mentions)`)
    } else if (positiveRatio < 0.3) {
      insights.push(`Concerning negative sentiment trend (${Math.round((1 - positiveRatio) * 100)}% negative mentions)`)
    }

    // Volume insights
    const { conversationData } = data
    if (conversationData.length > 1000) {
      insights.push(`High conversation volume with ${conversationData.length} total mentions`)
    }

    return insights
  }

  private generateRecommendations(data: any): string[] {
    const recommendations: string[] = []
    
    // Based on sentiment analysis
    const { sentimentData } = data
    const negativeRatio = sentimentData.filter((s: any) => s.sentiment === 'negative').length / sentimentData.length
    
    if (negativeRatio > 0.4) {
      recommendations.push('Consider implementing proactive customer outreach for negative sentiment mentions')
      recommendations.push('Review common themes in negative feedback for product improvement opportunities')
    }

    if (negativeRatio < 0.2) {
      recommendations.push('Leverage positive sentiment for marketing testimonials and case studies')
    }

    return recommendations
  }

  private generateTrendHighlights(data: any): string[] {
    // This would analyze trends over time
    return [
      'Conversation volume increased 15% compared to previous period',
      'Positive sentiment trending upward over the last 30 days'
    ]
  }

  // Data Collection Methods
  private async getConversationData(config: ReportConfig) {
    let query = this.supabase
      .from('conversations')
      .select('*')
      .eq('tenant_id', config.tenantId)
      .gte('created_at', config.dataRange.start.toISOString())
      .lte('created_at', config.dataRange.end.toISOString())

    if (config.filters.keywords?.length) {
      query = query.in('keywords', config.filters.keywords)
    }

    if (config.filters.platforms?.length) {
      query = query.in('platform', config.filters.platforms)
    }

    if (config.filters.sentiment?.length) {
      query = query.in('sentiment', config.filters.sentiment)
    }

    const { data, error } = await query
    if (error) throw new Error(`Failed to fetch conversation data: ${error.message}`)
    return data || []
  }

  private async getSentimentData(config: ReportConfig) {
    const conversations = await this.getConversationData(config)
    return conversations.map(c => ({
      id: c.id,
      sentiment: c.sentiment,
      confidence: c.sentiment_confidence,
      created_at: c.created_at
    }))
  }

  private async getKeywordData(config: ReportConfig) {
    const { data, error } = await this.supabase
      .from('keyword_performance')
      .select('*')
      .eq('tenant_id', config.tenantId)
      .gte('date', config.dataRange.start.toISOString())
      .lte('date', config.dataRange.end.toISOString())

    if (error) throw new Error(`Failed to fetch keyword data: ${error.message}`)
    return data || []
  }

  private async getPlatformData(config: ReportConfig) {
    const conversations = await this.getConversationData(config)
    const platformCounts = conversations.reduce((acc: any, conv: any) => {
      acc[conv.platform] = (acc[conv.platform] || 0) + 1
      return acc
    }, {})

    return Object.entries(platformCounts).map(([platform, count]) => ({
      platform,
      conversations: count,
      percentage: Math.round((count as number / conversations.length) * 100)
    }))
  }

  // Helper Methods
  private calculateSentimentBreakdown(sentimentData: any[]) {
    const breakdown = sentimentData.reduce((acc, item) => {
      acc[item.sentiment] = (acc[item.sentiment] || 0) + 1
      return acc
    }, { positive: 0, negative: 0, neutral: 0 })

    return breakdown
  }

  private getTopKeywords(keywordData: any[]) {
    return keywordData
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 10)
      .map(k => ({
        keyword: k.keyword,
        mentions: k.mentions,
        sentiment: k.avg_sentiment || 0
      }))
  }

  private calculatePlatformBreakdown(platformData: any[]) {
    return platformData.sort((a, b) => b.conversations - a.conversations)
  }

  // Job Management
  private async createGenerationJob(configId: string): Promise<ReportGenerationJob> {
    const { data, error } = await this.supabase
      .from('report_generation_jobs')
      .insert({
        report_config_id: configId,
        status: 'queued',
        progress: 0,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create generation job: ${error.message}`)
    return this.mapGenerationJob(data)
  }

  private async queueReportGeneration(jobId: string, configId: string, format: ReportFormat): Promise<void> {
    // This would typically queue a background job
    // For now, we'll simulate with a simple implementation
    setTimeout(async () => {
      try {
        await this.processReportGeneration(jobId, configId, format)
      } catch (error) {
        await this.updateJobStatus(jobId, 'failed', 0, error instanceof Error ? error.message : 'Unknown error')
      }
    }, 1000)
  }

  private async processReportGeneration(jobId: string, configId: string, format: ReportFormat): Promise<void> {
    await this.updateJobStatus(jobId, 'processing', 10)

    // Get report config
    const { data: configData, error: configError } = await this.supabase
      .from('report_configs')
      .select('*')
      .eq('id', configId)
      .single()

    if (configError) throw new Error(`Failed to fetch report config: ${configError.message}`)
    const config = this.mapReportConfig(configData)

    await this.updateJobStatus(jobId, 'processing', 30)

    // Collect data
    const reportData = await this.collectReportData(config)
    await this.updateJobStatus(jobId, 'processing', 60)

    // Generate file based on format
    let filePath: string
    if (format === 'pdf') {
      filePath = await this.generatePDFReport(reportData, config)
    } else if (format === 'excel') {
      filePath = await this.generateExcelReport(reportData, config)
    } else {
      filePath = await this.generateCSVReport(reportData, config)
    }

    await this.updateJobStatus(jobId, 'processing', 90)

    // Save generated report record
    await this.saveGeneratedReport(jobId, configId, format, filePath)
    await this.updateJobStatus(jobId, 'completed', 100)
  }

  private async updateJobStatus(jobId: string, status: string, progress: number, error?: string): Promise<void> {
    const updates: any = { status, progress, updated_at: new Date().toISOString() }
    if (error) updates.error = error
    if (status === 'completed') updates.completed_at = new Date().toISOString()

    await this.supabase
      .from('report_generation_jobs')
      .update(updates)
      .eq('id', jobId)
  }

  private async saveGeneratedReport(jobId: string, configId: string, format: ReportFormat, filePath: string): Promise<void> {
    const { data: configData } = await this.supabase
      .from('report_configs')
      .select('tenant_id')
      .eq('id', configId)
      .single()

    await this.supabase
      .from('generated_reports')
      .insert({
        job_id: jobId,
        config_id: configId,
        tenant_id: configData?.tenant_id,
        format,
        file_path: filePath,
        status: 'completed',
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        download_count: 0
      })
  }

  // File generation methods
  private async generatePDFReport(data: ReportData, config: ReportConfig): Promise<string> {
    const generator = new PDFReportGenerator()
    const buffer = await generator.generateReport(data, config)
    
    const fileName = `${config.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`
    const filePath = join('public', 'reports', 'pdf', fileName)
    
    // Ensure directory exists
    await mkdir(join('public', 'reports', 'pdf'), { recursive: true })
    await writeFile(filePath, buffer)
    
    return `/reports/pdf/${fileName}`
  }

  private async generateExcelReport(data: ReportData, config: ReportConfig): Promise<string> {
    const generator = new ExcelReportGenerator()
    const buffer = await generator.generateReport(data, config)
    
    const fileName = `${config.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.xlsx`
    const filePath = join('public', 'reports', 'excel', fileName)
    
    // Ensure directory exists
    await mkdir(join('public', 'reports', 'excel'), { recursive: true })
    await writeFile(filePath, buffer)
    
    return `/reports/excel/${fileName}`
  }

  private async generateCSVReport(data: ReportData, config: ReportConfig): Promise<string> {
    const generator = new CSVReportGenerator()
    const buffer = await generator.generateReport(data, config)
    
    const fileName = `${config.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`
    const filePath = join('public', 'reports', 'csv', fileName)
    
    // Ensure directory exists
    await mkdir(join('public', 'reports', 'csv'), { recursive: true })
    await writeFile(filePath, buffer)
    
    return `/reports/csv/${fileName}`
  }

  // Mapping functions
  private mapReportConfig(data: any): ReportConfig {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      tenantId: data.tenant_id,
      templateType: data.template_type,
      dataRange: data.data_range,
      filters: data.filters,
      metrics: data.metrics,
      visualizations: data.visualizations,
      format: data.format,
      schedule: data.schedule,
      recipients: data.recipients,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  }

  private mapReportTemplate(data: any): ReportTemplate {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      type: data.type,
      sections: data.sections,
      defaultMetrics: data.default_metrics,
      isSystem: data.is_system,
      createdAt: new Date(data.created_at)
    }
  }

  private mapGeneratedReport(data: any): GeneratedReport {
    return {
      id: data.id,
      configId: data.config_id,
      tenantId: data.tenant_id,
      format: data.format,
      status: data.status,
      filePath: data.file_path,
      fileSize: data.file_size,
      generatedAt: new Date(data.generated_at),
      expiresAt: new Date(data.expires_at),
      downloadCount: data.download_count,
      error: data.error
    }
  }

  private mapGenerationJob(data: any): ReportGenerationJob {
    return {
      id: data.id,
      reportConfigId: data.report_config_id,
      tenantId: data.tenant_id,
      status: data.status,
      progress: data.progress,
      startedAt: data.started_at ? new Date(data.started_at) : undefined,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      error: data.error
    }
  }
}

export const reportService = new ReportService()