import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { ReportService } from '@/lib/services/report'
import { reportScheduler } from '@/lib/services/report-scheduler'
import { emailService } from '@/lib/services/email-service'
import { ReportConfig } from '@/lib/types/report'

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

// Mock file system operations
vi.mock('fs/promises', () => ({
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  readFile: vi.fn(() => Buffer.from('mock file content'))
}))

// Mock report generators
vi.mock('@/lib/services/report-generators/pdf-generator', () => ({
  PDFReportGenerator: class {
    async generateReport() {
      return Buffer.from('mock pdf content')
    }
  }
}))

vi.mock('@/lib/services/report-generators/excel-generator', () => ({
  ExcelReportGenerator: class {
    async generateReport() {
      return Buffer.from('mock excel content')
    }
  }
}))

vi.mock('@/lib/services/report-generators/csv-generator', () => ({
  CSVReportGenerator: class {
    async generateReport() {
      return Buffer.from('mock csv content')
    }
  }
}))

describe('Report System Integration Tests', () => {
  let supabase: any
  let reportService: ReportService
  let testTenantId: string
  let testConfigId: string

  beforeEach(async () => {
    // Initialize test client
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    reportService = new ReportService()
    testTenantId = 'test-tenant-' + Date.now()
    
    // Create test tenant
    await supabase.from('tenants').insert({
      id: testTenantId,
      name: 'Test Tenant',
      subscription: 'pro'
    })
  })

  afterEach(async () => {
    // Cleanup test data
    if (testConfigId) {
      await supabase.from('report_configs').delete().eq('id', testConfigId)
    }
    await supabase.from('tenants').delete().eq('id', testTenantId)
  })

  describe('Report Configuration Management', () => {
    it('should create, read, update, and delete report configurations', async () => {
      // Create
      const configData = {
        name: 'Integration Test Report',
        description: 'Test report for integration testing',
        tenantId: testTenantId,
        templateType: 'executive-summary' as const,
        dataRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        filters: {
          keywords: ['test'],
          platforms: ['twitter']
        },
        metrics: ['conversation-volume' as const, 'sentiment-distribution' as const],
        visualizations: ['line-chart' as const],
        format: ['pdf' as const]
      }

      const createdConfig = await reportService.createReportConfig(configData)
      testConfigId = createdConfig.id

      expect(createdConfig).toBeDefined()
      expect(createdConfig.name).toBe(configData.name)
      expect(createdConfig.tenantId).toBe(testTenantId)

      // Read
      const configs = await reportService.getReportConfigs(testTenantId)
      expect(configs).toHaveLength(1)
      expect(configs[0].id).toBe(testConfigId)

      // Update
      const updatedConfig = await reportService.updateReportConfig(testConfigId, {
        name: 'Updated Test Report'
      })
      expect(updatedConfig.name).toBe('Updated Test Report')

      // Delete
      await reportService.deleteReportConfig(testConfigId)
      const configsAfterDelete = await reportService.getReportConfigs(testTenantId)
      expect(configsAfterDelete).toHaveLength(0)
      
      testConfigId = '' // Prevent cleanup attempt
    })

    it('should enforce tenant isolation', async () => {
      const otherTenantId = 'other-tenant-' + Date.now()
      
      // Create other tenant
      await supabase.from('tenants').insert({
        id: otherTenantId,
        name: 'Other Tenant',
        subscription: 'basic'
      })

      try {
        // Create config for first tenant
        const config1 = await reportService.createReportConfig({
          name: 'Tenant 1 Report',
          tenantId: testTenantId,
          templateType: 'executive-summary',
          dataRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-31')
          },
          filters: {},
          metrics: ['conversation-volume'],
          visualizations: ['line-chart'],
          format: ['pdf']
        })

        // Create config for second tenant
        const config2 = await reportService.createReportConfig({
          name: 'Tenant 2 Report',
          tenantId: otherTenantId,
          templateType: 'executive-summary',
          dataRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-31')
          },
          filters: {},
          metrics: ['conversation-volume'],
          visualizations: ['line-chart'],
          format: ['pdf']
        })

        // Each tenant should only see their own configs
        const tenant1Configs = await reportService.getReportConfigs(testTenantId)
        const tenant2Configs = await reportService.getReportConfigs(otherTenantId)

        expect(tenant1Configs).toHaveLength(1)
        expect(tenant1Configs[0].name).toBe('Tenant 1 Report')
        
        expect(tenant2Configs).toHaveLength(1)
        expect(tenant2Configs[0].name).toBe('Tenant 2 Report')

        // Cleanup
        await supabase.from('report_configs').delete().eq('id', config1.id)
        await supabase.from('report_configs').delete().eq('id', config2.id)
      } finally {
        await supabase.from('tenants').delete().eq('id', otherTenantId)
      }
    })
  })

  describe('Report Generation', () => {
    beforeEach(async () => {
      // Create test conversations for report generation
      await supabase.from('conversations').insert([
        {
          id: 'conv-1',
          tenant_id: testTenantId,
          content: 'Great product! Love it.',
          author: 'user1',
          platform: 'twitter',
          sentiment: 'positive',
          keywords: ['product'],
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 'conv-2',
          tenant_id: testTenantId,
          content: 'Having issues with the service.',
          author: 'user2',
          platform: 'reddit',
          sentiment: 'negative',
          keywords: ['service'],
          created_at: '2024-01-16T11:00:00Z'
        }
      ])
    })

    afterEach(async () => {
      await supabase.from('conversations').delete().eq('tenant_id', testTenantId)
    })

    it('should generate reports in different formats', async () => {
      // Create report config
      const config = await reportService.createReportConfig({
        name: 'Multi-format Test Report',
        tenantId: testTenantId,
        templateType: 'executive-summary',
        dataRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        filters: {},
        metrics: ['conversation-volume', 'sentiment-distribution'],
        visualizations: ['line-chart'],
        format: ['pdf', 'excel', 'csv']
      })
      testConfigId = config.id

      // Test PDF generation
      const pdfJobId = await reportService.generateReport(config.id, 'pdf')
      expect(pdfJobId).toBeDefined()

      // Test Excel generation
      const excelJobId = await reportService.generateReport(config.id, 'excel')
      expect(excelJobId).toBeDefined()

      // Test CSV generation
      const csvJobId = await reportService.generateReport(config.id, 'csv')
      expect(csvJobId).toBeDefined()

      // Wait a bit for processing (in real implementation, would use proper job queue)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Check job statuses
      const pdfStatus = await reportService.getReportStatus(pdfJobId)
      const excelStatus = await reportService.getReportStatus(excelJobId)
      const csvStatus = await reportService.getReportStatus(csvJobId)

      expect(['queued', 'processing', 'completed']).toContain(pdfStatus.status)
      expect(['queued', 'processing', 'completed']).toContain(excelStatus.status)
      expect(['queued', 'processing', 'completed']).toContain(csvStatus.status)
    })

    it('should collect and process report data correctly', async () => {
      const config: ReportConfig = {
        id: 'test-config',
        name: 'Data Collection Test',
        tenantId: testTenantId,
        templateType: 'executive-summary',
        dataRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        filters: {
          keywords: ['product', 'service']
        },
        metrics: ['conversation-volume', 'sentiment-distribution'],
        visualizations: ['line-chart'],
        format: ['pdf'],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const reportData = await reportService.collectReportData(config)

      expect(reportData).toBeDefined()
      expect(reportData.summary).toBeDefined()
      expect(reportData.summary.totalConversations).toBeGreaterThanOrEqual(0)
      expect(reportData.summary.sentimentBreakdown).toBeDefined()
      expect(reportData.metrics).toBeDefined()
      expect(reportData.rawData).toBeDefined()
    })
  })

  describe('Report Templates', () => {
    it('should fetch system report templates', async () => {
      const templates = await reportService.getReportTemplates()

      expect(templates).toBeDefined()
      expect(Array.isArray(templates)).toBe(true)
      expect(templates.length).toBeGreaterThan(0)

      // Should include system templates
      const executiveSummary = templates.find(t => t.type === 'executive-summary')
      expect(executiveSummary).toBeDefined()
      expect(executiveSummary?.isSystem).toBe(true)
    })

    it('should create custom templates', async () => {
      const customTemplate = {
        name: 'Custom Integration Test Template',
        description: 'A custom template for testing',
        type: 'custom' as const,
        sections: [
          { id: 'summary', title: 'Summary', type: 'summary', order: 1 }
        ],
        defaultMetrics: ['conversation-volume' as const],
        isSystem: false
      }

      const created = await reportService.createCustomTemplate(customTemplate)

      expect(created).toBeDefined()
      expect(created.name).toBe(customTemplate.name)
      expect(created.isSystem).toBe(false)

      // Cleanup
      await supabase.from('report_templates').delete().eq('id', created.id)
    })
  })

  describe('Report Scheduling', () => {
    it('should schedule and manage report generation', async () => {
      // Create report config with schedule
      const config = await reportService.createReportConfig({
        name: 'Scheduled Test Report',
        tenantId: testTenantId,
        templateType: 'executive-summary',
        dataRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        filters: {},
        metrics: ['conversation-volume'],
        visualizations: ['line-chart'],
        format: ['pdf'],
        schedule: {
          frequency: 'daily',
          time: '09:00',
          timezone: 'UTC',
          isActive: true
        },
        recipients: ['test@example.com']
      })
      testConfigId = config.id

      // Schedule the report
      await reportScheduler.scheduleReport(config)

      // Get scheduled reports
      const scheduledReports = await reportScheduler.getScheduledReports(testTenantId)
      expect(scheduledReports.length).toBeGreaterThan(0)

      const scheduledReport = scheduledReports.find(sr => 
        sr.report_config_id === config.id
      )
      expect(scheduledReport).toBeDefined()
      expect(scheduledReport.is_active).toBe(true)

      // Update schedule
      await reportScheduler.updateSchedule(config.id, {
        frequency: 'weekly',
        time: '10:00',
        timezone: 'UTC',
        isActive: false
      })

      // Remove schedule
      await reportScheduler.removeSchedule(config.id)

      const scheduledReportsAfterRemoval = await reportScheduler.getScheduledReports(testTenantId)
      const removedReport = scheduledReportsAfterRemoval.find(sr => 
        sr.report_config_id === config.id
      )
      expect(removedReport).toBeUndefined()
    })
  })

  describe('Email Notifications', () => {
    it('should handle email sending for report notifications', async () => {
      const mockReport = {
        id: 'test-report-id',
        configId: 'test-config-id',
        tenantId: testTenantId,
        format: 'pdf' as const,
        status: 'completed' as const,
        filePath: '/reports/pdf/test.pdf',
        fileSize: 1024,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        downloadCount: 0
      }

      const mockConfig = {
        id: 'test-config-id',
        name: 'Email Test Report',
        tenantId: testTenantId,
        templateType: 'executive-summary' as const,
        dataRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        filters: {},
        metrics: ['conversation-volume' as const],
        visualizations: ['line-chart' as const],
        format: ['pdf' as const],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Mock console.log to capture email sending
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await emailService.sendReportEmail(
        mockReport,
        mockConfig,
        ['test@example.com']
      )

      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending report email to:',
        ['test@example.com']
      )

      consoleSpy.mockRestore()
    })

    it('should handle email sending failures gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await emailService.sendReportGenerationFailedEmail(
        'test-config-id',
        'Test error message',
        ['test@example.com']
      )

      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending failure notification to:',
        ['test@example.com']
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Try to create config with invalid tenant ID
      await expect(reportService.createReportConfig({
        name: 'Invalid Tenant Report',
        tenantId: 'non-existent-tenant',
        templateType: 'executive-summary',
        dataRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        filters: {},
        metrics: ['conversation-volume'],
        visualizations: ['line-chart'],
        format: ['pdf']
      })).rejects.toThrow()
    })

    it('should handle report generation with no data', async () => {
      const config = await reportService.createReportConfig({
        name: 'No Data Report',
        tenantId: testTenantId,
        templateType: 'executive-summary',
        dataRange: {
          start: new Date('2025-01-01'), // Future date with no data
          end: new Date('2025-01-31')
        },
        filters: {},
        metrics: ['conversation-volume'],
        visualizations: ['line-chart'],
        format: ['pdf']
      })
      testConfigId = config.id

      const reportData = await reportService.collectReportData(config)
      
      expect(reportData).toBeDefined()
      expect(reportData.summary.totalConversations).toBe(0)
      expect(reportData.rawData).toHaveLength(0)
    })
  })
})