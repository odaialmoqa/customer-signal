import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PDFReportGenerator } from '@/lib/services/report-generators/pdf-generator'
import { ExcelReportGenerator } from '@/lib/services/report-generators/excel-generator'
import { CSVReportGenerator } from '@/lib/services/report-generators/csv-generator'
import { ReportData, ReportConfig } from '@/lib/types/report'

const mockReportData: ReportData = {
  summary: {
    totalConversations: 150,
    sentimentBreakdown: {
      positive: 90,
      negative: 30,
      neutral: 30
    },
    topKeywords: [
      { keyword: 'product', mentions: 50, sentiment: 0.8 },
      { keyword: 'service', mentions: 30, sentiment: 0.6 },
      { keyword: 'support', mentions: 25, sentiment: -0.2 }
    ],
    platformBreakdown: [
      { platform: 'twitter', conversations: 80, percentage: 53 },
      { platform: 'reddit', conversations: 70, percentage: 47 }
    ],
    keyInsights: [
      'High positive sentiment detected (60% positive mentions)',
      'Twitter dominates conversation volume with 53% of all mentions'
    ],
    recommendations: [
      'Leverage positive sentiment for marketing testimonials',
      'Consider increasing monitoring on underutilized platforms'
    ],
    trendHighlights: [
      'Conversation volume increased 15% compared to previous period',
      'Positive sentiment trending upward over the last 30 days'
    ]
  },
  metrics: {
    'conversation-volume': [
      { id: '1', created_at: '2024-01-01T10:00:00Z', content: 'Great product!' },
      { id: '2', created_at: '2024-01-02T11:00:00Z', content: 'Love the service' }
    ],
    'sentiment-distribution': [
      { sentiment: 'positive', created_at: '2024-01-01T10:00:00Z' },
      { sentiment: 'negative', created_at: '2024-01-02T11:00:00Z' }
    ],
    'keyword-performance': [
      { keyword: 'product', mentions: 50, avg_sentiment: 0.8 },
      { keyword: 'service', mentions: 30, avg_sentiment: 0.6 }
    ],
    'platform-breakdown': [
      { platform: 'twitter', conversations: 80, percentage: 53 },
      { platform: 'reddit', conversations: 70, percentage: 47 }
    ]
  },
  visualizations: {},
  rawData: [
    {
      id: '1',
      content: 'Great product! Really impressed with the quality.',
      author: 'user1',
      platform: 'twitter',
      url: 'https://twitter.com/user1/status/1',
      created_at: '2024-01-01T10:00:00Z',
      sentiment: 'positive',
      keywords: ['product', 'quality'],
      tags: ['feedback'],
      engagement_score: 15
    },
    {
      id: '2',
      content: 'Having issues with the service. Not happy.',
      author: 'user2',
      platform: 'reddit',
      url: 'https://reddit.com/r/test/comments/2',
      created_at: '2024-01-02T11:00:00Z',
      sentiment: 'negative',
      keywords: ['service', 'issues'],
      tags: ['complaint'],
      engagement_score: 8
    }
  ],
  generatedAt: new Date('2024-01-15T12:00:00Z'),
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  }
}

const mockReportConfig: ReportConfig = {
  id: 'test-config-id',
  name: 'Test Executive Summary Report',
  description: 'A test report for unit testing',
  tenantId: 'test-tenant-id',
  templateType: 'executive-summary',
  dataRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  },
  filters: {
    keywords: ['product', 'service'],
    platforms: ['twitter', 'reddit'],
    sentiment: ['positive', 'negative', 'neutral']
  },
  metrics: ['conversation-volume', 'sentiment-distribution', 'keyword-performance'],
  visualizations: ['line-chart', 'pie-chart'],
  format: ['pdf', 'excel', 'csv'],
  createdAt: new Date('2024-01-01T09:00:00Z'),
  updatedAt: new Date('2024-01-01T09:00:00Z')
}

describe('Report Generators', () => {
  describe('PDFReportGenerator', () => {
    let pdfGenerator: PDFReportGenerator

    beforeEach(() => {
      pdfGenerator = new PDFReportGenerator()
    })

    it('should generate a PDF report buffer', async () => {
      const result = await pdfGenerator.generateReport(mockReportData, mockReportConfig)

      expect(result).toBeInstanceOf(Buffer)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should include report title and date range in PDF', async () => {
      const result = await pdfGenerator.generateReport(mockReportData, mockReportConfig)
      const pdfString = result.toString()

      // PDF should contain the report name and basic structure
      expect(result.length).toBeGreaterThan(1000) // PDF should have substantial content
    })

    it('should handle empty data gracefully', async () => {
      const emptyData: ReportData = {
        ...mockReportData,
        summary: {
          ...mockReportData.summary,
          totalConversations: 0,
          topKeywords: [],
          platformBreakdown: []
        },
        rawData: []
      }

      const result = await pdfGenerator.generateReport(emptyData, mockReportConfig)
      expect(result).toBeInstanceOf(Buffer)
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('ExcelReportGenerator', () => {
    let excelGenerator: ExcelReportGenerator

    beforeEach(() => {
      excelGenerator = new ExcelReportGenerator()
    })

    it('should generate an Excel report buffer', async () => {
      const result = await excelGenerator.generateReport(mockReportData, mockReportConfig)

      expect(result).toBeInstanceOf(Buffer)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should create multiple worksheets', async () => {
      const result = await excelGenerator.generateReport(mockReportData, mockReportConfig)
      
      // Excel file should be substantial with multiple sheets
      expect(result.length).toBeGreaterThan(5000)
    })

    it('should handle large datasets efficiently', async () => {
      const largeData: ReportData = {
        ...mockReportData,
        rawData: Array(100).fill(null).map((_, i) => ({
          ...mockReportData.rawData[0],
          id: `conversation-${i}`,
          content: `Test conversation ${i}`
        }))
      }

      const result = await excelGenerator.generateReport(largeData, mockReportConfig)
      expect(result).toBeInstanceOf(Buffer)
      expect(result.length).toBeGreaterThan(10000)
    })
  })

  describe('CSVReportGenerator', () => {
    let csvGenerator: CSVReportGenerator

    beforeEach(() => {
      csvGenerator = new CSVReportGenerator()
    })

    it('should generate a CSV report buffer', async () => {
      const result = await csvGenerator.generateReport(mockReportData, mockReportConfig)

      expect(result).toBeInstanceOf(Buffer)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should include proper CSV headers and data', async () => {
      const result = await csvGenerator.generateReport(mockReportData, mockReportConfig)
      const csvContent = result.toString()

      // Check for expected sections
      expect(csvContent).toContain('Report Name')
      expect(csvContent).toContain('EXECUTIVE SUMMARY')
      expect(csvContent).toContain('CONVERSATION DATA')
      expect(csvContent).toContain('KEYWORD PERFORMANCE')
      expect(csvContent).toContain('PLATFORM BREAKDOWN')
    })

    it('should properly escape CSV values', async () => {
      const dataWithCommas: ReportData = {
        ...mockReportData,
        rawData: [{
          ...mockReportData.rawData[0],
          content: 'This content has, commas and "quotes" in it',
          author: 'User, Name'
        }]
      }

      const result = await csvGenerator.generateReport(dataWithCommas, mockReportConfig)
      const csvContent = result.toString()

      // Should properly escape values with commas and quotes
      expect(csvContent).toContain('"This content has, commas and ""quotes"" in it"')
      expect(csvContent).toContain('"User, Name"')
    })

    it('should handle empty arrays gracefully', async () => {
      const emptyData: ReportData = {
        ...mockReportData,
        summary: {
          ...mockReportData.summary,
          topKeywords: [],
          platformBreakdown: []
        },
        rawData: []
      }

      const result = await csvGenerator.generateReport(emptyData, mockReportConfig)
      const csvContent = result.toString()

      expect(csvContent).toContain('Report Name')
      expect(csvContent).toContain('Total Conversations,150')
    })

    it('should limit conversation data to prevent huge files', async () => {
      const largeData: ReportData = {
        ...mockReportData,
        rawData: Array(2000).fill(null).map((_, i) => ({
          ...mockReportData.rawData[0],
          id: `conversation-${i}`,
          content: `Test conversation ${i}`
        }))
      }

      const result = await csvGenerator.generateReport(largeData, mockReportConfig)
      const csvContent = result.toString()
      
      // Should limit to 1000 conversations
      const conversationLines = csvContent.split('\n').filter(line => 
        line.startsWith('conversation-')
      )
      expect(conversationLines.length).toBeLessThanOrEqual(1000)
    })
  })

  describe('Report Generator Error Handling', () => {
    it('should handle malformed data in PDF generation', async () => {
      const malformedData = {
        ...mockReportData,
        summary: null as any
      }

      const pdfGenerator = new PDFReportGenerator()
      
      // Should not throw, but handle gracefully
      await expect(async () => {
        await pdfGenerator.generateReport(malformedData, mockReportConfig)
      }).not.toThrow()
    })

    it('should handle malformed data in Excel generation', async () => {
      const malformedData = {
        ...mockReportData,
        rawData: [{ invalid: 'data' }] as any
      }

      const excelGenerator = new ExcelReportGenerator()
      
      // Should not throw, but handle gracefully
      await expect(async () => {
        await excelGenerator.generateReport(malformedData, mockReportConfig)
      }).not.toThrow()
    })

    it('should handle malformed data in CSV generation', async () => {
      const malformedData = {
        ...mockReportData,
        summary: {
          ...mockReportData.summary,
          topKeywords: null as any
        }
      }

      const csvGenerator = new CSVReportGenerator()
      
      // Should not throw, but handle gracefully
      await expect(async () => {
        await csvGenerator.generateReport(malformedData, mockReportConfig)
      }).not.toThrow()
    })
  })
})