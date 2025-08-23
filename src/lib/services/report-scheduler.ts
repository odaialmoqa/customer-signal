import { createClient } from '@/lib/supabase/server'
import { ReportConfig, ReportSchedule } from '@/lib/types/report'
import { reportService } from './report'
import { emailService } from './email-service'
import { addDays, addWeeks, addMonths, format, isAfter, isBefore } from 'date-fns'

export class ReportScheduler {
  private supabase = createClient()

  async scheduleReport(config: ReportConfig): Promise<void> {
    if (!config.schedule || !config.schedule.isActive) {
      return
    }

    const nextRunTime = this.calculateNextRunTime(config.schedule)
    
    await this.supabase
      .from('scheduled_reports')
      .insert({
        report_config_id: config.id,
        tenant_id: config.tenantId,
        next_run_at: nextRunTime.toISOString(),
        schedule_config: config.schedule,
        is_active: true
      })
  }

  async updateSchedule(configId: string, schedule: ReportSchedule): Promise<void> {
    const nextRunTime = this.calculateNextRunTime(schedule)
    
    await this.supabase
      .from('scheduled_reports')
      .update({
        next_run_at: nextRunTime.toISOString(),
        schedule_config: schedule,
        is_active: schedule.isActive,
        updated_at: new Date().toISOString()
      })
      .eq('report_config_id', configId)
  }

  async removeSchedule(configId: string): Promise<void> {
    await this.supabase
      .from('scheduled_reports')
      .delete()
      .eq('report_config_id', configId)
  }

  async processPendingReports(): Promise<void> {
    const { data: pendingReports, error } = await this.supabase
      .from('scheduled_reports')
      .select(`
        *,
        report_configs (*)
      `)
      .eq('is_active', true)
      .lte('next_run_at', new Date().toISOString())

    if (error) {
      console.error('Failed to fetch pending reports:', error)
      return
    }

    for (const scheduledReport of pendingReports || []) {
      try {
        await this.processScheduledReport(scheduledReport)
      } catch (error) {
        console.error(`Failed to process scheduled report ${scheduledReport.id}:`, error)
        await this.handleScheduledReportError(scheduledReport, error)
      }
    }
  }

  private async processScheduledReport(scheduledReport: any): Promise<void> {
    const config = this.mapReportConfig(scheduledReport.report_configs)
    
    // Generate report for each format specified
    const formats = Array.isArray(config.format) ? config.format : [config.format]
    
    for (const format of formats) {
      try {
        // Generate the report
        const jobId = await reportService.generateReport(config.id, format)
        
        // Wait for report generation to complete (in a real system, this would be handled by a queue)
        await this.waitForReportCompletion(jobId)
        
        // Get the generated report
        const { data: generatedReport } = await this.supabase
          .from('generated_reports')
          .select('*')
          .eq('job_id', jobId)
          .single()

        if (generatedReport && config.recipients?.length) {
          // Send email notification
          await emailService.sendScheduledReportNotification(
            config.id,
            generatedReport.id,
            config.recipients
          )
        }
      } catch (error) {
        console.error(`Failed to generate ${format} report:`, error)
        
        if (config.recipients?.length) {
          await emailService.sendReportGenerationFailedEmail(
            config.id,
            error instanceof Error ? error.message : 'Unknown error',
            config.recipients
          )
        }
      }
    }

    // Update next run time
    const nextRunTime = this.calculateNextRunTime(scheduledReport.schedule_config)
    await this.supabase
      .from('scheduled_reports')
      .update({
        next_run_at: nextRunTime.toISOString(),
        last_run_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', scheduledReport.id)
  }

  private async waitForReportCompletion(jobId: string, maxWaitTime: number = 300000): Promise<void> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < maxWaitTime) {
      const job = await reportService.getReportStatus(jobId)
      
      if (job.status === 'completed') {
        return
      } else if (job.status === 'failed') {
        throw new Error(job.error || 'Report generation failed')
      }
      
      // Wait 5 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
    
    throw new Error('Report generation timed out')
  }

  private async handleScheduledReportError(scheduledReport: any, error: any): Promise<void> {
    // Log the error
    await this.supabase
      .from('scheduled_report_errors')
      .insert({
        scheduled_report_id: scheduledReport.id,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        occurred_at: new Date().toISOString()
      })

    // Update next run time even if there was an error
    const nextRunTime = this.calculateNextRunTime(scheduledReport.schedule_config)
    await this.supabase
      .from('scheduled_reports')
      .update({
        next_run_at: nextRunTime.toISOString(),
        last_error: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date().toISOString()
      })
      .eq('id', scheduledReport.id)
  }

  private calculateNextRunTime(schedule: ReportSchedule): Date {
    const now = new Date()
    const [hours, minutes] = schedule.time.split(':').map(Number)
    
    let nextRun = new Date()
    nextRun.setHours(hours, minutes, 0, 0)
    
    // If the time has already passed today, move to the next occurrence
    if (isBefore(nextRun, now)) {
      switch (schedule.frequency) {
        case 'daily':
          nextRun = addDays(nextRun, 1)
          break
        case 'weekly':
          nextRun = addWeeks(nextRun, 1)
          break
        case 'monthly':
          nextRun = addMonths(nextRun, 1)
          break
        case 'quarterly':
          nextRun = addMonths(nextRun, 3)
          break
      }
    }

    // Adjust for specific day requirements
    if (schedule.frequency === 'weekly' && schedule.dayOfWeek !== undefined) {
      const targetDay = schedule.dayOfWeek
      const currentDay = nextRun.getDay()
      const daysToAdd = (targetDay - currentDay + 7) % 7
      nextRun = addDays(nextRun, daysToAdd)
    }

    if (schedule.frequency === 'monthly' && schedule.dayOfMonth !== undefined) {
      nextRun.setDate(schedule.dayOfMonth)
      
      // If the day has already passed this month, move to next month
      if (isBefore(nextRun, now)) {
        nextRun = addMonths(nextRun, 1)
        nextRun.setDate(schedule.dayOfMonth)
      }
    }

    return nextRun
  }

  async getScheduledReports(tenantId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('scheduled_reports')
      .select(`
        *,
        report_configs (*)
      `)
      .eq('tenant_id', tenantId)
      .order('next_run_at')

    if (error) throw new Error(`Failed to fetch scheduled reports: ${error.message}`)
    return data || []
  }

  async getScheduleHistory(configId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('generated_reports')
      .select('*')
      .eq('config_id', configId)
      .order('generated_at', { ascending: false })
      .limit(50)

    if (error) throw new Error(`Failed to fetch schedule history: ${error.message}`)
    return data || []
  }

  // Mapping function
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
}

export const reportScheduler = new ReportScheduler()