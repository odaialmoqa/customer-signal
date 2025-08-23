import { ReportConfig, GeneratedReport } from '@/lib/types/report'
import { createClient } from '@/lib/supabase/server'

export class EmailService {
  private supabase = createClient()

  async sendReportEmail(
    report: GeneratedReport, 
    config: ReportConfig, 
    recipients: string[]
  ): Promise<void> {
    const emailContent = this.generateEmailContent(report, config)
    
    // In a real implementation, this would use a service like SendGrid, AWS SES, or Supabase Edge Functions
    // For now, we'll simulate the email sending
    console.log('Sending report email to:', recipients)
    console.log('Email content:', emailContent)
    
    // Log the email send attempt
    await this.logEmailSend(report.id, recipients, 'sent')
  }

  async sendScheduledReportNotification(
    configId: string,
    reportId: string,
    recipients: string[]
  ): Promise<void> {
    const { data: config } = await this.supabase
      .from('report_configs')
      .select('*')
      .eq('id', configId)
      .single()

    const { data: report } = await this.supabase
      .from('generated_reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (config && report) {
      await this.sendReportEmail(
        this.mapGeneratedReport(report),
        this.mapReportConfig(config),
        recipients
      )
    }
  }

  async sendReportGenerationFailedEmail(
    configId: string,
    error: string,
    recipients: string[]
  ): Promise<void> {
    const { data: config } = await this.supabase
      .from('report_configs')
      .select('*')
      .eq('id', configId)
      .single()

    if (config) {
      const emailContent = this.generateFailureEmailContent(
        this.mapReportConfig(config),
        error
      )
      
      console.log('Sending failure notification to:', recipients)
      console.log('Email content:', emailContent)
      
      await this.logEmailSend(configId, recipients, 'failed')
    }
  }

  private generateEmailContent(report: GeneratedReport, config: ReportConfig): string {
    const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL}${report.filePath}`
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>CustomerSignal Report Ready</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { 
            display: inline-block; 
            background: #2563eb; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 10px 0;
        }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .report-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>CustomerSignal Report Ready</h1>
        </div>
        
        <div class="content">
            <h2>Your ${config.name} report is ready!</h2>
            
            <div class="report-details">
                <h3>Report Details:</h3>
                <ul>
                    <li><strong>Report Name:</strong> ${config.name}</li>
                    <li><strong>Format:</strong> ${report.format.toUpperCase()}</li>
                    <li><strong>Generated:</strong> ${report.generatedAt.toLocaleString()}</li>
                    <li><strong>File Size:</strong> ${this.formatFileSize(report.fileSize || 0)}</li>
                    <li><strong>Expires:</strong> ${report.expiresAt.toLocaleDateString()}</li>
                </ul>
            </div>
            
            <p>Your scheduled report has been generated and is ready for download.</p>
            
            <a href="${downloadUrl}" class="button">Download Report</a>
            
            <p><small>This link will expire on ${report.expiresAt.toLocaleDateString()}. Please download your report before then.</small></p>
            
            <p>If you have any questions or need assistance, please contact our support team.</p>
        </div>
        
        <div class="footer">
            <p>This email was sent by CustomerSignal. If you no longer wish to receive these reports, you can update your preferences in your account settings.</p>
        </div>
    </div>
</body>
</html>
    `.trim()
  }

  private generateFailureEmailContent(config: ReportConfig, error: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>CustomerSignal Report Generation Failed</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .error-box { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Report Generation Failed</h1>
        </div>
        
        <div class="content">
            <h2>Unable to generate ${config.name}</h2>
            
            <p>We encountered an issue while generating your scheduled report.</p>
            
            <div class="error-box">
                <h3>Error Details:</h3>
                <p><strong>Report:</strong> ${config.name}</p>
                <p><strong>Scheduled Time:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Error:</strong> ${error}</p>
            </div>
            
            <p>Our team has been notified and will investigate this issue. You can try generating the report manually from your dashboard, or contact support if the problem persists.</p>
            
            <p>We apologize for any inconvenience this may cause.</p>
        </div>
        
        <div class="footer">
            <p>This email was sent by CustomerSignal. If you need immediate assistance, please contact our support team.</p>
        </div>
    </div>
</body>
</html>
    `.trim()
  }

  private async logEmailSend(
    reportId: string, 
    recipients: string[], 
    status: 'sent' | 'failed'
  ): Promise<void> {
    await this.supabase
      .from('email_logs')
      .insert({
        report_id: reportId,
        recipients,
        status,
        sent_at: new Date().toISOString()
      })
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Mapping functions (duplicated from report service for independence)
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
}

export const emailService = new EmailService()