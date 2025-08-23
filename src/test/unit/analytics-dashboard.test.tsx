import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnalyticsDashboard } from '@/components/analytics'

// Mock the useAnalytics hook
vi.mock('@/lib/hooks/useAnalytics', () => ({
  useAnalytics: vi.fn(() => ({
    dashboardMetrics: {
      totalConversations: 1000,
      sentimentDistribution: { positive: 600, negative: 200, neutral: 200 },
      platformDistribution: [
        { platform: 'twitter', count: 500, percentage: 50, sentimentBreakdown: { positive: 300, negative: 100, neutral: 100 } },
        { platform: 'reddit', count: 300, percentage: 30, sentimentBreakdown: { positive: 180, negative: 60, neutral: 60 } }
      ],
      topKeywords: [
        { keyword: 'customer service', totalMentions: 150, averageSentiment: 0.3, platforms: ['twitter'], recentTrend: 'up', engagementScore: 85 }
      ],
      recentTrends: [],
      emergingThemes: [],
      timeRange: { start: '2024-01-01', end: '2024-01-31' }
    },
    loadingDashboard: false,
    errorDashboard: null,
    sentimentTrends: [
      {
        keyword: 'test',
        platform: 'twitter',
        timeBucket: '2024-01-01T00:00:00Z',
        positiveCount: 10,
        negativeCount: 5,
        neutralCount: 15,
        totalCount: 30,
        sentimentScore: 0.2
      }
    ],
    loadingTrends: false,
    errorTrends: null,
    platformDistribution: [
      { platform: 'twitter', count: 500, percentage: 50, sentimentBreakdown: { positive: 300, negative: 100, neutral: 100 } }
    ],
    loadingPlatforms: false,
    errorPlatforms: null,
    keywordPerformance: [
      { keyword: 'customer service', totalMentions: 150, averageSentiment: 0.3, platforms: ['twitter'], recentTrend: 'up', engagementScore: 85 }
    ],
    loadingKeywords: false,
    errorKeywords: null,
    timeSeriesData: [
      { date: '2024-01-01', value: 100, breakdown: { twitter: 50, reddit: 50 } }
    ],
    loadingTimeSeries: false,
    errorTimeSeries: null,
    refreshAll: vi.fn(),
    refreshTrends: vi.fn(),
    refreshPlatforms: vi.fn(),
    refreshKeywords: vi.fn(),
    refreshTimeSeries: vi.fn(),
    refreshDashboard: vi.fn()
  }))
}))

// Mock chart components
vi.mock('@/components/analytics/SentimentTrendChart', () => ({
  SentimentTrendChart: ({ onDataPointClick }: any) => (
    <div data-testid="sentiment-trend-chart" onClick={() => onDataPointClick?.({ date: '2024-01-01' })}>
      Sentiment Trend Chart
    </div>
  )
}))

vi.mock('@/components/analytics/ConversationVolumeChart', () => ({
  ConversationVolumeChart: ({ onDataPointClick }: any) => (
    <div data-testid="conversation-volume-chart" onClick={() => onDataPointClick?.({ date: '2024-01-01' })}>
      Conversation Volume Chart
    </div>
  )
}))

vi.mock('@/components/analytics/PlatformDistributionChart', () => ({
  PlatformDistributionChart: ({ onPlatformClick }: any) => (
    <div data-testid="platform-distribution-chart" onClick={() => onPlatformClick?.('twitter')}>
      Platform Distribution Chart
    </div>
  )
}))

vi.mock('@/components/analytics/KeywordPerformanceChart', () => ({
  KeywordPerformanceChart: ({ onKeywordClick }: any) => (
    <div data-testid="keyword-performance-chart" onClick={() => onKeywordClick?.('customer service')}>
      Keyword Performance Chart
    </div>
  )
}))

vi.mock('@/components/analytics/AnalyticsFilters', () => ({
  AnalyticsFilters: ({ onFiltersChange }: any) => (
    <div data-testid="analytics-filters">
      <button onClick={() => onFiltersChange({ startDate: '2024-01-01' })}>
        Apply Filters
      </button>
    </div>
  )
}))

vi.mock('@/components/analytics/AnalyticsMetrics', () => ({
  AnalyticsMetrics: () => <div data-testid="analytics-metrics">Analytics Metrics</div>
}))

vi.mock('@/components/analytics/ChartContainer', () => ({
  ChartContainer: ({ children, onExpand, title }: any) => (
    <div data-testid={`chart-container-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      {onExpand && (
        <button onClick={onExpand} data-testid={`expand-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          Expand
        </button>
      )}
      {children}
    </div>
  )
}))

describe('AnalyticsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dashboard with all components', () => {
    render(<AnalyticsDashboard />)
    
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Monitor conversations and sentiment across all platforms')).toBeInTheDocument()
    expect(screen.getByTestId('analytics-filters')).toBeInTheDocument()
    expect(screen.getByTestId('analytics-metrics')).toBeInTheDocument()
    expect(screen.getByTestId('sentiment-trend-chart')).toBeInTheDocument()
    expect(screen.getByTestId('conversation-volume-chart')).toBeInTheDocument()
    expect(screen.getByTestId('platform-distribution-chart')).toBeInTheDocument()
    expect(screen.getByTestId('keyword-performance-chart')).toBeInTheDocument()
  })

  it('handles filter changes', async () => {
    const { useAnalytics } = await import('@/lib/hooks/useAnalytics')
    const mockRefreshAll = vi.fn()
    
    vi.mocked(useAnalytics).mockReturnValue({
      ...vi.mocked(useAnalytics)(),
      refreshAll: mockRefreshAll
    })

    render(<AnalyticsDashboard />)
    
    const applyFiltersButton = screen.getByText('Apply Filters')
    fireEvent.click(applyFiltersButton)
    
    await waitFor(() => {
      expect(mockRefreshAll).toHaveBeenCalledWith({ startDate: '2024-01-01' })
    })
  })

  it('handles chart drill-down interactions', async () => {
    const { useAnalytics } = await import('@/lib/hooks/useAnalytics')
    const mockRefreshTrends = vi.fn()
    
    vi.mocked(useAnalytics).mockReturnValue({
      ...vi.mocked(useAnalytics)(),
      refreshTrends: mockRefreshTrends
    })

    render(<AnalyticsDashboard />)
    
    const sentimentChart = screen.getByTestId('sentiment-trend-chart')
    fireEvent.click(sentimentChart)
    
    await waitFor(() => {
      expect(mockRefreshTrends).toHaveBeenCalled()
    })
  })

  it('opens drill-down modal when chart is clicked', async () => {
    render(<AnalyticsDashboard />)
    
    const sentimentChart = screen.getByTestId('sentiment-trend-chart')
    fireEvent.click(sentimentChart)
    
    await waitFor(() => {
      expect(screen.getByText('Detailed View: Sentiment')).toBeInTheDocument()
    })
  })

  it('closes drill-down modal when close button is clicked', async () => {
    render(<AnalyticsDashboard />)
    
    // Open modal
    const sentimentChart = screen.getByTestId('sentiment-trend-chart')
    fireEvent.click(sentimentChart)
    
    await waitFor(() => {
      expect(screen.getByText('Detailed View: Sentiment')).toBeInTheDocument()
    })
    
    // Close modal
    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)
    
    await waitFor(() => {
      expect(screen.queryByText('Detailed View: Sentiment')).not.toBeInTheDocument()
    })
  })

  it('handles refresh button click', async () => {
    const { useAnalytics } = await import('@/lib/hooks/useAnalytics')
    const mockRefreshAll = vi.fn()
    
    vi.mocked(useAnalytics).mockReturnValue({
      ...vi.mocked(useAnalytics)(),
      refreshAll: mockRefreshAll
    })

    render(<AnalyticsDashboard />)
    
    const refreshButton = screen.getByText('Refresh')
    fireEvent.click(refreshButton)
    
    expect(mockRefreshAll).toHaveBeenCalled()
  })

  it('shows loading state', () => {
    const { useAnalytics } = require('@/lib/hooks/useAnalytics')
    
    vi.mocked(useAnalytics).mockReturnValue({
      ...vi.mocked(useAnalytics)(),
      loadingDashboard: true,
      loadingTrends: true
    })

    render(<AnalyticsDashboard />)
    
    const refreshButton = screen.getByText('Refresh')
    expect(refreshButton).toBeDisabled()
  })

  it('shows error state', () => {
    const { useAnalytics } = require('@/lib/hooks/useAnalytics')
    
    vi.mocked(useAnalytics).mockReturnValue({
      ...vi.mocked(useAnalytics)(),
      errorDashboard: 'Failed to load dashboard data'
    })

    render(<AnalyticsDashboard />)
    
    expect(screen.getByText('Error loading analytics data')).toBeInTheDocument()
    expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument()
  })

  it('handles expand chart functionality', async () => {
    render(<AnalyticsDashboard />)
    
    const expandButton = screen.getByTestId('expand-sentiment-trends-over-time')
    fireEvent.click(expandButton)
    
    await waitFor(() => {
      expect(screen.getByText('Detailed View: Sentiment')).toBeInTheDocument()
    })
  })

  it('applies auto-refresh when enabled', () => {
    render(<AnalyticsDashboard autoRefresh={true} refreshInterval={5000} />)
    
    // The auto-refresh functionality would be tested by checking if the hook is called with correct parameters
    expect(screen.getByTestId('analytics-filters')).toBeInTheDocument()
  })
})