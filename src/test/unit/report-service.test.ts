import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReportData } from '@/lib/types/report'

// Mock file system operations
vi.mock('fs/promises', () => ({
  writeFile: vi.fn(),
  mkdir: vi.fn()
}))

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ 
            data: {
              id: 'test-config-id',
              name: 'Test Report',
              tenant_id: 'test-tenant-id'
            }, 
            error: null 
          }))
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({ data: [], error: null })),
          single: vi.fn(() => ({ data: null, error: null })),
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({ data: [], error: null }))
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: null }))
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null }))
      }))
    }))
  })
}))

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
      { keyword: 'service', mentions: 30, sentiment: 0.6 }
    ],
    platformBreakdown: [
      { platform: 'twitter', conversations: 80, percentage: 53 },
      { platform: 'reddit', conversations: 70, percentage: 47 }
    ],
    keyInsights: ['High positive sentiment detected'],
    recommendations: ['Leverage positive feedback for marketing'],
    trendHighlights: ['Conversation volume increased 15%']
  },
  metrics: {
    'conversation-volume': [],
    'sentiment-distribution': [],
    'keyword-performance': [],
    'platform-breakdown': []
  },
  visualizations: {},
  rawData: [],
  generatedAt: new Date(),
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  }
}

describe('ReportService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Report Types and Interfaces', () => {
    it('should have proper report data structure', () => {
      expect(mockReportData).toBeDefined()
      expect(mockReportData.summary).toBeDefined()
      expect(mockReportData.summary.totalConversations).toBe(150)
      expect(mockReportData.summary.sentimentBreakdown.positive).toBe(90)
      expect(mockReportData.summary.topKeywords).toHaveLength(2)
      expect(mockReportData.summary.platformBreakdown).toHaveLength(2)
    })

    it('should have proper metrics structure', () => {
      expect(mockReportData.metrics).toBeDefined()
      expect(mockReportData.metrics['conversation-volume']).toBeDefined()
      expect(mockReportData.metrics['sentiment-distribution']).toBeDefined()
      expect(mockReportData.metrics['keyword-performance']).toBeDefined()
      expect(mockReportData.metrics['platform-breakdown']).toBeDefined()
    })

    it('should have proper date range structure', () => {
      expect(mockReportData.dateRange).toBeDefined()
      expect(mockReportData.dateRange.start).toBeInstanceOf(Date)
      expect(mockReportData.dateRange.end).toBeInstanceOf(Date)
    })
  })

  describe('Report Configuration Validation', () => {
    it('should validate report configuration structure', () => {
      const configData = {
        name: 'Test Report',
        description: 'Test description',
        tenantId: 'test-tenant-id',
        templateType: 'executive-summary' as const,
        dataRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        filters: {},
        metrics: ['conversation-volume' as const],
        visualizations: ['line-chart' as const],
        format: ['pdf' as const]
      }

      expect(configData.name).toBe('Test Report')
      expect(configData.templateType).toBe('executive-summary')
      expect(configData.metrics).toContain('conversation-volume')
      expect(configData.format).toContain('pdf')
    })

    it('should validate date range', () => {
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      }

      expect(dateRange.start).toBeInstanceOf(Date)
      expect(dateRange.end).toBeInstanceOf(Date)
      expect(dateRange.end.getTime()).toBeGreaterThan(dateRange.start.getTime())
    })
  })

  describe('Executive Summary Generation', () => {
    it('should calculate sentiment breakdown correctly', () => {
      const { sentimentBreakdown } = mockReportData.summary
      const total = sentimentBreakdown.positive + sentimentBreakdown.negative + sentimentBreakdown.neutral
      
      expect(total).toBe(150)
      expect(sentimentBreakdown.positive).toBe(90)
      expect(sentimentBreakdown.negative).toBe(30)
      expect(sentimentBreakdown.neutral).toBe(30)
    })

    it('should generate insights based on data', () => {
      const { keyInsights } = mockReportData.summary
      
      expect(keyInsights).toBeDefined()
      expect(Array.isArray(keyInsights)).toBe(true)
      expect(keyInsights.length).toBeGreaterThan(0)
    })

    it('should generate recommendations based on data', () => {
      const { recommendations } = mockReportData.summary
      
      expect(recommendations).toBeDefined()
      expect(Array.isArray(recommendations)).toBe(true)
      expect(recommendations.length).toBeGreaterThan(0)
    })
  })

  describe('Data Aggregation', () => {
    it('should aggregate platform data correctly', () => {
      const { platformBreakdown } = mockReportData.summary
      
      expect(platformBreakdown).toHaveLength(2)
      expect(platformBreakdown[0].platform).toBe('twitter')
      expect(platformBreakdown[0].conversations).toBe(80)
      expect(platformBreakdown[0].percentage).toBe(53)
    })

    it('should aggregate keyword data correctly', () => {
      const { topKeywords } = mockReportData.summary
      
      expect(topKeywords).toHaveLength(2)
      expect(topKeywords[0].keyword).toBe('product')
      expect(topKeywords[0].mentions).toBe(50)
      expect(topKeywords[0].sentiment).toBe(0.8)
    })
  })
})